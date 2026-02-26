'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, Upload, ClipboardList, FileQuestion, BarChart3,
  User, LogOut, TrendingUp, Target, Award, AlertTriangle, Loader2,
} from 'lucide-react';

interface Statistics {
  overview: {
    totalMistakes: number;
    masteredMistakes: number;
    unmasteredMistakes: number;
    masteryRate: number;
    totalHomeworks: number;
    totalPractices: number;
  };
  subjectStats: Array<{ subject: string; count: number }>;
  typeStats: Array<{ type: string; count: number }>;
  topKnowledgePoints: Array<{ name: string; subject: string; mistakeCount: number }>;
  trendData: Array<{ date: string; mistakes: number; mastered: number }>;
  practiceScores: Array<{ title: string; score: number; totalScore: number; percent: number; date: string }>;
}

const SUBJECT_LABELS: Record<string, string> = {
  CHINESE: '语文', MATH: '数学', ENGLISH: '英语', PHYSICS: '物理',
  CHEMISTRY: '化学', BIOLOGY: '生物', HISTORY: '历史', GEOGRAPHY: '地理',
  POLITICS: '政治', SCIENCE: '科学',
};

const TYPE_LABELS: Record<string, string> = {
  CHOICE: '选择题', FILL_BLANK: '填空题', SHORT_ANSWER: '简答题',
  CALCULATION: '计算题', PROOF: '证明题', ESSAY: '作文', OTHER: '其他',
};

const SUBJECT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

export default function StatisticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') fetchStats();
  }, [status]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/statistics');
      if (res.ok) setStats(await res.json());
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
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
          <Link href="/practice" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100"><BookOpen className="w-5 h-5" />练习卷</Link>
          <Link href="/statistics" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-600 font-medium"><BarChart3 className="w-5 h-5" />统计分析</Link>
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
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">学习统计</h2>

          {!stats ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <p className="text-gray-500">暂无统计数据</p>
            </div>
          ) : (
            <>
              {/* 概览卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{stats.overview.unmasteredMistakes}</div>
                  <div className="text-sm text-gray-500">待巩固错题</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Target className="w-5 h-5 text-green-500" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{stats.overview.masteredMistakes}</div>
                  <div className="text-sm text-gray-500">已掌握</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{stats.overview.masteryRate}%</div>
                  <div className="text-sm text-gray-500">掌握率</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Award className="w-5 h-5 text-purple-500" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{stats.overview.totalPractices}</div>
                  <div className="text-sm text-gray-500">完成练习</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* 学科分布 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">学科错题分布</h3>
                  {stats.subjectStats.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">暂无数据</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.subjectStats.map((s, i) => {
                        const total = stats.subjectStats.reduce((sum, item) => sum + item.count, 0);
                        const percent = total > 0 ? (s.count / total) * 100 : 0;
                        return (
                          <div key={s.subject}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">{SUBJECT_LABELS[s.subject] || s.subject}</span>
                              <span className="text-gray-800 font-medium">{s.count} 题</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 题型分布 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">题型错题分布</h3>
                  {stats.typeStats.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">暂无数据</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.typeStats.map((t, i) => {
                        const total = stats.typeStats.reduce((sum, item) => sum + item.count, 0);
                        const percent = total > 0 ? (t.count / total) * 100 : 0;
                        return (
                          <div key={t.type}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">{TYPE_LABELS[t.type] || t.type}</span>
                              <span className="text-gray-800 font-medium">{t.count} 题</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: SUBJECT_COLORS[(i + 3) % SUBJECT_COLORS.length] }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 高频易错知识点 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">高频易错知识点 TOP 10</h3>
                {stats.topKnowledgePoints.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">暂无数据</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {stats.topKnowledgePoints.map((kp, i) => (
                      <Link
                        key={i}
                        href={`/knowledge?q=${encodeURIComponent(kp.name)}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="text-gray-800">{kp.name}</span>
                        </div>
                        <span className="text-sm text-gray-500">{kp.mistakeCount} 次</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* 近期练习成绩 */}
              {stats.practiceScores.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">近期练习成绩</h3>
                  <div className="space-y-3">
                    {stats.practiceScores.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-800">{p.title}</div>
                          <div className="text-sm text-gray-500">{p.date}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${p.percent >= 80 ? 'text-green-500' : p.percent >= 60 ? 'text-blue-500' : 'text-red-500'}`}>
                            {p.score}/{p.totalScore}
                          </div>
                          <div className="text-sm text-gray-500">{p.percent}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
