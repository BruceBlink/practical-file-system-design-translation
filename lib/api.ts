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
}

export interface Section {
  id: string
  title: string
  parent: string
}

export async function getAllChapters(): Promise<Chapter[]> {
  const files = fs.readdirSync(chaptersDirectory)
  
  const chapters = await Promise.all(
    files
      .filter((filename) => filename.endsWith('.md'))
      .map(async (filename) => {
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