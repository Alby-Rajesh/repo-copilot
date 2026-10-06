'use client'

import { useState, type FormEvent } from 'react'

type Props = { busy: boolean; disabled: boolean; onAsk: (question: string) => void }

export function AskForm({ busy, disabled, onAsk }: Props) {
  const [question, setQuestion] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (question.trim()) onAsk(question.trim())
  }

  return (
    <form className='panel' onSubmit={submit}>
      <label htmlFor='question' style={{ marginTop: 0 }}>What do you want to know or fix?</label>
      <textarea
        id='question'
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder='How is authentication handled? If you spot a bug, draft an issue for it.'
      />
      <div className='row'>
        <span className='muted'>The agent searches, opens files and checks history before answering.</span>
        <button type='submit' className='accent' disabled={busy || disabled}>{busy ? 'Working…' : 'Run agent'}</button>
      </div>
    </form>
  )
}
