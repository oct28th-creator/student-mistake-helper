'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Loader2, Send, Trophy } from 'lucide-react';

interface Question {
  questionNumber: string;
  questionType: string;
  content: string;
  options?: string[];
  answer: string;
  explanation: string;
  score: number;
  userAnswer?: string;
  isCorrect?: boolean;
}

interface Practice {
  id: string;
  title: string;
  subject: string;
  practiceType: string;
  questions: Question[];
  totalScore: number;
  userScore: number | null;
  status: string;
}

export default function PracticeDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const practiceId = params.id as string;

  const [practice, setPractice] = useState<Practice | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && practiceId) fetchPractice();
  }, [status, practiceId]);

  const fetchPractice = async () => {
    try {
      const res = await fetch(`/api/practice/${practiceId}`);
      if (res.ok) {
        const data = await res.json();
        setPractice(data.practice);
        if (data.practice.status === 'COMPLETED') setSubmitted(true);
      } else {
        router.push('/practice');
      }
    } catch (error) {
      console.error('获取练习卷失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!practice) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/practice/${practiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (res.ok) {
        const data = await res.json();
        setPractice({
          ...practice,
          questions: data.results,
          userScore: data.score,
          status: 'COMPLETED',
        });
        setSubmitted(true);
      }
    } catch (error) {
      console.error('提交失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  if (!practice) {
    return <div className="min-h-screen flex items-center justify-center"><p>练习卷不存在</p></div>;
  }

  const scorePercent = practice.userScore !== null ? Math.round((practice.userScore / practice.totalScore) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/practice" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6">
          <ArrowLeft className="w-4 h-4" />返回练习卷列表
        </Link>

        {/* 标题和成绩 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-xl font-bold text-gray-800 mb-2">{practice.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>共 {practice.questions.length} 题</span>
            <span>总分 {practice.totalScore} 分</span>
          </div>
          
          {submitted && practice.userScore !== null && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white shadow flex items-center justify-center">
                  <Trophy className={`w-8 h-8 ${scorePercent >= 80 ? 'text-yellow-500' : scorePercent >= 60 ? 'text-blue-500' : 'text-gray-400'}`} />
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-800">{practice.userScore} <span className="text-lg font-normal text-gray-500">/ {practice.totalScore} 分</span></div>
                  <div className="text-sm text-gray-500">正确率 {scorePercent}%</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 题目列表 */}
        <div className="space-y-6">
          {practice.questions.map((q, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-600 text-sm font-medium rounded-full">
                  第 {index + 1} 题 ({q.score} 分)
                </span>
                {submitted && (
                  <span className={`flex items-center gap-1 text-sm ${q.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                    {q.isCorrect ? <><CheckCircle className="w-4 h-4" />正确</> : <><XCircle className="w-4 h-4" />错误</>}
                  </span>
                )}
              </div>

              <p className="text-gray-800 mb-4 whitespace-pre-wrap">{q.content}</p>

              {/* 选项或输入 */}
              {q.options && q.options.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {q.options.map((opt, optIndex) => (
                    <button
                      key={optIndex}
                      onClick={() => !submitted && setAnswers({ ...answers, [index]: opt.charAt(0) })}
                      disabled={submitted}
                      className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                        submitted
                          ? opt.charAt(0) === q.answer
                            ? 'border-green-500 bg-green-50'
                            : q.userAnswer === opt.charAt(0)
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-200'
                          : answers[index] === opt.charAt(0)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={submitted ? (q.userAnswer || '') : (answers[index] || '')}
                  onChange={(e) => !submitted && setAnswers({ ...answers, [index]: e.target.value })}
                  disabled={submitted}
                  placeholder="请输入答案"
                  className={`w-full px-4 py-3 rounded-lg border mb-4 ${
                    submitted
                      ? q.isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                  } outline-none`}
                />
              )}

              {/* 答案和解析 */}
              {submitted && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">正确答案：{q.answer}</span>
                  </div>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">{q.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 提交按钮 */}
        {!submitted && (
          <div className="mt-6">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white flex items-center justify-center gap-2 ${
                submitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" />提交中...</> : <><Send className="w-5 h-5" />提交答案</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
