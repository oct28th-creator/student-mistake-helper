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

    const contentType = request.headers.get('content-type') || '';

    // 模式一：OSS 直传 (获取签名)
    if (contentType.includes('application/json') && isOSSConfigured()) {
      const body = await request.json();
      const { fileName } = body;

      if (!fileName) {
        return NextResponse.json(
          { error: '请提供文件名' },
          { status: 400 }
        );
      }

      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'];
      const ext = fileName.split('.').pop()?.toLowerCase();
      if (!ext || !allowedExtensions.includes(ext)) {
        return NextResponse.json(
          { error: '不支持的文件类型,请上传图片文件' },
          { status: 400 }
        );
      }

      const signature = await generateUploadSignature(fileName, session.user.id);
      return NextResponse.json({ mode: 'oss', ...signature });
    }

    // 模式二：直接上传到服务器 (OSS 未配置时的回退方案)
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: '请选择要上传的文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '不支持的文件类型,请上传图片文件' },
        { status: 400 }
      );
    }

    // 限制文件大小 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: '文件大小不能超过 10MB' },
        { status: 400 }
      );
    }

    // 转为 base64 data URL
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      mode: 'local',
      imageUrl: dataUrl,
      key: `local/${session.user.id}/${Date.now()}-${file.name}`,
    });
  } catch (error) {
    console.error('上传错误:', error);
    return NextResponse.json(
      { error: '上传失败,请稍后重试' },
      { status: 500 }
    );
  }
}
