'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';

interface LatexRendererProps {
  content: string;
  className?: string;
}

/**
 * LaTeX 公式渲染组件
 * 支持行内公式 $...$ 和块级公式 $$...$$
 */
export default function LatexRenderer({ content, className = '' }: LatexRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 替换 LaTeX 公式
    let html = content;

    // 块级公式 $$...$$
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
      try {
        return `<div class="katex-block my-2">${katex.renderToString(formula.trim(), {
          displayMode: true,
          throwOnError: false,
        })}</div>`;
      } catch {
        return `<code class="text-red-500">${formula}</code>`;
      }
    });

    // 行内公式 $...$
    html = html.replace(/\$([^$\n]+?)\$/g, (_, formula) => {
      try {
        return katex.renderToString(formula.trim(), {
          displayMode: false,
          throwOnError: false,
        });
      } catch {
        return `<code class="text-red-500">${formula}</code>`;
      }
    });

    // 处理换行
    html = html.replace(/\n/g, '<br/>');

    containerRef.current.innerHTML = html;
  }, [content]);

  return <div ref={containerRef} className={className} />;
}

/**
 * 简单的 Markdown 渲染（支持 LaTeX）
 */
export function MarkdownWithLatex({ content, className = '' }: LatexRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let html = content;

    // 块级公式
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
      try {
        return `<div class="katex-block my-4 text-center">${katex.renderToString(formula.trim(), {
          displayMode: true,
          throwOnError: false,
        })}</div>`;
      } catch {
        return `<pre class="text-red-500 bg-red-50 p-2 rounded">${formula}</pre>`;
      }
    });

    // 行内公式
    html = html.replace(/\$([^$\n]+?)\$/g, (_, formula) => {
      try {
        return katex.renderToString(formula.trim(), {
          displayMode: false,
          throwOnError: false,
        });
      } catch {
        return `<code class="text-red-500">${formula}</code>`;
      }
    });

    // 简单 Markdown 处理
    // 标题
    html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');

    // 粗体和斜体
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 代码块
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>');

    // 列表
    html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li class="ml-4">$1</li>');
    html = html.replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc my-2">$&</ul>');

    // 换行
    html = html.replace(/\n\n/g, '</p><p class="my-2">');
    html = html.replace(/\n/g, '<br/>');
    html = `<p class="my-2">${html}</p>`;

    containerRef.current.innerHTML = html;
  }, [content]);

  return <div ref={containerRef} className={`prose prose-sm max-w-none ${className}`} />;
}
