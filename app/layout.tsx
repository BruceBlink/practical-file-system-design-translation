import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Practical File System Design 中文翻译',
  description: '文件系统设计的实践指南中文翻译版本',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body className="font-sans antialiased text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 flex flex-col min-h-screen">
        {children}
        <footer className="py-4 mt-auto border-t border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
            基于 Dominic Giampaolo 的《Practical File System Design》英文原版翻译
          </div>
        </footer>
      </body>
    </html>
  )
}