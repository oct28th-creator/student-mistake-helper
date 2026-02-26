import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// 获取知识点列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const query = searchParams.get('q');
    const sortBy = searchParams.get('sortBy') || 'mistakeCount';

    const where: Record<string, unknown> = {};

    if (subject) {
      where.subject = subject;
    }

    if (query) {
      where.name = { contains: query };
    }

    const knowledgePoints = await prisma.knowledgePoint.findMany({
      where,
      orderBy: sortBy === 'mistakeCount' 
        ? { mistakeCount: 'desc' }
        : { updatedAt: 'desc' },
      take: 50,
    });

    // 获取用户各学科的错题统计
    const subjectStats = await prisma.mistake.groupBy({
      by: ['subject'],
      where: { userId: session.user.id, mastered: false },
      _count: { id: true },
    });

    return NextResponse.json({
      knowledgePoints,
      subjectStats: subjectStats.map(s => ({
        subject: s.subject,
        count: s._count.id,
      })),
    });
  } catch (error) {
    console.error('获取知识点错误:', error);
    return NextResponse.json({ error: '获取知识点失败' }, { status: 500 });
  }
}
