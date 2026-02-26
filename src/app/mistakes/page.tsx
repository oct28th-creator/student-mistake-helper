'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

interface Mistake {
  id: string;
  subject: string;
  questionType: string;
  content: string;
  studentAnswer: string;
  correctAnswer: string;
  knowledgePoints: string;
  difficulty: number;
  mistakeCount: number;
  mastered: boolean;
  createdAt: string;
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

export default function MistakesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showMastered, setShowMastered] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchMistakes();
    }
  }, [status, selectedSubject, showMastered]);

  const fetchMistakes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSubject) params.append('subject', selectedSubject);
      if (!showMastered) params.append('mastered', 'false');

      const res = await fetch(`/api/mistakes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMistakes(data.mistakes || []);
      }
    } catch (error) {
      console.error('获取错题列表失败:', error);
    } finally {
      setLoading(false);
    }
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

  const filteredMistakes = mistakes.filter((m) =>
    m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Upload className="w-5 h-5" />
            上传作业
          </Link>
          <Link
            href="/mistakes"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-600 font-medium"
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
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">我的错题本</h2>
          
          {/* 搜索和筛选 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索题目内容..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex gap-4">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showMastered}
                    onChange={(e) => setShowMastered(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">显示已掌握</span>
                </label>
              </div>
            </div>
          </div>

          {/* 错题列表 */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : filteredMistakes.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <ClipboardList className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">暂无错题</h3>
              <p className="text-gray-500 mb-4">上传作业后，系统会自动识别并记录错题</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Upload className="w-4 h-4" />
                上传作业
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMistakes.map((mistake) => (
                <div
                  key={mistake.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded">
                        {SUBJECT_LABELS[mistake.subject] || mistake.subject}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        错误 {mistake.mistakeCount} 次
                      </span>
                      {mistake.mastered && (
                        <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          已掌握
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/mistakes/${mistake.id}`}
                      className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm"
                    >
                      查看详情
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                  
                  <p className="text-gray-800 mb-3 line-clamp-2">{mistake.content}</p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-red-500">
                      <XCircle className="w-4 h-4" />
                      <span>你的答案: {mistake.studentAnswer}</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-500">
                      <CheckCircle className="w-4 h-4" />
                      <span>正确答案: {mistake.correctAnswer}</span>
                    </div>
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
