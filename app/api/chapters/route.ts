import { getAllChapters } from '@/lib/api'
import { NextResponse } from 'next/server'

export async function GET() {
  const chapters = await getAllChapters()
  return NextResponse.json(chapters)
}
