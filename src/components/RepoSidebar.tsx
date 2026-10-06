'use client'

import { useCallback, useEffect, useState } from 'react'
import { postJson, request } from '@/lib/client'
import type { IndexResult, RepoList, RepoSummary } from '@/types'

type Props = {
  selected: string
  adminKey: string
  onSelect: (repo: string) => void
  onAdminKeyChange: (key: string) => void
}

const when = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}

export function RepoSidebar({ selected, adminKey, onSelect, onAdminKeyChange }: Props) {
  const [repos, setRepos] = useState<RepoSummary[] | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ text: string; bad?: boolean } | null>(null)

  const refresh = useCallback(async () => {
    const { repos } = await request<RepoList>('/api/repos')
    setRepos(repos)
    return repos
  }, [])

  useEffect(() => {
    refresh().catch((err) => {
      setRepos([])
      setStatus({ text: (err as Error).message, bad: true })
    })
  }, [refresh])

  const headers: Record<string, string> = adminKey ? { 'x-admin-key': adminKey } : {}

  async function index(target: string) {
    if (!target.trim()) return
    setBusy(true)
    setStatus({ text: `Reading ${target.trim()} from GitHub and indexing it. This can take a minute…` })
    try {
      const result = await postJson<IndexResult>('/api/index', { repo: target }, headers)
      setStatus({ text: `Indexed ${result.files} files (${result.chunks} chunks) from ${result.branch}.` })
      setInput('')
      await refresh()
      onSelect(result.repo)
    } catch (err) {
      setStatus({ text: (err as Error).message, bad: true })
    } finally {
      setBusy(false)
    }
  }

  async function remove(name: string) {
    setBusy(true)
    setStatus(null)
    try {
      const { repos } = await request<RepoList>(`/api/repos?name=${encodeURIComponent(name)}`, { method: 'DELETE', headers })
      setRepos(repos)
      if (selected === name) onSelect('')
    } catch (err) {
      setStatus({ text: (err as Error).message, bad: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby='repos-title'>
      <h2 id='repos-title'>Repositories</h2>

      {repos === null && <p className='muted small'>Loading…</p>}
      {repos?.length === 0 && <p className='muted small'>Nothing indexed yet. Add a public GitHub repository below.</p>}
      {repos && repos.length > 0 && (
        <ul className='repos'>
          {repos.map((repo) => (
            <li key={repo.name} className={repo.name === selected ? 'active' : ''}>
              <button type='button' className='repo' onClick={() => onSelect(repo.name)} aria-pressed={repo.name === selected}>
                <span className='repo-name'>{repo.name}</span>
                <span className='muted small'>
                  {repo.files} files · {repo.branch} · {when(repo.indexed_at)}
                </span>
              </button>
              <button type='button' className='icon' disabled={busy} onClick={() => index(repo.name)} aria-label={`Re-index ${repo.name}`} title='Re-index'>
                ↻
              </button>
              {adminKey && (
                <button type='button' className='icon danger' disabled={busy} onClick={() => remove(repo.name)} aria-label={`Remove ${repo.name}`} title='Remove'>
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        className='add'
        onSubmit={(e) => {
          e.preventDefault()
          index(input)
        }}
      >
        <label htmlFor='repo'>Add a repository</label>
        <input id='repo' value={input} onChange={(e) => setInput(e.target.value)} placeholder='owner/name or github.com URL' spellCheck={false} autoComplete='off' />
        <p className='muted small'>Public repositories, up to 150 source files. No sign-in needed.</p>
        <button type='submit' className='wide' disabled={busy || !input.trim()}>
          {busy ? 'Indexing…' : 'Index repository'}
        </button>
        {status && <p className={`small status ${status.bad ? 'error' : 'ok'}`} role='status'>{status.text}</p>}
      </form>

      <details className='owner'>
        <summary>Owner tools</summary>
        <label htmlFor='admin-key'>Admin key</label>
        <input id='admin-key' type='password' autoComplete='off' value={adminKey} onChange={(e) => onAdminKeyChange(e.target.value)} />
        <p className='muted small'>Needed to post drafted issues to GitHub and to remove repositories.</p>
      </details>
    </section>
  )
}
