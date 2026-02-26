'use client';

import { useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ArrowLeft, Loader2, Sparkles, CheckCircle } from 'lucide-react';

const SUBJECTS = [
  { value: 'MATH', label: '数学' },
  { value: 'CHINESE', label: '语文' },
  { value: 'ENGLISH', label: '英语' },
  { value: 'PHYSICS', label: '物理' },
  { value: 'CHEMISTRY', label: '化学' },
  { value: 'BIOLOGY', label: '生物' },
  { value: 'HISTORY', label: '历史' },
  { value: 'GEOGRAPHY', label: '地理' },
  { value: 'SCIENCE', label: '科学' },
];

const PRACTICE_TYPES = [
  { value: 'SIMILAR', label: '举一反三', desc: '基于错题生成相似题目' },
  { value: 'TARGETED', label: '专项练习', desc: '针对特定知识点强化训练' },
  { value: 'REVIEW', label: '综合复习', desc: '综合所有错题生成试卷' },
];

function GeneratePracticeForm() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [subject, setSubject] = useState(searchParams.get('subject') || 'MATH');
  const [practiceType, setPracticeType] = useState('SIMILAR');
  const [questionCount, setQuestionCount] = useState(5);
  const [knowledgePoint, setKnowledgePoint] = useState(searchParams.get('knowledgePoint') || '');
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');

    try {
      const res = await fetch('/api/practice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          practiceType,
          questionCount,
          knowledgePoint: knowledgePoint || undefined,
          mistakeId: searchParams.get('mistakeId') || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(true);
      setTimeout(() => router.push(`/practice/${data.practice.id}`), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">练习卷生成成功！</h2>
          <p className="text-gray-500">正在跳转...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/practice" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6">
          <ArrowLeft className="w-4 h-4" />返回练习卷列表
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">AI 智能组卷</h1>
              <p className="text-gray-500">根据你的错题自动生成练习</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* 练习类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">练习类型</label>
              <div className="grid gap-3">
                {PRACTICE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setPracticeType(type.value)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      practiceType === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-800">{type.label}</div>
                    <div className="text-sm text-gray-500">{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 学科 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">学科</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {/* 知识点 (可选) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">知识点 (可选)</label>
              <input
                type="text"
                value={knowledgePoint}
                onChange={(e) => setKnowledgePoint(e.target.value)}
                placeholder="如：二元一次方程、三角函数"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* 题目数量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">题目数量</label>
              <div className="flex gap-3">
                {[5, 10, 15, 20].map((num) => (
                  <button
                    key={num}
                    onClick={() => setQuestionCount(num)}
                    className={`flex-1 py-2 rounded-lg border-2 font-medium transition-all ${
                      questionCount === num
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {num} 题
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-colors ${
                generating ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {generating ? (
                <><Loader2 className="w-5 h-5 animate-spin" />AI 生成中...</>
              ) : (
                <><BookOpen className="w-5 h-5" />开始生成</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GeneratePracticePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <GeneratePracticeForm />
    </Suspense>
  );
}
