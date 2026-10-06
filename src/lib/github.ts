import type { Commit } from '@/types'
import { HttpError } from './http'

const API = 'https://api.github.com'
const JSON_TYPE = 'application/vnd.github+json'
const RAW_TYPE = 'application/vnd.github.raw+json'
const REPO_INPUT = /^(?:https?:\/\/)?(?:www\.)?(?:github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$/

type TreeEntry = { path: string; type: 'blob' | 'tree' | 'commit'; size?: number }
type CommitResponse = { sha: string; commit: { message: string; author: { name: string; date: string } } }

const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/')

async function github(path: string, init: RequestInit = {}, accept = JSON_TYPE) {
  const token = process.env.GITHUB_TOKEN
  const res = await fetch(`${API}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  if (!res.ok) {
    const { message } = (await res.json().catch(() => ({}))) as { message?: string }
    throw new HttpError(res.status === 404 ? 404 : 502, `GitHub: ${message ?? res.statusText}`)
  }
  return res
}

export function parseRepo(input: string) {
  const match = input.trim().match(REPO_INPUT)
  if (!match) throw new HttpError(400, 'Use owner/name or a github.com URL')
  return `${match[1]}/${match[2]}`.toLowerCase()
}

export async function getDefaultBranch(repo: string) {
  const { default_branch } = (await (await github(`/repos/${repo}`)).json()) as { default_branch: string }
  return default_branch
}

export async function getTree(repo: string, branch: string) {
  const res = await github(`/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`)
  const { tree } = (await res.json()) as { tree: TreeEntry[] }
  return tree
}

export async function getFile(repo: string, path: string, ref: string) {
  const res = await github(`/repos/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`, {}, RAW_TYPE)
  return res.text()
}

export async function getCommits(repo: string, path?: string): Promise<Commit[]> {
  const query = new URLSearchParams({ per_page: '10', ...(path ? { path } : {}) })
  const commits = (await (await github(`/repos/${repo}/commits?${query}`)).json()) as CommitResponse[]
  return commits.map(({ sha, commit }) => ({
    sha: sha.slice(0, 7),
    date: commit.author.date.slice(0, 10),
    author: commit.author.name,
    message: commit.message.split('\n')[0],
  }))
}

export async function createIssue(repo: string, title: string, body: string) {
  const res = await github(`/repos/${repo}/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body }),
  })
  const { html_url } = (await res.json()) as { html_url: string }
  return html_url
}
