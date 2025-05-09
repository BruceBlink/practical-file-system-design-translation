import Link from 'next/link'
import { getAllChapters } from '@/lib/api'

export default async function Home() {
  const chapters = await getAllChapters()

  return (
    <main className="flex-1">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="mb-4">
            <h1 className="relative inline-block text-6xl font-bold">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                Practical File System
              </span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                Design
              </span>
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-400 font-medium mb-16">文件系统设计实践指南 - 中文翻译版</p>
        </div>
        
        <section>
          <h2 className="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-200">章节目录</h2>
          <div className="space-y-4">
            {chapters.map((chapter, index) => (
              <Link 
                key={chapter.slug}
                href={`/chapters/${chapter.slug}`}
                className="group block p-4 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                  <span className="text-lg text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {chapter.title}
                  </span>
                  <svg 
                    className="w-5 h-5 ml-auto text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}