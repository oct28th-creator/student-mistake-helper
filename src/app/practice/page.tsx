'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, Upload, ClipboardList, FileQuestion, BarChart3,
  User, LogOut, Plus, FileText, CheckCircle, Clock, Loader2,
} from 'lucide-react';

interface Practice {
  id: string;
  title: string;
  subject: string;
  practiceType: string;
  questionCount: number;
  totalScore: number;
  userScore: number | null;
  status: string;
  createdAt: string;
}

const SUBJECT_LABELS: Record<string, string> = {
  CHINESE: '语文', MATH: '数学', ENGLISH: '英语',
  PHYSICS: '物理', CHEMISTRY: '化学', BIOLOGY: '生物',
  HISTORY: '历史', GEOGRAPHY: '地理', POLITICS: '政治', SCIENCE: '科学',
};

const TYPE_LABELS: Record<string, string> = {
  SIMILAR: '举一反三', REVIEW: '综合复习', TARGETED: '专项练习',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  PENDING: { label: '未开始', color: 'text-gray-500 bg-gray-100', icon: Clock },
  IN_PROGRESS: { label: '进行中', color: 'text-blue-500 bg-blue-100', icon: FileText },
  COMPLETED: { label: '已完成', color: 'text-green-500 bg-green-100', icon: CheckCircle },
};

export default function PracticePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') fetchPractices();
  }, [status]);

  const fetchPractices = async () => {
    try {
      const res = await fetch('/api/practice');
      if (res.ok) {
        const data = await res.json();
        setPractices(data.practices || []);
      }
    } catch (error) {
      console.error('获取练习卷失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-500" />错题小助手
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100"><Upload className="w-5 h-5" />上传作业</Link>
          <Link href="/mistakes" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100"><ClipboardList className="w-5 h-5" />错题本</Link>
          <Link href="/knowledge" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100"><FileQuestion className="w-5 h-5" />知识点</Link>
          <Link href="/practice" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-600 font-medium"><BookOpen className="w-5 h-5" />练习卷</Link>
          <Link href="/statistics" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100"><BarChart3 className="w-5 h-5" />统计分析</Link>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><User className="w-4 h-4 text-blue-600" /></div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{session?.user?.name || session?.user?.email}</p></div>
            <button className="p-2 text-gray-400 hover:text-gray-600"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">练习卷</h2>
            <Link href="/practice/generate" className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              <Plus className="w-5 h-5" />生成练习卷
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
          ) : practices.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4"><FileText className="w-8 h-8 text-gray-400" /></div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">暂无练习卷</h3>
              <p className="text-gray-500 mb-4">根据你的错题生成专项练习</p>
              <Link href="/practice/generate" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                <Plus className="w-4 h-4" />生成练习卷
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {practices.map((p) => {
                const statusConfig = STATUS_CONFIG[p.status] || STATUS_CONFIG.PENDING;
                const StatusIcon = statusConfig.icon;
                return (
                  <Link key={p.id} href={`/practice/${p.id}`} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded">{SUBJECT_LABELS[p.subject] || p.subject}</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded">{TYPE_LABELS[p.practiceType] || p.practiceType}</span>
                        <span className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3" />{statusConfig.label}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{p.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>共 {p.questionCount} 题</span>
                      <span>总分 {p.totalScore} 分</span>
                      {p.userScore !== null && <span className="text-green-600 font-medium">得分 {p.userScore} 分</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
