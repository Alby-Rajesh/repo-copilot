'use client'

import { useState } from 'react'
import { postJson } from '@/lib/client'
import type { IssueDraft } from '@/types'

type Props = { draft: IssueDraft; repo: string; adminKey: string }

export function IssueDraftPanel({ draft, repo, adminKey }: Props) {
  const [title, setTitle] = useState(draft.title)
  const [body, setBody] = useState(draft.body)
  const [busy, setBusy] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  async function create() {
    setBusy(true)
    setError('')
    try {
      const result = await postJson<{ url: string }>('/api/issue', { repo, title, body }, { 'x-admin-key': adminKey })
      setUrl(result.url)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className='panel'>
      <h2>Issue draft</h2>
      <p className='muted'>Nothing is posted until you create it. Edit freely first.</p>
      <label htmlFor='issue-title'>Title</label>
      <input id='issue-title' value={title} onChange={(e) => setTitle(e.target.value)} />
      <label htmlFor='issue-body'>Body</label>
      <textarea id='issue-body' className='code' value={body} onChange={(e) => setBody(e.target.value)} />
      <div className='row'>
        {url ? (
          <a className='ok' href={url} target='_blank' rel='noreferrer'>Issue created, open on GitHub</a>
        ) : (
          <span className='error'>{error}</span>
        )}
        <button type='button' className='accent' onClick={create} disabled={busy || Boolean(url)}>
          {busy ? 'Creating…' : 'Create issue'}
        </button>
      </div>
    </section>
  )
}
