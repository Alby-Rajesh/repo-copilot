'use client'

import type { Message } from '@/lib/useChat'
import type { Step } from '@/types'
import { IssueDraftPanel } from './IssueDraftPanel'

// Matches references such as src/lib/auth.ts:42 or src/lib/auth.ts:42-60.
const FILE_REF = /((?:[\w@.-]+\/)*[\w@.-]+\.[A-Za-z]{1,6}):(\d+)(?:-(\d+))?/g

const TOOL_LABEL: Record<string, string> = {
  search_code: 'Searched code',
  read_file: 'Read file',
  list_files: 'Listed files',
  recent_commits: 'Checked history',
  draft_issue: 'Drafted issue',
}

const blobUrl = (repo: string, branch: string, path: string, start?: number | string, end?: number | string) =>
  `https://github.com/${repo}/blob/${encodeURIComponent(branch)}/${path.split('/').map(encodeURIComponent).join('/')}` +
  (start ? `#L${start}${end ? `-L${end}` : ''}` : '')

function describe(step: Step) {
  const { query, path, start_line, end_line, prefix, title } = step.args as Record<string, string | number | undefined>
  if (step.tool === 'search_code') return String(query ?? '')
  if (step.tool === 'read_file') return `${path ?? ''}${start_line ? `:${start_line}${end_line ? `-${end_line}` : ''}` : ''}`
  if (step.tool === 'list_files') return String(prefix || 'whole repository')
  if (step.tool === 'recent_commits') return String(path || 'whole repository')
  if (step.tool === 'draft_issue') return String(title ?? '')
  return JSON.stringify(step.args)
}

function Answer({ text, repo, branch }: { text: string; repo: string; branch: string }) {
  const parts: (string | { path: string; start: string; end?: string; label: string })[] = []
  let last = 0
  for (const match of text.matchAll(FILE_REF)) {
    parts.push(text.slice(last, match.index))
    parts.push({ path: match[1], start: match[2], end: match[3], label: match[0] })
    last = match.index + match[0].length
  }
  parts.push(text.slice(last))

  return (
    <p className='answer'>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          <span key={i}>{part}</span>
        ) : (
          <a key={i} className='ref' href={blobUrl(repo, branch, part.path, part.start, part.end)} target='_blank' rel='noreferrer'>
            {part.label}
          </a>
        )
      )}
    </p>
  )
}

export function MessageView({ message, adminKey }: { message: Message; adminKey: string }) {
  const { question, result, error } = message

  return (
    <div className='turn'>
      <div className='bubble user'>{question}</div>

      <div className='bubble bot'>
        {!result && !error && (
          <p className='thinking' role='status'>
            <span className='dots' aria-hidden='true'><i /><i /><i /></span>
            Searching, opening files and checking history
          </p>
        )}

        {error && <p className='error' role='alert'>{error}</p>}

        {result && (
          <>
            <Answer text={result.answer} repo={result.repo} branch={result.branch} />

            {result.draft && <IssueDraftPanel draft={result.draft} repo={result.repo} adminKey={adminKey} />}

            {result.steps.length > 0 && (
              <details className='fold'>
                <summary>Agent trace · {result.steps.length} {result.steps.length === 1 ? 'step' : 'steps'}</summary>
                <ol className='steps'>
                  {result.steps.map((step, i) => (
                    <li key={i}>
                      <span className='tool'>{TOOL_LABEL[step.tool] ?? step.tool}</span>
                      <code>{describe(step)}</code>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            {result.sources.length > 0 && (
              <details className='fold'>
                <summary>Code it looked at · {result.sources.length} {result.sources.length === 1 ? 'snippet' : 'snippets'}</summary>
                {result.sources.map((hit) => (
                  <details className='source' key={hit.id}>
                    <summary>
                      <code>{hit.path}:{hit.start_line}-{hit.end_line}</code>
                      <a href={blobUrl(result.repo, result.branch, hit.path, hit.start_line, hit.end_line)} target='_blank' rel='noreferrer' className='small'>
                        Open on GitHub
                      </a>
                    </summary>
                    <pre>{hit.content}</pre>
                  </details>
                ))}
              </details>
            )}
          </>
        )}
      </div>
    </div>
  )
}
