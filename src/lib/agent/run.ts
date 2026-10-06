import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions'
import type { AgentResult, Step } from '@/types'
import { parseRepo } from '../github'
import { chatModel, groq } from '../groq'
import { getIndexedRepo } from '../repos'
import { systemPrompt } from './prompt'
import { runTool, tools, type ToolContext } from './tools'

const MAX_STEPS = 8
const TOOL_RESULT_LIMIT = 6000

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

export async function runAgent(repoInput: string, question: string): Promise<AgentResult> {
  const repo = await getIndexedRepo(parseRepo(repoInput))
  const ctx: ToolContext = { repo, sources: new Map(), draft: null }
  const steps: Step[] = []
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt(repo) },
    { role: 'user', content: question },
  ]

  const finish = (content: string | null | undefined): AgentResult => ({
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
