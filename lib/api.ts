import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const chaptersDirectory = path.join(process.cwd(), 'content/chapters')

export interface Chapter {
  slug: string
  title: string
  content: string
  description?: string
}

export async function getAllChapters(): Promise<Chapter[]> {
  const files = fs.readdirSync(chaptersDirectory)
  
  const chapters = await Promise.all(
    files
      .filter((filename) => filename.endsWith('.md'))
      .map(async (filename) => {
        const slug = filename.replace(/\.md$/, '')
        const chapter = await getChapterContent(slug)
        return chapter
      })
  )
  
  return chapters.filter((chapter): chapter is Chapter => chapter !== null)
}

export async function getChapterContent(slug: string): Promise<Chapter | null> {
  try {
    const fullPath = path.join(chaptersDirectory, `${slug}.md`)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    
    const { data, content } = matter(fileContents)
    
    // 从内容中提取第一个标题作为章节标题
    const titleMatch = content.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1] : slug

    return {
      slug,
      title,
      content,
      description: data.description,
    }
  } catch (error) {
    return null
  }
}