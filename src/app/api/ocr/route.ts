import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { qwen, QWEN_MODELS, isQwenConfigured } from '@/lib/qwen';
import { OCR_SYSTEM_PROMPT, buildOcrUserPrompt, OcrResult } from '@/lib/prompts/ocr';
import { prisma } from '@/lib/db';
import { generateText } from 'ai';
import crypto from 'crypto';

// Vercel Serverless 函数最大执行时间 (秒)
export const maxDuration = 60;

// 从 OSS 下载图片并转为 base64
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  // 如果已经是 data URL，直接返回
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  // 如果是 OSS 私有 bucket，需要生成签名 URL
  let fetchUrl = imageUrl;
  if (imageUrl.includes('.aliyuncs.com/') && process.env.OSS_ACCESS_KEY_ID) {
    fetchUrl = generateSignedOssUrl(imageUrl);
  }

  const res = await fetch(fetchUrl);
  if (!res.ok) {
    throw new Error(`下载图片失败: ${res.status} ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  return `data:${contentType};base64,${base64}`;
}

// 为 OSS 私有 bucket 生成签名访问 URL
function generateSignedOssUrl(imageUrl: string): string {
  const url = new URL(imageUrl);
  const bucket = process.env.OSS_BUCKET!;
  const objectKey = decodeURIComponent(url.pathname.slice(1)); // 去掉开头的 /
  const expires = Math.floor(Date.now() / 1000) + 3600; // 1小时过期

  const stringToSign = `GET\n\n\n${expires}\n/${bucket}/${objectKey}`;
  const signature = crypto
    .createHmac('sha1', process.env.OSS_ACCESS_KEY_SECRET!)
    .update(stringToSign)
    .digest('base64');

  const signedUrl = `${imageUrl}?OSSAccessKeyId=${encodeURIComponent(process.env.OSS_ACCESS_KEY_ID!)}&Expires=${expires}&Signature=${encodeURIComponent(signature)}`;
  return signedUrl;
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录状态
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 检查 AI 配置
    if (!isQwenConfigured()) {
      return NextResponse.json(
        { error: 'AI 服务未配置,请联系管理员' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { homeworkId, imageUrl } = body;

    if (!homeworkId || !imageUrl) {
      return NextResponse.json(
        { error: '请提供作业ID和图片URL' },
        { status: 400 }
      );
    }

    // 验证作业归属
    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId },
    });

    if (!homework || homework.userId !== session.user.id) {
      return NextResponse.json(
        { error: '作业不存在或无权访问' },
        { status: 404 }
      );
    }

    // 更新 OCR 状态为处理中
    await prisma.homework.update({
      where: { id: homeworkId },
      data: { ocrStatus: 'PROCESSING' },
    });

    try {
      // 下载图片并转为 base64（解决 OSS 私有 bucket 无法被 AI 模型直接访问的问题）
      const imageBase64 = await fetchImageAsBase64(imageUrl);

      // 调用通义千问 VL 模型进行 OCR
      const result = await generateText({
        model: qwen(QWEN_MODELS.OCR),
        messages: [
          {
            role: 'system',
            content: OCR_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: buildOcrUserPrompt() },
              { type: 'image', image: imageBase64 },
            ],
          },
        ],
        maxTokens: 4096,
      });

      // 解析 JSON 结果
      let ocrResult: OcrResult;
      try {
        // 尝试从响应中提取 JSON
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          ocrResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('无法从响应中提取 JSON');
        }
      } catch {
        console.error('OCR 结果解析失败:', result.text);
        throw new Error('OCR 结果格式错误');
      }

      // 更新作业记录
      await prisma.homework.update({
        where: { id: homeworkId },
        data: {
          ocrText: result.text,
          ocrResult: JSON.stringify(ocrResult),
          ocrStatus: 'COMPLETED',
          subject: ocrResult.subject as never,
        },
      });

      // 创建题目记录
      if (ocrResult.questions && ocrResult.questions.length > 0) {
        await prisma.question.createMany({
          data: ocrResult.questions.map((q) => ({
            homeworkId,
            questionNumber: q.questionNumber,
            questionType: q.questionType as never,
            content: q.content,
            options: q.options ? JSON.stringify(q.options) : null,
            studentAnswer: q.studentAnswer,
          })),
        });
      }

      return NextResponse.json({
        message: 'OCR 识别完成',
        result: ocrResult,
      });
    } catch (aiError) {
      // AI 调用失败,更新状态
      await prisma.homework.update({
        where: { id: homeworkId },
        data: { ocrStatus: 'FAILED' },
      });
      throw aiError;
    }
  } catch (error) {
    console.error('OCR 错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OCR 识别失败' },
      { status: 500 }
    );
  }
}
