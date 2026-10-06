'use client'

import { useState } from 'react'
import { postJson } from '@/lib/client'
import type { IndexResult } from '@/types'

type Props = {
  repo: string
  adminKey: string
  onRepoChange: (repo: string) => void
  onAdminKeyChange: (key: string) => void
}

export function RepoPanel({ repo, adminKey, onRepoChange, onAdminKeyChange }: Props) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)

  async function index() {
    setBusy(true)
    setStatus(null)
    try {
      const result = await postJson<IndexResult>('/api/index', { repo }, { 'x-admin-key': adminKey })
      setStatus({ ok: true, text: `Indexed ${result.files} files (${result.chunks} chunks) on ${result.branch}.` })
    } catch (err) {
      setStatus({ ok: false, text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='panel'>
      <h2>Repository</h2>
      <label htmlFor='repo'>GitHub repo</label>
      <input id='repo' value={repo} onChange={(e) => onRepoChange(e.target.value)} placeholder='owner/name or github.com URL' />
      <label htmlFor='admin-key'>Admin key</label>
      <input id='admin-key' type='password' value={adminKey} onChange={(e) => onAdminKeyChange(e.target.value)} />
      <div className='row'>
        <span className='muted'>Index once, then re-index after big changes.</span>
        <button type='button' onClick={index} disabled={busy || !repo.trim()}>{busy ? 'Indexing…' : 'Index repo'}</button>
      </div>
      {status && <p className={status.ok ? 'ok' : 'error'} style={{ marginTop: 12 }}>{status.text}</p>}
    </div>
  )
}
