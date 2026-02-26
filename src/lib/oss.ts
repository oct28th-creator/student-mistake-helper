import OSS from 'ali-oss';
import crypto from 'crypto';

// 创建 OSS 客户端
export function createOSSClient() {
  return new OSS({
    region: process.env.OSS_REGION!,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
    bucket: process.env.OSS_BUCKET!,
  });
}

// 检查 OSS 是否配置
export function isOSSConfigured(): boolean {
  return !!(
    process.env.OSS_REGION &&
    process.env.OSS_ACCESS_KEY_ID &&
    process.env.OSS_ACCESS_KEY_SECRET &&
    process.env.OSS_BUCKET
  );
}

// 生成上传签名 (用于前端直传)
export interface UploadSignature {
  accessId: string;
  policy: string;
  signature: string;
  dir: string;
  host: string;
  expire: number;
  key: string;
}

export async function generateUploadSignature(
  fileName: string,
  userId: string
): Promise<UploadSignature> {
  const date = new Date();
  const dir = `homework/${userId}/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/`;
  
  // 生成唯一文件名
  const ext = fileName.split('.').pop() || 'jpg';
  const key = `${dir}${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  
  // 过期时间 (1小时后)
  const expiration = new Date(Date.now() + 3600 * 1000);
  const expire = Math.floor(expiration.getTime() / 1000);
  
  // Policy 条件
  const policyData = {
    expiration: expiration.toISOString(),
    conditions: [
      ['content-length-range', 0, 10 * 1024 * 1024], // 最大 10MB
      ['starts-with', '$key', dir],
    ],
  };
  
  const policyBase64 = Buffer.from(JSON.stringify(policyData)).toString('base64');
  
  // 使用 HMAC-SHA1 签名
  const signature = crypto
    .createHmac('sha1', process.env.OSS_ACCESS_KEY_SECRET!)
    .update(policyBase64)
    .digest('base64');
  
  const host = `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com`;
  
  return {
    accessId: process.env.OSS_ACCESS_KEY_ID!,
    policy: policyBase64,
    signature,
    dir,
    host,
    expire,
    key,
  };
}

// 生成带签名的访问 URL (用于私有 bucket)
export function generateSignedUrl(objectKey: string, expiresInSeconds = 3600): string {
  const client = createOSSClient();
  return client.signatureUrl(objectKey, {
    expires: expiresInSeconds,
  });
}

// 删除文件
export async function deleteFile(objectKey: string): Promise<void> {
  const client = createOSSClient();
  await client.delete(objectKey);
}
