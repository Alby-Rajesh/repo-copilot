import type { ChatCompletionTool } from 'groq-sdk/resources/chat/completions'
import type { IssueDraft, RepoRecord, CodeHit } from '@/types'
import { getCommits, getFile } from '../github'
import { formatHits, searchCode } from '../search'

const MAX_READ_LINES = 120
const MAX_LISTED_FILES = 200

export type ToolContext = {
  repo: RepoRecord
  sources: Map<number, CodeHit>
  draft: IssueDraft | null
}

type Args = Record<string, unknown>
type Property = { type: 'string' | 'integer'; description: string }

const define = (name: string, description: string, properties: Record<string, Property>, required: string[] = []): ChatCompletionTool => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } },
})

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const integer = (value: unknown, fallback: number) => {
  const n = Number(value)
  return value !== undefined && value !== '' && Number.isFinite(n) ? Math.floor(n) : fallback
}

export const tools = [
  define('search_code', 'Hybrid keyword and semantic search over the indexed repository.', {
    query: { type: 'string', description: 'What to find, for example where JWT tokens are verified' },
  }, ['query']),
  define('read_file', `Read numbered lines from a file, at most ${MAX_READ_LINES} per call.`, {
    path: { type: 'string', description: 'Path from the repository root' },
    start_line: { type: 'integer', description: 'First line, default 1' },
    end_line: { type: 'integer', description: 'Last line' },
  }, ['path']),
  define('list_files', 'List indexed file paths, optionally under a folder.', {
    prefix: { type: 'string', description: 'Folder prefix such as src/api' },
  }),
  define('recent_commits', 'Show the 10 most recent commits for the repository or one file.', {
    path: { type: 'string', description: 'Optional file path' },
  }),
  define('draft_issue', 'Prepare a GitHub issue for the user to review. Does not post it.', {
    title: { type: 'string', description: 'Short, specific title' },
    body: { type: 'string', description: 'Markdown body with context, path:line references and a suggested fix' },
  }, ['title', 'body']),
]

async function readFile(ctx: ToolContext, args: Args) {
  const lines = (await getFile(ctx.repo.name, text(args.path), ctx.repo.branch)).split('\n')
  const start = Math.max(1, integer(args.start_line, 1))
  const end = Math.min(lines.length, integer(args.end_line, lines.length), start + MAX_READ_LINES - 1)
  return lines.slice(start - 1, end).map((line, i) => `${start + i}: ${line}`).join('\n') || 'No lines in that range.'
}

function listFiles(ctx: ToolContext, args: Args) {
  const matches = ctx.repo.paths.filter((path) => path.startsWith(text(args.prefix)))
  if (!matches.length) return 'No indexed files under that prefix.'
  const hidden = matches.length - MAX_LISTED_FILES
  return matches.slice(0, MAX_LISTED_FILES).join('\n') + (hidden > 0 ? `\nand ${hidden} more` : '')
}

async function recentCommits(ctx: ToolContext, args: Args) {
  const commits = await getCommits(ctx.repo.name, text(args.path) || undefined)
  return commits.map((c) => `${c.sha} ${c.date} ${c.author}: ${c.message}`).join('\n') || 'No commits found.'
}

async function search(ctx: ToolContext, args: Args) {
  const hits = await searchCode(ctx.repo.name, text(args.query))
  hits.forEach((hit) => ctx.sources.set(hit.id, hit))
  return formatHits(hits)
}

function draftIssue(ctx: ToolContext, args: Args) {
  ctx.draft = { title: text(args.title), body: text(args.body) }
  return 'Draft saved for the user to review. It has not been posted.'
}

const handlers: Record<string, (ctx: ToolContext, args: Args) => string | Promise<string>> = {
  search_code: search,
  read_file: readFile,
  list_files: listFiles,
  recent_commits: recentCommits,
  draft_issue: draftIssue,
}

export async function runTool(name: string, args: Args, ctx: ToolContext) {
  const handler = handlers[name]
  if (!handler) return `Unknown tool ${name}.`
  try {
    return await handler(ctx, args)
  } catch (err) {
    return `Tool error: ${err instanceof Error ? err.message : 'unknown failure'}`
  }
}
