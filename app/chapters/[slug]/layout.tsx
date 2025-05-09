import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '章节 | Practical File System Design 中文翻译',
  description: '文件系统设计的实践指南中文翻译版本',
}

export default function ChapterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex-1">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <main className="prose prose-lg dark:prose-invert max-w-none">
          {children}
        </main>
      </div>
    </div>
  )
}