'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Camera,
  BookOpen,
  ClipboardList,
  BarChart3,
  FileQuestion,
  Loader2,
  CheckCircle,
  AlertCircle,
  LogOut,
  User,
} from 'lucide-react';
import Link from 'next/link';

const SUBJECTS = [
  { value: 'CHINESE', label: '语文' },
  { value: 'MATH', label: '数学' },
  { value: 'ENGLISH', label: '英语' },
  { value: 'PHYSICS', label: '物理' },
  { value: 'CHEMISTRY', label: '化学' },
  { value: 'BIOLOGY', label: '生物' },
  { value: 'HISTORY', label: '历史' },
  { value: 'GEOGRAPHY', label: '地理' },
  { value: 'POLITICS', label: '政治' },
  { value: 'SCIENCE', label: '科学' },
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('MATH');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // 未登录时重定向到登录页
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadStatus('idle');
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title) {
      setMessage('请选择图片并输入作业标题');
      setUploadStatus('error');
      return;
    }

    setUploading(true);
    setUploadStatus('idle');

    try {
      // 1. 获取上传签名
      const signatureRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: selectedFile.name }),
      });

      if (!signatureRes.ok) {
        const error = await signatureRes.json();
        throw new Error(error.error || '获取上传签名失败');
      }

      const signature = await signatureRes.json();

      // 2. 直接上传到 OSS
      const formData = new FormData();
      formData.append('key', signature.key);
      formData.append('policy', signature.policy);
      formData.append('OSSAccessKeyId', signature.accessId);
      formData.append('signature', signature.signature);
      formData.append('file', selectedFile);

      const uploadRes = await fetch(signature.host, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('上传图片失败');
      }

      const imageUrl = `${signature.host}/${signature.key}`;

      // 3. 创建作业记录
      const homeworkRes = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subject,
          imageUrl,
          imagePath: signature.key,
        }),
      });

      if (!homeworkRes.ok) {
        const error = await homeworkRes.json();
        throw new Error(error.error || '创建作业失败');
      }

      const { homework } = await homeworkRes.json();

      // 4. 触发 OCR 识别
      fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeworkId: homework.id,
          imageUrl,
        }),
      });

      setUploadStatus('success');
      setMessage('上传成功！正在进行 OCR 识别...');
      
      // 重置表单
      setTimeout(() => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setTitle('');
        setUploadStatus('idle');
        setMessage('');
      }, 3000);

    } catch (error) {
      console.error('上传错误:', error);
      setUploadStatus('error');
      setMessage(error instanceof Error ? error.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-500" />
            错题小助手
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-600 font-medium"
          >
            <Upload className="w-5 h-5" />
            上传作业
          </Link>
          <Link
            href="/mistakes"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ClipboardList className="w-5 h-5" />
            错题本
          </Link>
          <Link
            href="/knowledge"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <FileQuestion className="w-5 h-5" />
            知识点
          </Link>
          <Link
            href="/practice"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <BookOpen className="w-5 h-5" />
            练习卷
          </Link>
          <Link
            href="/statistics"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <BarChart3 className="w-5 h-5" />
            统计分析
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {session?.user?.name || session?.user?.email}
              </p>
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 p-6 md:p-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">上传作业</h2>
          
          {/* 上传区域 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${previewUrl 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {previewUrl ? (
                <div className="space-y-4">
                  <img
                    src={previewUrl}
                    alt="预览"
                    className="max-h-64 mx-auto rounded-lg shadow-sm"
                  />
                  <p className="text-sm text-gray-500">点击更换图片</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium">拍照或选择图片</p>
                    <p className="text-sm text-gray-500 mt-1">
                      支持 JPG、PNG、HEIC 格式，最大 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 作业信息 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                作业标题
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：数学第三章作业"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                学科
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
              >
                {SUBJECTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 状态消息 */}
            {message && (
              <div
                className={`flex items-center gap-2 p-4 rounded-lg ${
                  uploadStatus === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {uploadStatus === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span>{message}</span>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !title}
              className={`
                w-full py-3 px-4 rounded-lg font-medium text-white
                flex items-center justify-center gap-2
                transition-colors duration-200
                ${uploading || !selectedFile || !title
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
                }
              `}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  上传并识别
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
