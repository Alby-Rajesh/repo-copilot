'use client'

import { useEffect, useRef, useState } from 'react'
import { Composer } from '@/components/Composer'
import { MessageView } from '@/components/MessageView'
import { RepoSidebar } from '@/components/RepoSidebar'
import { CONTEXT_TURNS, useChat } from '@/lib/useChat'

const STARTERS = [
  'Give me a tour: what does this project do and how is it organised?',
  'Where does a request enter the app, and what happens to it?',
  'Look for a likely bug and draft an issue for it',
]
const KEY_STORAGE = 'repo-copilot.admin-key'

export default function Home() {
  const { repo, messages, busy, ask, clear, selectRepo } = useChat()
  const [adminKey, setAdminKey] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      setAdminKey(sessionStorage.getItem(KEY_STORAGE) ?? '')
    } catch {}
  }, [])

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  function rememberKey(value: string) {
    setAdminKey(value)
    try {
      sessionStorage.setItem(KEY_STORAGE, value)
    } catch {}
  }

  const remembered = Math.min(CONTEXT_TURNS, messages.filter((m) => m.result).length)

  return (
    <div className='app'>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className='brand'>
          <span className='mark' aria-hidden='true'>{'</>'}</span>
          <div>
            <h1>Repo Copilot</h1>
            <p className='muted small'>A code-reading agent on Groq</p>
          </div>
        </div>
        <RepoSidebar selected={repo} adminKey={adminKey} onSelect={selectRepo} onAdminKeyChange={rememberKey} />
        <p className='muted small foot'>
          The agent searches the code by keywords and meaning, opens files, checks commit history, then answers with
          file and line references.
        </p>
      </aside>

      <main className='chat'>
        <header className='chat-head'>
          <button type='button' className='quiet only-narrow' onClick={() => setSidebarOpen((v) => !v)} aria-expanded={sidebarOpen}>
            Repositories
          </button>
          <span className='context'>
            {repo ? <code className='pill'>{repo}</code> : <span className='muted small'>No repository selected</span>}
            <span className='muted small wide-only'>
              {remembered > 0
                ? `Remembering the last ${remembered} ${remembered === 1 ? 'exchange' : 'exchanges'}`
                : `Follow-ups use the last ${CONTEXT_TURNS} exchanges`}
            </span>
          </span>
          <button type='button' className='quiet' onClick={clear} disabled={busy || messages.length === 0}>
            New chat
          </button>
        </header>

        <div className='thread'>
          {messages.length === 0 ? (
            <div className='empty'>
              <h2>{repo ? 'What do you want to know or fix?' : 'Pick a repository to start'}</h2>
              <p className='muted'>
                {repo
                  ? 'Ask how something works or what looks broken, then keep going with follow-ups.'
                  : 'Choose one from the list, or add any public GitHub repository and it will be indexed in about a minute.'}
              </p>
              {repo && (
                <div className='starters'>
                  {STARTERS.map((text) => (
                    <button key={text} type='button' className='chip' onClick={() => ask(text)} disabled={busy}>
                      {text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            messages.map((message) => <MessageView key={message.id} message={message} adminKey={adminKey} />)
          )}
          <div ref={end} />
        </div>

        <div className='dock'>
          <Composer busy={busy} disabled={!repo} placeholder={repo ? `Ask about ${repo}…` : 'Select a repository first'} onAsk={ask} />
          <p className='muted small hint'>Enter to send, Shift+Enter for a new line</p>
        </div>
      </main>
    </div>
  )
}
