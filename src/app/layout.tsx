import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import 'katex/dist/katex.min.css';
import './globals.css';

export const metadata: Metadata = {
  title: '学生错题小助手',
  description: 'AI驱动的智能学习辅助平台，帮助学生进行作业批改、错题管理和针对性练习',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
