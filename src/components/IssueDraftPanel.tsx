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
  const [copied, setCopied] = useState(false)

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

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${body}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Copying is blocked in this browser. Select the text and copy it manually.')
    }
  }

  return (
    <section className='draft'>
      <h3>Issue draft</h3>
      <p className='muted small'>Nothing is posted until someone creates it. Edit freely first.</p>
      <label htmlFor={`title-${draft.title}`}>Title</label>
      <input id={`title-${draft.title}`} value={title} onChange={(e) => setTitle(e.target.value)} />
      <label htmlFor={`body-${draft.title}`}>Body</label>
      <textarea id={`body-${draft.title}`} className='code' value={body} onChange={(e) => setBody(e.target.value)} />
      <div className='row'>
        <span className='small'>
          {url ? (
            <a className='ok' href={url} target='_blank' rel='noreferrer'>Issue created, open on GitHub</a>
          ) : error ? (
            <span className='error' role='alert'>{error}</span>
          ) : (
            <span className='muted'>{adminKey ? `Posts to ${repo}` : 'Posting needs the admin key (Owner tools)'}</span>
          )}
        </span>
        <span className='actions'>
          <button type='button' className='quiet' onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
          <button type='button' onClick={create} disabled={busy || Boolean(url) || !adminKey}>
            {busy ? 'Creating…' : 'Create issue'}
          </button>
        </span>
      </div>
    </section>
  )
}
