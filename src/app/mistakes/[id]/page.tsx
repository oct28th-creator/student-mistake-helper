'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Upload,
  ClipboardList,
  FileQuestion,
  BarChart3,
  User,
  LogOut,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Lightbulb,
  BookMarked,
  Loader2,
  ThumbsUp,
} from 'lucide-react';

interface MistakeDetail {
  id: string;
  subject: string;
  questionType: string;
  content: string;
  studentAnswer: string;
  correctAnswer: string;
  explanation: string;
  knowledgePoints: string;
  difficulty: number;
  mistakeCount: number;
  mastered: boolean;
  createdAt: string;
  question?: {
    homework?: {
      id: string;
      title: string;
      imageUrl: string;
      createdAt: string;
    };
  };
}

const SUBJECT_LABELS: Record<string, string> = {
  CHINESE: '语文',
  MATH: '数学',
  ENGLISH: '英语',
  PHYSICS: '物理',
  CHEMISTRY: '化学',
  BIOLOGY: '生物',
  HISTORY: '历史',
  GEOGRAPHY: '地理',
  POLITICS: '政治',
  SCIENCE: '科学',
};

const TYPE_LABELS: Record<string, string> = {
  CHOICE: '选择题',
  FILL_BLANK: '填空题',
  SHORT_ANSWER: '简答题',
  CALCULATION: '计算题',
  PROOF: '证明题',
  ESSAY: '作文',
  OTHER: '其他',
};

export default function MistakeDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const mistakeId = params.id as string;

  const [mistake, setMistake] = useState<MistakeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && mistakeId) {
      fetchMistake();
    }
  }, [status, mistakeId]);

  const fetchMistake = async () => {
    try {
      const res = await fetch(`/api/mistakes/${mistakeId}`);
      if (res.ok) {
        const data = await res.json();
        setMistake(data.mistake);
      } else {
        router.push('/mistakes');
      }
    } catch (error) {
      console.error('获取错题详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMastered = async () => {
    if (!mistake) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/mistakes/${mistakeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mastered: !mistake.mastered }),
      });
      if (res.ok) {
        setMistake({ ...mistake, mastered: !mistake.mastered });
      }
    } catch (error) {
      console.error('更新失败:', error);
    } finally {
      setUpdating(false);
    }
  };

  if (status === 'loading' || loading) {
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

  if (!mistake) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">错题不存在</p>
      </div>
    );
  }

  const knowledgePoints = (() => {
    try {
      return JSON.parse(mistake.knowledgePoints);
    } catch {
      return [];
    }
  })();

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
          <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100">
            <Upload className="w-5 h-5" />
            上传作业
          </Link>
          <Link href="/mistakes" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-600 font-medium">
            <ClipboardList className="w-5 h-5" />
            错题本
          </Link>
          <Link href="/knowledge" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100">
            <FileQuestion className="w-5 h-5" />
            知识点
          </Link>
          <Link href="/practice" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100">
            <BookOpen className="w-5 h-5" />
            练习卷
          </Link>
          <Link href="/statistics" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100">
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
        <div className="max-w-3xl mx-auto">
          {/* 返回按钮 */}
          <Link
            href="/mistakes"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            返回错题本
          </Link>

          {/* 题目信息 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-600 text-sm font-medium rounded-full">
                  {SUBJECT_LABELS[mistake.subject] || mistake.subject}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                  {TYPE_LABELS[mistake.questionType] || mistake.questionType}
                </span>
                <span className="px-3 py-1 bg-orange-100 text-orange-600 text-sm rounded-full">
                  错误 {mistake.mistakeCount} 次
                </span>
              </div>
              <button
                onClick={toggleMastered}
                disabled={updating}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                  ${mistake.mastered
                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mistake.mastered ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    已掌握
                  </>
                ) : (
                  <>
                    <ThumbsUp className="w-4 h-4" />
                    标记已掌握
                  </>
                )}
              </button>
            </div>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">题目内容</h2>
            <div className="p-4 bg-gray-50 rounded-lg mb-6">
              <p className="text-gray-800 whitespace-pre-wrap">{mistake.content}</p>
            </div>

            {/* 答案对比 */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">你的答案</span>
                </div>
                <p className="text-gray-800">{mistake.studentAnswer || '(未作答)'}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">正确答案</span>
                </div>
                <p className="text-gray-800">{mistake.correctAnswer}</p>
              </div>
            </div>

            {/* 详细解析 */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-blue-600 mb-3">
                <Lightbulb className="w-5 h-5" />
                <span className="font-medium text-lg">详细解析</span>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-gray-800 whitespace-pre-wrap">{mistake.explanation}</p>
              </div>
            </div>

            {/* 知识点标签 */}
            {knowledgePoints.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-purple-600 mb-3">
                  <BookMarked className="w-5 h-5" />
                  <span className="font-medium">相关知识点</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {knowledgePoints.map((kp: string, index: number) => (
                    <Link
                      key={index}
                      href={`/knowledge?q=${encodeURIComponent(kp)}`}
                      className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm hover:bg-purple-200 transition-colors"
                    >
                      {kp}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-4">
            <Link
              href={`/practice/generate?mistakeId=${mistake.id}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <BookOpen className="w-5 h-5" />
              生成举一反三练习
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
