import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// 获取练习卷列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { userId: session.user.id };
    if (status) where.status = status;

    const [practices, total] = await Promise.all([
      prisma.practice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.practice.count({ where }),
    ]);

    return NextResponse.json({
      practices: practices.map(p => ({
        ...p,
        questions: undefined,
        questionCount: JSON.parse(p.questions).length,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('获取练习卷列表错误:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
