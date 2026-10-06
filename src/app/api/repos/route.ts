import { parseRepo } from '@/lib/github'
import { HttpError, requireAdmin, route } from '@/lib/http'
import { listRepos, removeRepo } from '@/lib/repos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = route(async () => ({ repos: await listRepos() }))

export const DELETE = route(async (req) => {
  requireAdmin(req)
  const name = new URL(req.url).searchParams.get('name')?.trim()
  if (!name) throw new HttpError(400, 'Missing name')
  await removeRepo(parseRepo(name))
  return { repos: await listRepos() }
})
