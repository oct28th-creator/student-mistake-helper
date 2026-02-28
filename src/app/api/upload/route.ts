import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isOSSConfigured } from '@/lib/oss';
import crypto from 'crypto';

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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const date = new Date();
    const dir = `homework/${session.user.id}/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    const fileName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const key = `${dir}/${fileName}`;

    // 如果 OSS 已配置，上传到 OSS
    if (isOSSConfigured()) {
      const ossHost = `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com`;

      // 使用 PUT 方式服务端直接上传到 OSS
      const dateStr = new Date().toUTCString();
      const contentType = file.type;
      const stringToSign = `PUT\n\n${contentType}\n${dateStr}\n/${process.env.OSS_BUCKET}/${key}`;
      const signature = crypto
        .createHmac('sha1', process.env.OSS_ACCESS_KEY_SECRET!)
        .update(stringToSign)
        .digest('base64');

      const ossRes = await fetch(`${ossHost}/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Date': dateStr,
          'Authorization': `OSS ${process.env.OSS_ACCESS_KEY_ID}:${signature}`,
        },
        body: buffer,
      });

      if (!ossRes.ok) {
        const errText = await ossRes.text();
        console.error('OSS 上传失败:', ossRes.status, errText);
        throw new Error('OSS 上传失败');
      }

      const imageUrl = `${ossHost}/${key}`;
      return NextResponse.json({ imageUrl, key });
    }

    // OSS 未配置时，转为 base64 data URL
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({ imageUrl: dataUrl, key });
  } catch (error) {
    console.error('上传错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '上传失败,请稍后重试' },
      { status: 500 }
    );
  }
}
