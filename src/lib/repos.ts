import type { RepoRecord, RepoSummary } from '@/types'
import { check, db } from './db'
import { HttpError } from './http'

export async function getIndexedRepo(name: string) {
  const repo = check(await db().from('repos').select('name, branch, paths').eq('name', name).maybeSingle())
  if (!repo) throw new HttpError(404, `Index ${name} before asking about it`)
  return repo as RepoRecord
}

export async function listRepos(): Promise<RepoSummary[]> {
  const rows = check(
    await db().from('repos').select('name, branch, paths, chunks, indexed_at').order('indexed_at', { ascending: false })
  ) as (RepoRecord & { chunks: number; indexed_at: string })[] | null
  return (rows ?? []).map(({ paths, ...repo }) => ({ ...repo, files: paths.length }))
}

export async function removeRepo(name: string) {
  check(await db().from('repos').delete().eq('name', name))
}
