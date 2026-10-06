'use client'

import { useState } from 'react'
import { AskForm } from '@/components/AskForm'
import { CodeSources } from '@/components/CodeSources'
import { IssueDraftPanel } from '@/components/IssueDraftPanel'
import { RepoPanel } from '@/components/RepoPanel'
import { StepTrace } from '@/components/StepTrace'
import { postJson } from '@/lib/client'
import type { AgentResult } from '@/types'

export default function Home() {
  const [repo, setRepo] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [result, setResult] = useState<AgentResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [run, setRun] = useState(0)

  async function ask(question: string) {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      setResult(await postJson<AgentResult>('/api/agent', { repo, question }))
      setRun((n) => n + 1)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className='shell'>
      <aside className='stack'>
        <div className='panel'>
          <h1>Repo Copilot</h1>
          <p className='muted'>
            Point it at a GitHub repository and ask how something works or what is broken. It answers with
            file and line references, and drafts issues you can review before posting.
          </p>
        </div>
        <RepoPanel repo={repo} adminKey={adminKey} onRepoChange={setRepo} onAdminKeyChange={setAdminKey} />
      </aside>

      <div className='stack'>
        <AskForm busy={busy} disabled={!repo.trim()} onAsk={ask} />
        {error && <p className='panel error'>{error}</p>}
        {result && (
          <section className='panel'>
            <h2>Answer</h2>
            <p className='answer'>{result.answer}</p>
          </section>
        )}
        {result?.draft && <IssueDraftPanel key={run} draft={result.draft} repo={repo} adminKey={adminKey} />}
        {result && result.steps.length > 0 && <StepTrace steps={result.steps} />}
        {result && result.sources.length > 0 && <CodeSources hits={result.sources} />}
      </div>
    </main>
  )
}
