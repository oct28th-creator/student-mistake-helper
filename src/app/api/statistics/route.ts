import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. 总体统计
    const [totalMistakes, masteredMistakes, totalHomeworks, totalPractices] = await Promise.all([
      prisma.mistake.count({ where: { userId } }),
      prisma.mistake.count({ where: { userId, mastered: true } }),
      prisma.homework.count({ where: { userId } }),
      prisma.practice.count({ where: { userId, status: 'COMPLETED' } }),
    ]);

    // 2. 按学科统计错题
    const subjectStats = await prisma.mistake.groupBy({
      by: ['subject'],
      where: { userId },
      _count: { id: true },
    });

    // 3. 按题型统计错题
    const typeStats = await prisma.mistake.groupBy({
      by: ['questionType'],
      where: { userId },
      _count: { id: true },
    });

    // 4. 高频错题知识点 (Top 10)
    const topKnowledgePoints = await prisma.knowledgePoint.findMany({
      where: { mistakeCount: { gt: 0 } },
      orderBy: { mistakeCount: 'desc' },
      take: 10,
      select: { name: true, subject: true, mistakeCount: true },
    });

    // 5. 近7天学习趋势
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMistakes = await prisma.mistake.findMany({
      where: { userId, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });

    const recentMastered = await prisma.mistake.findMany({
      where: { userId, mastered: true, lastMistakeAt: { gte: sevenDaysAgo } },
      select: { lastMistakeAt: true },
    });

    // 按天分组
    const dailyStats: Record<string, { mistakes: number; mastered: number }> = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      dailyStats[key] = { mistakes: 0, mastered: 0 };
    }

    recentMistakes.forEach((m) => {
      const key = m.createdAt.toISOString().split('T')[0];
      if (dailyStats[key]) dailyStats[key].mistakes++;
    });

    recentMastered.forEach((m) => {
      const key = m.lastMistakeAt.toISOString().split('T')[0];
      if (dailyStats[key]) dailyStats[key].mastered++;
    });

    const trendData = Object.entries(dailyStats)
      .map(([date, data]) => ({ date, ...data }))
      .reverse();

    // 6. 练习卷成绩
    const practiceScores = await prisma.practice.findMany({
      where: { userId, status: 'COMPLETED', userScore: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: { title: true, totalScore: true, userScore: true, completedAt: true },
    });

    return NextResponse.json({
      overview: {
        totalMistakes,
        masteredMistakes,
        unmasteredMistakes: totalMistakes - masteredMistakes,
        masteryRate: totalMistakes > 0 ? Math.round((masteredMistakes / totalMistakes) * 100) : 0,
        totalHomeworks,
        totalPractices,
      },
      subjectStats: subjectStats.map((s) => ({
        subject: s.subject,
        count: s._count.id,
      })),
      typeStats: typeStats.map((t) => ({
        type: t.questionType,
        count: t._count.id,
      })),
      topKnowledgePoints,
      trendData,
      practiceScores: practiceScores.map((p) => ({
        title: p.title,
        score: p.userScore,
        totalScore: p.totalScore,
        percent: Math.round(((p.userScore || 0) / p.totalScore) * 100),
        date: p.completedAt?.toISOString().split('T')[0],
      })),
    });
  } catch (error) {
    console.error('获取统计数据错误:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
