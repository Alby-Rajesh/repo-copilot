export type CodeChunk = {
  path: string
  start_line: number
  end_line: number
  content: string
}

export type CodeHit = CodeChunk & {
  id: number
  keyword_score: number
  semantic_score: number
  rrf_score: number
}

export type RepoRecord = {
  name: string
  branch: string
  paths: string[]
}

export type Commit = {
  sha: string
  date: string
  author: string
  message: string
}

export type IssueDraft = {
  title: string
  body: string
}

export type Step = {
  tool: string
  args: Record<string, unknown>
}

export type Turn = { question: string; answer: string }

export type RepoSummary = {
  name: string
  branch: string
  files: number
  chunks: number
  indexed_at: string
}

export type RepoList = { repos: RepoSummary[] }

export type AgentResult = {
  repo: string
  branch: string
  answer: string
  steps: Step[]
  sources: CodeHit[]
  draft: IssueDraft | null
}

export type IndexResult = {
  repo: string
  branch: string
  files: number
  chunks: number
}
