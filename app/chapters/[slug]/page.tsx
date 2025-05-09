import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getChapterContent, getAllChapters } from '@/lib/api'
import Link from 'next/link'

interface ChapterPageProps {
  params: {
    slug: string
  }
}

// 生成静态页面参数
export async function generateStaticParams() {
  const chapters = await getAllChapters()
  return chapters.map((chapter) => ({
    slug: chapter.slug,
  }))
}

// 生成元数据
export async function generateMetadata({ params }: ChapterPageProps) {
  const chapter = await getChapterContent(params.slug)
  
  if (!chapter) {
    return {
      title: '章节未找到',
    }
  }

  return {
    title: `${chapter.title} | Practical File System Design 中文翻译`,
    description: chapter.description || '文件系统设计的实践指南中文翻译版本',
  }
}

// 章节页面组件
export default async function ChapterPage({ params }: ChapterPageProps) {
  const chapter = await getChapterContent(params.slug)

  if (!chapter) {
    notFound()
  }

  return (
    <article className="relative min-h-[calc(100vh-64px)]">
      <nav className="mb-8">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回目录
        </Link>
      </nav>

      <div className="prose prose-lg dark:prose-invert mx-auto">
        <MDXRemote 
          source={chapter.content}
          components={{
            pre: (props) => (
              <pre {...props} className="overflow-x-auto bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700" />
            ),
            img: (props) => (
              <img {...props} className="mx-auto rounded-lg shadow-lg" />
            ),
            h1: (props) => (
              <h1 {...props} className="text-3xl font-bold mb-8" />
            ),
            h2: (props) => (
              <h2 {...props} className="text-2xl font-bold mt-12 mb-6" />
            ),
            p: (props) => (
              <p {...props} className="text-gray-800 dark:text-gray-200 leading-relaxed mb-6" />
            ),
          }} 
        />
      </div>

      <nav className="mt-12 flex justify-between border-t border-gray-200 dark:border-gray-800 pt-6">
        <div>
          {/* Previous chapter link will be added here */}
        </div>
        <div>
          {/* Next chapter link will be added here */}
        </div>
      </nav>
    </article>
  )
}