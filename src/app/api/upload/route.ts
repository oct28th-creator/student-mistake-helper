import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateUploadSignature, isOSSConfigured } from '@/lib/oss';

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

    // 检查 OSS 配置
    if (!isOSSConfigured()) {
      return NextResponse.json(
        { error: 'OSS 未配置,请联系管理员' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { fileName } = body;

    if (!fileName) {
      return NextResponse.json(
        { error: '请提供文件名' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'];
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: '不支持的文件类型,请上传图片文件' },
        { status: 400 }
      );
    }

    // 生成上传签名
    const signature = await generateUploadSignature(fileName, session.user.id);

    return NextResponse.json(signature);
  } catch (error) {
    console.error('生成上传签名错误:', error);
    return NextResponse.json(
      { error: '获取上传签名失败' },
      { status: 500 }
    );
  }
}
