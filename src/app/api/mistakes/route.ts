import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// 获取错题列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const subject = searchParams.get('subject');
    const mastered = searchParams.get('mastered');
    const knowledgePoint = searchParams.get('knowledgePoint');

    const where: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (subject) {
      where.subject = subject;
    }

    if (mastered !== null && mastered !== undefined) {
      where.mastered = mastered === 'true';
    }

    if (knowledgePoint) {
      where.knowledgePoints = {
        contains: knowledgePoint,
      };
    }

    const [mistakes, total] = await Promise.all([
      prisma.mistake.findMany({
        where,
        orderBy: [
          { mastered: 'asc' },
          { mistakeCount: 'desc' },
          { lastMistakeAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.mistake.count({ where }),
    ]);

    return NextResponse.json({
      mistakes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取错题列表错误:', error);
    return NextResponse.json(
      { error: '获取错题列表失败' },
      { status: 500 }
    );
  }
}
