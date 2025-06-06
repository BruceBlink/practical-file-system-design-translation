import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const chaptersDirectory = path.join(process.cwd(), 'content/chapters')

export interface Chapter {
  slug: string
  title: string
  content: string
  description?: string
  sections?: Section[]
  previousChapter?: { slug: string; title: string }
  nextChapter?: { slug: string; title: string }
}

export interface Section {
  id: string
  title: string
  parent: string
}

  /**
   * Reads all markdown files from the given directory, filters them by
   * extension, and sorts them by chapter number (extracted from the filename).
   *
   * @param dirPath path to the directory containing the markdown files
   * @returns an array of markdown file names, sorted by chapter number
   */
function getAllMarkdownFiles(dirPath: string): string[] {
    const files = fs.readdirSync(dirPath)
    .filter(filename => filename.endsWith('.md'))
    .sort((a, b) => {
      // 处理特殊情况：Appendix.md 应该排在最后
      if (a === 'Appendix.md') return 1
      if (b === 'Appendix.md') return -1
      // 提取章节号并转换为数字进行比较
      const numA = parseInt(a.match(/chapter(\d+)\.md/)?.[1] || '0')
      const numB = parseInt(b.match(/chapter(\d+)\.md/)?.[1] || '0')
      return numA - numB
    })
    return files
}

export async function getAllChapters(): Promise<Chapter[]> {
  const files = getAllMarkdownFiles(chaptersDirectory)

  const chapters = await Promise.all(
    files.map(async (filename) => {
      const slug = filename.replace(/\.md$/, '')
      const chapter = await getChapterContent(slug)
        
        if (chapter) {
          // 解析内容中的二级标题作为章节
          const sections = chapter.content
            .split('\n')
            .filter(line => line.startsWith('## '))
            .map(line => {
              const title = line.replace('## ', '').trim()
              const id = title
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
              return {
                id,
                title,
                parent: chapter.slug
              }
            })

          if (sections.length > 0) {
            chapter.sections = sections
          }
        }
        
        return chapter
      })
  )
  
  return chapters.filter((chapter): chapter is Chapter => chapter !== null)
}

export async function getChapterContent(slug: string): Promise<Chapter | null> {
  // 获取所有章节文件
  const files = getAllMarkdownFiles(chaptersDirectory)  // 确保按文件名排序

  const fileIndex = files.findIndex(file => file === `${slug}.md`)
  if (fileIndex === -1) {
    return null
  }

  // 读取当前章节内容
  const fullPath = path.join(chaptersDirectory, `${slug}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  // 找出前一章和后一章
  const previousChapter = fileIndex > 0 ? files[fileIndex - 1].replace(/\.md$/, '') : null
  const nextChapter = fileIndex < files.length - 1 ? files[fileIndex + 1].replace(/\.md$/, '') : null

  // 如果存在前一章或后一章，获取它们的标题
  let previousChapterInfo = null
  let nextChapterInfo = null

  if (previousChapter) {
    const prevContent = fs.readFileSync(path.join(chaptersDirectory, `${previousChapter}.md`), 'utf8')
    const { data: prevData } = matter(prevContent)
    previousChapterInfo = {
      slug: previousChapter,
      title: prevData.title || previousChapter
    }
  }

  if (nextChapter) {
    const nextContent = fs.readFileSync(path.join(chaptersDirectory, `${nextChapter}.md`), 'utf8')
    const { data: nextData } = matter(nextContent)
    nextChapterInfo = {
      slug: nextChapter,
      title: nextData.title || nextChapter
    }
  }

  // 解析内容中的二级标题作为章节
  const sections = content
    .split('\n')
    .filter(line => line.startsWith('## '))
    .map(line => {
      const title = line.replace('## ', '').trim()
      const id = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      return { id, title, parent: slug }
    })

  return {
    slug,
    title: data.title || slug,
    content,
    description: data.description,
    sections,
    previousChapter: previousChapterInfo || undefined,
    nextChapter: nextChapterInfo || undefined
  }
}