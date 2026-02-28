import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { qwen, QWEN_MODELS, isQwenConfigured } from '@/lib/qwen';
import { CORRECTION_SYSTEM_PROMPT, buildCorrectionUserPrompt, CorrectionResult } from '@/lib/prompts/correction';
import { prisma } from '@/lib/db';
import { generateText } from 'ai';

export const maxDuration = 60;

// 批改单个题目
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    if (!isQwenConfigured()) {
      return NextResponse.json({ error: 'AI 服务未配置' }, { status: 500 });
    }

    const body = await request.json();
    const { homeworkId, questionId } = body;

    if (!homeworkId && !questionId) {
      return NextResponse.json({ error: '请提供作业ID或题目ID' }, { status: 400 });
    }

    // 获取需要批改的题目
    let questions;
    if (questionId) {
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { homework: true },
      });
      if (!question || question.homework.userId !== session.user.id) {
        return NextResponse.json({ error: '题目不存在或无权访问' }, { status: 404 });
      }
      questions = [question];
    } else {
      questions = await prisma.question.findMany({
        where: {
          homeworkId,
          homework: { userId: session.user.id },
          isCorrect: null, // 只批改未批改的题目
        },
        include: { homework: true },
      });
    }

    if (questions.length === 0) {
      return NextResponse.json({ message: '没有需要批改的题目' });
    }

    // 更新作业批改状态
    if (homeworkId) {
      await prisma.homework.update({
        where: { id: homeworkId },
        data: { correctionStatus: 'PROCESSING' },
      });
    }

    const results = [];

    for (const question of questions) {
      try {
        // 调用 AI 批改
        const result = await generateText({
          model: qwen(QWEN_MODELS.CORRECTION),
          messages: [
            { role: 'system', content: CORRECTION_SYSTEM_PROMPT },
            {
              role: 'user',
              content: buildCorrectionUserPrompt(
                question.homework.subject,
                question.questionType,
                question.content,
                question.studentAnswer || ''
              ),
            },
          ],
          maxTokens: 2048,
        });

        // 解析结果
        let correctionResult: CorrectionResult;
        try {
          const jsonMatch = result.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            correctionResult = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('无法解析批改结果');
          }
        } catch {
          console.error('批改结果解析失败:', result.text);
          continue;
        }

        // 更新题目
        await prisma.question.update({
          where: { id: question.id },
          data: {
            isCorrect: correctionResult.isCorrect,
            correctAnswer: correctionResult.correctAnswer,
            explanation: correctionResult.explanation,
            knowledgePoints: JSON.stringify(correctionResult.knowledgePoints),
            difficulty: correctionResult.difficulty,
          },
        });

        // 如果答错，创建错题记录
        if (!correctionResult.isCorrect) {
          const existingMistake = await prisma.mistake.findUnique({
            where: { questionId: question.id },
          });

          if (existingMistake) {
            // 更新错误次数
            await prisma.mistake.update({
              where: { id: existingMistake.id },
              data: {
                mistakeCount: existingMistake.mistakeCount + 1,
                lastMistakeAt: new Date(),
                mastered: false,
              },
            });
          } else {
            // 创建新错题
            await prisma.mistake.create({
              data: {
                userId: session.user.id,
                questionId: question.id,
                subject: question.homework.subject,
                questionType: question.questionType,
                content: question.content,
                studentAnswer: question.studentAnswer || '',
                correctAnswer: correctionResult.correctAnswer,
                explanation: correctionResult.explanation,
                knowledgePoints: JSON.stringify(correctionResult.knowledgePoints),
                difficulty: correctionResult.difficulty,
              },
            });
          }

          // 更新知识点统计
          for (const kp of correctionResult.knowledgePoints) {
            await prisma.knowledgePoint.upsert({
              where: {
                name_subject: {
                  name: kp,
                  subject: question.homework.subject,
                },
              },
              update: {
                mistakeCount: { increment: 1 },
              },
              create: {
                name: kp,
                subject: question.homework.subject,
                description: `${kp}相关知识点`,
                mistakeCount: 1,
              },
            });
          }
        }

        results.push({
          questionId: question.id,
          isCorrect: correctionResult.isCorrect,
          correctAnswer: correctionResult.correctAnswer,
          explanation: correctionResult.explanation,
          encouragement: correctionResult.encouragement,
        });
      } catch (error) {
        console.error(`批改题目 ${question.id} 失败:`, error);
      }
    }

    // 更新作业批改状态
    if (homeworkId) {
      await prisma.homework.update({
        where: { id: homeworkId },
        data: { correctionStatus: 'COMPLETED' },
      });
    }

    return NextResponse.json({
      message: `批改完成，共 ${results.length} 道题`,
      results,
    });
  } catch (error) {
    console.error('批改错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '批改失败' },
      { status: 500 }
    );
  }
}
