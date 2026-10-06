import type { IndexResult } from '@/types'
import { chunkLines } from './chunk'
import { mapLimit } from './concurrency'
import { check, db } from './db'
import { embedDocuments } from './embed'
import { getDefaultBranch, getFile, getTree, parseRepo } from './github'
import { HttpError } from './http'
import { searchTerms } from './tokens'

const SOURCE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|rb|php|cs|c|cc|cpp|h|hpp|swift|scala|sql|sh|vue|svelte|css|scss|html|json|md|mdx|ya?ml|toml)$/i
const IGNORED = /(^|\/)(node_modules|vendor|dist|build|out|coverage|\.next|\.git)\/|\.min\.|(^|\/)(package-lock\.json|pnpm-lock\.yaml|composer\.lock)$/
const DOC_FILE = /\.(md|mdx)$/i
const README = /(^|\/)readme\.md$/i
const MAX_FILES = 150
const MAX_FILE_BYTES = 100_000
const FETCH_CONCURRENCY = 8
const INSERT_BATCH = 100

const priority = (path: string) => (README.test(path) ? 0 : DOC_FILE.test(path) ? 2 : 1)

export async function indexRepo(input: string): Promise<IndexResult> {
  const repo = parseRepo(input)
  const branch = await getDefaultBranch(repo)

  const paths = (await getTree(repo, branch))
    .filter((e) => e.type === 'blob' && (e.size ?? 0) <= MAX_FILE_BYTES)
    .map((e) => e.path)
    .filter((path) => SOURCE_FILE.test(path) && !IGNORED.test(path))
    .sort((a, b) => priority(a) - priority(b) || a.localeCompare(b))
    .slice(0, MAX_FILES)
  if (!paths.length) throw new HttpError(422, 'No supported source files found')

  const files = await mapLimit(paths, FETCH_CONCURRENCY, async (path) => chunkLines(path, await getFile(repo, path, branch)))
  const chunks = files.flat()
  const vectors = await embedDocuments(chunks.map((c) => `${c.path}\n${c.content}`))

  check(await db().from('repos').upsert({ name: repo, branch, paths, chunks: chunks.length, indexed_at: new Date().toISOString() }))
  check(await db().from('code_chunks').delete().eq('repo', repo))

  const rows = chunks.map((chunk, i) => ({
    repo,
    ...chunk,
    terms: searchTerms(chunk.path, chunk.content),
    embedding: vectors[i],
  }))
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    check(await db().from('code_chunks').insert(rows.slice(i, i + INSERT_BATCH)))
  }

  return { repo, branch, files: paths.length, chunks: chunks.length }
}
