import { createIssue, parseRepo } from '@/lib/github'
import { readFields, requireAdmin, route } from '@/lib/http'

export const runtime = 'nodejs'

export const POST = route(async (req) => {
  requireAdmin(req)
  const { repo, title, body } = await readFields(req, 'repo', 'title', 'body')
  return { url: await createIssue(parseRepo(repo), title, body) }
})
