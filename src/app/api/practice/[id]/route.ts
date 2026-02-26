import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// 获取练习卷详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const practice = await prisma.practice.findUnique({ where: { id } });

    if (!practice || practice.userId !== session.user.id) {
      return NextResponse.json({ error: '练习卷不存在' }, { status: 404 });
    }

    return NextResponse.json({
      practice: {
        ...practice,
        questions: JSON.parse(practice.questions),
      },
    });
  } catch (error) {
    console.error('获取练习卷详情错误:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// 提交练习卷答案
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { answers } = body; // { questionIndex: userAnswer }

    const practice = await prisma.practice.findUnique({ where: { id } });
    if (!practice || practice.userId !== session.user.id) {
      return NextResponse.json({ error: '练习卷不存在' }, { status: 404 });
    }

    const questions = JSON.parse(practice.questions);
    let totalScore = 0;
    const results = questions.map((q: { answer: string; score: number }, index: number) => {
      const userAnswer = answers[index] || '';
      const isCorrect = userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase();
      if (isCorrect) totalScore += q.score || 10;
      return { ...q, userAnswer, isCorrect };
    });

    // 更新练习卷
    await prisma.practice.update({
      where: { id },
      data: {
        questions: JSON.stringify(results),
        userScore: totalScore,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: '提交成功',
      score: totalScore,
      totalScore: practice.totalScore,
      results,
    });
  } catch (error) {
    console.error('提交答案错误:', error);
    return NextResponse.json({ error: '提交失败' }, { status: 500 });
  }
}
