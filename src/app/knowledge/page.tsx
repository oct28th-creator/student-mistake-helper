'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Upload,
  ClipboardList,
  FileQuestion,
  BarChart3,
  User,
  LogOut,
  Search,
  Filter,
  AlertTriangle,
  Loader2,
  TrendingUp,
} from 'lucide-react';

interface KnowledgePoint {
  id: string;
  name: string;
  subject: string;
  grade: string | null;
  description: string;
  tips: string | null;
  mistakeCount: number;
}

interface SubjectStat {
  subject: string;
  count: number;
}

const SUBJECTS = [
  { value: '', label: '全部学科' },
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

const SUBJECT_LABELS: Record<string, string> = {
  CHINESE: '语文', MATH: '数学', ENGLISH: '英语',
  PHYSICS: '物理', CHEMISTRY: '化学', BIOLOGY: '生物',
  HISTORY: '历史', GEOGRAPHY: '地理', POLITICS: '政治', SCIENCE: '科学',
};

const SUBJECT_COLORS: Record<string, string> = {
  CHINESE: 'bg-red-100 text-red-600',
  MATH: 'bg-blue-100 text-blue-600',
  ENGLISH: 'bg-green-100 text-green-600',
  PHYSICS: 'bg-purple-100 text-purple-600',
  CHEMISTRY: 'bg-orange-100 text-orange-600',
  BIOLOGY: 'bg-teal-100 text-teal-600',
  HISTORY: 'bg-amber-100 text-amber-600',
  GEOGRAPHY: 'bg-cyan-100 text-cyan-600',
  POLITICS: 'bg-pink-100 text-pink-600',
  SCIENCE: 'bg-indigo-100 text-indigo-600',
};

function KnowledgePageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedSubject, setSelectedSubject] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchKnowledgePoints();
    }
  }, [status, selectedSubject]);

  const fetchKnowledgePoints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSubject) params.append('subject', selectedSubject);
      if (searchQuery) params.append('q', searchQuery);

      const res = await fetch(`/api/knowledge?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setKnowledgePoints(data.knowledgePoints || []);
        setSubjectStats(data.subjectStats || []);
      }
    } catch (error) {
      console.error('获取知识点失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKnowledgePoints();
  };

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
            <Upload className="w-5 h-5" />上传作业
          </Link>
          <Link href="/mistakes" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100">
            <ClipboardList className="w-5 h-5" />错题本
          </Link>
          <Link href="/knowledge" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-600 font-medium">
            <FileQuestion className="w-5 h-5" />知识点
          </Link>
          <Link href="/practice" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100">
            <BookOpen className="w-5 h-5" />练习卷
          </Link>
          <Link href="/statistics" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100">
            <BarChart3 className="w-5 h-5" />统计分析
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
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">知识点归纳</h2>

          {/* 学科统计 */}
          {subjectStats.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                待巩固知识点分布
              </h3>
              <div className="flex flex-wrap gap-3">
                {subjectStats.map((stat) => (
                  <button
                    key={stat.subject}
                    onClick={() => setSelectedSubject(stat.subject)}
                    className={`
                      px-4 py-2 rounded-lg font-medium transition-all
                      ${selectedSubject === stat.subject
                        ? 'ring-2 ring-blue-500 ring-offset-2'
                        : ''
                      }
                      ${SUBJECT_COLORS[stat.subject] || 'bg-gray-100 text-gray-600'}
                    `}
                  >
                    {SUBJECT_LABELS[stat.subject]} ({stat.count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 搜索和筛选 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索知识点..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                搜索
              </button>
            </form>
          </div>

          {/* 知识点列表 */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : knowledgePoints.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <FileQuestion className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">暂无知识点记录</h3>
              <p className="text-gray-500">上传作业并批改后，系统会自动提取知识点</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {knowledgePoints.map((kp) => (
                <div
                  key={kp.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${SUBJECT_COLORS[kp.subject] || 'bg-gray-100 text-gray-600'}`}>
                        {SUBJECT_LABELS[kp.subject] || kp.subject}
                      </span>
                      {kp.mistakeCount > 3 && (
                        <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          高频易错
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      错误 {kp.mistakeCount} 次
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{kp.name}</h3>
                  <p className="text-gray-600 mb-3">{kp.description}</p>
                  
                  {kp.tips && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm text-yellow-800">
                        <strong>小提示：</strong>{kp.tips}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/mistakes?knowledgePoint=${encodeURIComponent(kp.name)}`}
                      className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      查看相关错题 →
                    </Link>
                    <Link
                      href={`/practice/generate?knowledgePoint=${encodeURIComponent(kp.name)}&subject=${kp.subject}`}
                      className="text-sm text-green-500 hover:text-green-600 ml-4"
                    >
                      生成专项练习 →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function KnowledgePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <KnowledgePageContent />
    </Suspense>
  );
}
