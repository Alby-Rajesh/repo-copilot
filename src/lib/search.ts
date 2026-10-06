import type { CodeHit } from '@/types'
import { check, db } from './db'
import { embedQuery } from './embed'
import { keywordQuery } from './tokens'

export async function searchCode(repo: string, query: string, matchCount = 4) {
  const hits = check(
    await db().rpc('search_code', {
      repo_name: repo,
      query_text: keywordQuery(query) || query,
      query_embedding: await embedQuery(query),
      match_count: matchCount,
    })
  )
  return (hits ?? []) as CodeHit[]
}

export const formatHits = (hits: CodeHit[]) =>
  hits.length
    ? hits.map((h) => `${h.path}:${h.start_line}-${h.end_line}\n${h.content}`).join('\n\n---\n\n')
    : 'No matches.'
