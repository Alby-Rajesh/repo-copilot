import { runAgent } from '@/lib/agent/run'
import { readFields, route } from '@/lib/http'

export const runtime = 'nodejs'
export const maxDuration = 120

export const POST = route(async (req) => {
  const { repo, question } = await readFields(req, 'repo', 'question')
  return runAgent(repo, question)
})
