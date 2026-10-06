import { runAgent } from '@/lib/agent/run'
import { HttpError, route } from '@/lib/http'
import type { Turn } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 120

const isTurn = (value: unknown): value is Turn =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Turn).question === 'string' &&
  typeof (value as Turn).answer === 'string'

export const POST = route(async (req) => {
  const body = (await req.json().catch(() => ({}))) as { repo?: unknown; question?: unknown; history?: unknown }
  const repo = typeof body.repo === 'string' ? body.repo.trim() : ''
  const question = typeof body.question === 'string' ? body.question.trim() : ''
  if (!repo) throw new HttpError(400, 'Missing repo')
  if (!question) throw new HttpError(400, 'Missing question')
  if (question.length > 2000) throw new HttpError(400, 'Question is too long')

  const history = Array.isArray(body.history) ? body.history.filter(isTurn) : []
  return runAgent(repo, question, history)
})
