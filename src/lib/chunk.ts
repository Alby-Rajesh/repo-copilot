import type { CodeChunk } from '@/types'

export function chunkLines(path: string, text: string, size = 60, overlap = 10) {
  const lines = text.split('\n')
  const chunks: CodeChunk[] = []

  for (let start = 0; start < lines.length; start += size - overlap) {
    const end = Math.min(start + size, lines.length)
    const content = lines.slice(start, end).join('\n')
    if (content.trim()) chunks.push({ path, start_line: start + 1, end_line: end, content })
    if (end === lines.length) break
  }
  return chunks
}
