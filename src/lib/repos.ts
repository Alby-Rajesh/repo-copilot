import type { RepoRecord } from '@/types'
import { check, db } from './db'
import { HttpError } from './http'

export async function getIndexedRepo(name: string) {
  const repo = check(await db().from('repos').select('name, branch, paths').eq('name', name).maybeSingle())
  if (!repo) throw new HttpError(404, `Index ${name} before asking about it`)
  return repo as RepoRecord
}
