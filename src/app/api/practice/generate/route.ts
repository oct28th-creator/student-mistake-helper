import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { qwen, QWEN_MODELS, isQwenConfigured } from '@/lib/qwen';
import { PRACTICE_GENERATION_PROMPT } from '@/lib/prompts/knowledge';
import { prisma } from '@/lib/db';
import { generateText } from 'ai';

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
    const { mistakeId, knowledgePoint, subject, practiceType = 'SIMILAR', questionCount = 5 } = body;

    // 获取参考错题
    let referenceMistakes;
    if (mistakeId) {
      const mistake = await prisma.mistake.findUnique({
        where: { id: mistakeId, userId: session.user.id },
      });
      if (!mistake) {
        return NextResponse.json({ error: '错题不存在' }, { status: 404 });
      }
      referenceMistakes = [mistake];
    } else if (knowledgePoint && subject) {
      referenceMistakes = await prisma.mistake.findMany({
        where: {
          userId: session.user.id,
          subject: subject,
          knowledgePoints: { contains: knowledgePoint },
          mastered: false,
        },
        take: 5,
        orderBy: { mistakeCount: 'desc' },
      });
    } else {
      // 综合复习：获取所有未掌握的错题
      referenceMistakes = await prisma.mistake.findMany({
        where: { userId: session.user.id, mastered: false },
        take: 10,
        orderBy: { mistakeCount: 'desc' },
      });
    }

    if (referenceMistakes.length === 0) {
      return NextResponse.json({ error: '没有可用的错题记录' }, { status: 400 });
    }

    // 构建 AI Prompt
    const mistakeDescriptions = referenceMistakes.map((m, i) => 
      `题目${i + 1}：\n内容：${m.content}\n题型：${m.questionType}\n知识点：${m.knowledgePoints}\n难度：${m.difficulty}`
    ).join('\n\n');

    const prompt = `${PRACTICE_GENERATION_PROMPT}

请根据以下错题生成 ${questionCount} 道举一反三的新题目：

${mistakeDescriptions}

要求：
1. 新题目与原题知识点相同，但内容不同
2. 难度相当或略简单
3. 适合学生年级水平
4. 每道题包含标准答案和详细解析`;

    const result = await generateText({
      model: qwen(QWEN_MODELS.GENERATION),
      messages: [
        { role: 'user', content: prompt },
      ],
      maxTokens: 4096,
    });

    // 解析结果
    let practiceData;
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        practiceData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析练习卷');
      }
    } catch {
      console.error('练习卷生成结果解析失败:', result.text);
      return NextResponse.json({ error: '生成练习卷失败' }, { status: 500 });
    }

    // 保存练习卷
    const practice = await prisma.practice.create({
      data: {
        userId: session.user.id,
        title: practiceData.title || `${SUBJECT_LABELS[subject] || '综合'}专项练习`,
        subject: subject || referenceMistakes[0].subject,
        practiceType: practiceType,
        questions: JSON.stringify(practiceData.questions),
        totalScore: practiceData.totalScore || practiceData.questions.length * 10,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      message: '练习卷生成成功',
      practice: {
        id: practice.id,
        title: practice.title,
        questionCount: practiceData.questions.length,
      },
    });
  } catch (error) {
    console.error('生成练习卷错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '生成失败' },
      { status: 500 }
    );
  }
}

const SUBJECT_LABELS: Record<string, string> = {
  CHINESE: '语文', MATH: '数学', ENGLISH: '英语',
  PHYSICS: '物理', CHEMISTRY: '化学', BIOLOGY: '生物',
  HISTORY: '历史', GEOGRAPHY: '地理', POLITICS: '政治', SCIENCE: '科学',
};
