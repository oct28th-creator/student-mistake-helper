import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createHomeworkSchema = z.object({
  title: z.string().min(1, '请输入作业标题'),
  subject: z.enum([
    'CHINESE', 'MATH', 'ENGLISH', 'PHYSICS', 'CHEMISTRY',
    'BIOLOGY', 'HISTORY', 'GEOGRAPHY', 'POLITICS', 'SCIENCE'
  ]),
  imageUrl: z.string().url('请提供有效的图片URL'),
  imagePath: z.string().min(1, '请提供图片路径'),
});

// 获取作业列表
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
    const limit = parseInt(searchParams.get('limit') || '10');
    const subject = searchParams.get('subject');

    const where = {
      userId: session.user.id,
      ...(subject ? { subject: subject as never } : {}),
    };

    const [homeworks, total] = await Promise.all([
      prisma.homework.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          questions: {
            select: {
              id: true,
              questionNumber: true,
              isCorrect: true,
            },
          },
        },
      }),
      prisma.homework.count({ where }),
    ]);

    return NextResponse.json({
      homeworks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取作业列表错误:', error);
    return NextResponse.json(
      { error: '获取作业列表失败' },
      { status: 500 }
    );
  }
}

// 创建作业
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createHomeworkSchema.parse(body);

    const homework = await prisma.homework.create({
      data: {
        userId: session.user.id,
        title: validatedData.title,
        subject: validatedData.subject,
        imageUrl: validatedData.imageUrl,
        imagePath: validatedData.imagePath,
        ocrStatus: 'PENDING',
        correctionStatus: 'PENDING',
      },
    });

    return NextResponse.json(
      { message: '作业创建成功', homework },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('创建作业错误:', error);
    return NextResponse.json(
      { error: '创建作业失败' },
      { status: 500 }
    );
  }
}
