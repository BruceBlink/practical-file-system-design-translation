import Link from 'next/link'
import { getAllChapters } from '@/lib/api'

export default async function Home() {
  const chapters = await getAllChapters()

  return (
    <main className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 min-h-[calc(100vh-64px)]">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            Practical File System Design
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 font-medium">文件系统设计实践指南 - 中文翻译版</p>
        </div>
        
        <section className="bg-transparent p-8">
          <h2 className="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-200">章节目录</h2>
          <ul className="space-y-4">
            {chapters.map((chapter) => (
              <li 
                key={chapter.slug} 
                className="group relative hover:bg-white dark:hover:bg-gray-800 rounded-lg p-4 transition-all duration-200"
              >
                <Link 
                  href={`/chapters/${chapter.slug}`}
                  className="block text-lg text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                >
                  {chapter.title}
                  <svg 
                    className="inline-block ml-2 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}