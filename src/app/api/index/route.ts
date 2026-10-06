import { parseRepo } from '@/lib/github'
import { HttpError, isAdmin, readFields, route } from '@/lib/http'
import { indexRepo } from '@/lib/indexer'
import { listRepos } from '@/lib/repos'

export const runtime = 'nodejs'
export const maxDuration = 300

// Indexing is open so visitors can try their own repository; the cap protects the database and API quotas.
const MAX_INDEXED_REPOS = 12

export const POST = route(async (req) => {
  const { repo } = await readFields(req, 'repo')

  if (!isAdmin(req)) {
    const name = parseRepo(repo)
    const indexed = await listRepos()
    if (indexed.length >= MAX_INDEXED_REPOS && !indexed.some((r) => r.name === name)) {
      throw new HttpError(409, `The demo already holds ${MAX_INDEXED_REPOS} repositories. Pick one from the list instead.`)
    }
  }

  return indexRepo(repo)
})
