'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Chapter } from '@/lib/api'

export default function ChapterSidebar() {
  const params = useParams()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [activeChapter, setActiveChapter] = useState<string>()

  useEffect(() => {
    fetch('/api/chapters')
      .then(res => res.json())
      .then(data => setChapters(data))
  }, [])

  useEffect(() => {
    if (params.slug) {
      setActiveChapter(params.slug as string)
    }
  }, [params.slug])

  return (
    <nav>
      <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-gray-100">章节目录</h3>
      <ul className="space-y-1">
        {chapters.map((chapter) => (
          <li key={chapter.slug}>
            <Link
              href={`/chapters/${chapter.slug}`}
              className={`block px-2 py-1 rounded ${
                activeChapter === chapter.slug
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/50'
              }`}
            >
              {chapter.title}
            </Link>
            {activeChapter === chapter.slug && chapter.sections && chapter.sections.length > 0 && (
              <ul className="pl-4 mt-1 space-y-1 border-l border-gray-200 dark:border-gray-700">
                {chapter.sections.map((section) => (
                  <li key={section.id}>
                    <Link
                      href={`/chapters/${chapter.slug}#${section.id}`}
                      className="block px-2 py-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {section.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
