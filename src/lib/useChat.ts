'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { postJson } from '@/lib/client'
import type { AgentResult, Turn } from '@/types'

export type Message = {
  id: string
  question: string
  result?: AgentResult
  error?: string
}

type Saved = { repo: string; messages: Message[] }

const STORAGE_KEY = 'repo-copilot.chat.v1'
const KEEP_MESSAGES = 30
/** How many completed exchanges are sent back as context with each new question. */
export const CONTEXT_TURNS = 3

function load(): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (saved && typeof saved.repo === 'string' && Array.isArray(saved.messages)) return saved
  } catch {}
  return { repo: '', messages: [] }
}

function save(state: Saved) {
  try {
    const messages = state.messages.filter((m) => m.result).slice(-KEEP_MESSAGES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ repo: state.repo, messages }))
  } catch {
    // Storage can be unavailable (private mode); the chat still works for this visit.
  }
}

/** One conversation per repository: switching repository starts a fresh chat. */
export function useChat() {
  const [state, setState] = useState<Saved>({ repo: '', messages: [] })
  const [busy, setBusy] = useState(false)
  const ready = useRef(false)

  useEffect(() => {
    setState(load())
    ready.current = true
  }, [])

  useEffect(() => {
    if (ready.current) save(state)
  }, [state])

  const selectRepo = useCallback((repo: string) => {
    setState((prev) => (prev.repo === repo ? prev : { repo, messages: [] }))
  }, [])

  const patch = (id: string, change: Partial<Message>) =>
    setState((prev) => ({ ...prev, messages: prev.messages.map((m) => (m.id === id ? { ...m, ...change } : m)) }))

  const ask = useCallback(
    async (question: string) => {
      if (busy || !state.repo) return
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const history: Turn[] = state.messages
        .filter((m) => m.result)
        .slice(-CONTEXT_TURNS)
        .map((m) => ({ question: m.question, answer: m.result!.answer }))

      setState((prev) => ({ ...prev, messages: [...prev.messages, { id, question }] }))
      setBusy(true)
      try {
        patch(id, { result: await postJson<AgentResult>('/api/agent', { repo: state.repo, question, history }) })
      } catch (err) {
        patch(id, { error: (err as Error).message })
      } finally {
        setBusy(false)
      }
    },
    [busy, state]
  )

  const clear = useCallback(() => setState((prev) => ({ ...prev, messages: [] })), [])

  return { repo: state.repo, messages: state.messages, busy, ask, clear, selectRepo }
}
