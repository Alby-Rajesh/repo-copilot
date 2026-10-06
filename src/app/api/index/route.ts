import { readFields, requireAdmin, route } from '@/lib/http'
import { indexRepo } from '@/lib/indexer'

export const runtime = 'nodejs'
export const maxDuration = 300

export const POST = route(async (req) => {
  requireAdmin(req)
  const { repo } = await readFields(req, 'repo')
  return indexRepo(repo)
})
