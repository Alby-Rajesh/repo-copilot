import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions'
import type { AgentResult, Step, Turn } from '@/types'
import { parseRepo } from '../github'
import { chatModel, groq } from '../groq'
import { getIndexedRepo } from '../repos'
import { systemPrompt } from './prompt'
import { runTool, tools, type ToolContext } from './tools'

const MAX_STEPS = 8
const TOOL_RESULT_LIMIT = 6000
export const HISTORY_TURNS = 3
const MAX_TURN_CHARS = 3000

/** Earlier exchanges give the agent context for follow-ups; only the most recent few are kept. */
const historyMessages = (history: Turn[]): ChatCompletionMessageParam[] =>
  history.slice(-HISTORY_TURNS).flatMap((turn) => [
    { role: 'user' as const, content: turn.question.slice(0, MAX_TURN_CHARS) },
    { role: 'assistant' as const, content: turn.answer.slice(0, MAX_TURN_CHARS) },
  ])

function parseArgs(raw: string) {
  try {
    const value = JSON.parse(raw || '{}')
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

const complete = (messages: ChatCompletionMessageParam[], allowTools: boolean) =>
  groq().chat.completions.create({
    model: chatModel(),
    temperature: 0.2,
    messages,
    tools,
    tool_choice: allowTools ? 'auto' : 'none',
  })

export async function runAgent(repoInput: string, question: string, history: Turn[] = []): Promise<AgentResult> {
  const repo = await getIndexedRepo(parseRepo(repoInput))
  const ctx: ToolContext = { repo, sources: new Map(), draft: null }
  const steps: Step[] = []
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt(repo) },
    ...historyMessages(history),
    { role: 'user', content: question },
  ]

  const finish = (content: string | null | undefined): AgentResult => ({
    repo: repo.name,
    branch: repo.branch,
    answer: content?.trim() || 'The agent finished without an answer. Try a more specific question.',
    steps,
    sources: [...ctx.sources.values()],
    draft: ctx.draft,
  })

  for (let i = 0; i < MAX_STEPS; i++) {
    const { message } = (await complete(messages, true)).choices[0]
    if (!message.tool_calls?.length) return finish(message.content)

    messages.push({ role: 'assistant', content: message.content ?? '', tool_calls: message.tool_calls })
    for (const call of message.tool_calls) {
      const args = parseArgs(call.function.arguments)
      const result = await runTool(call.function.name, args, ctx)
      steps.push({ tool: call.function.name, args })
      messages.push({ role: 'tool', tool_call_id: call.id, content: result.slice(0, TOOL_RESULT_LIMIT) })
    }
  }

  messages.push({ role: 'user', content: 'Step limit reached. Answer now using what you have found.' })
  return finish((await complete(messages, false)).choices[0].message.content)
}
