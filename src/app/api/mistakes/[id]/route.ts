import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// 获取单个错题详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const mistake = await prisma.mistake.findUnique({
      where: { id },
      include: {
        question: {
          include: {
            homework: {
              select: {
                id: true,
                title: true,
                imageUrl: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!mistake || mistake.userId !== session.user.id) {
      return NextResponse.json(
        { error: '错题不存在或无权访问' },
        { status: 404 }
      );
    }

    return NextResponse.json({ mistake });
  } catch (error) {
    console.error('获取错题详情错误:', error);
    return NextResponse.json(
      { error: '获取错题详情失败' },
      { status: 500 }
    );
  }
}

// 更新错题 (标记已掌握等)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const mistake = await prisma.mistake.findUnique({
      where: { id },
    });

    if (!mistake || mistake.userId !== session.user.id) {
      return NextResponse.json(
        { error: '错题不存在或无权访问' },
        { status: 404 }
      );
    }

    const updated = await prisma.mistake.update({
      where: { id },
      data: {
        mastered: body.mastered ?? mistake.mastered,
      },
    });

    return NextResponse.json({ mistake: updated });
  } catch (error) {
    console.error('更新错题错误:', error);
    return NextResponse.json(
      { error: '更新错题失败' },
      { status: 500 }
    );
  }
}

// 删除错题
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const mistake = await prisma.mistake.findUnique({
      where: { id },
    });

    if (!mistake || mistake.userId !== session.user.id) {
      return NextResponse.json(
        { error: '错题不存在或无权访问' },
        { status: 404 }
      );
    }

    await prisma.mistake.delete({
      where: { id },
    });

    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除错题错误:', error);
    return NextResponse.json(
      { error: '删除错题失败' },
      { status: 500 }
    );
  }
}
