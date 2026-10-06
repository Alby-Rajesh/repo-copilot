const IDENTIFIER = /[A-Za-z_][A-Za-z0-9_]*/g
const WORD = /[\p{L}\p{N}_.-]+/gu
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'was', 'how', 'why', 'what', 'where', 'when', 'which', 'who',
  'does', 'did', 'this', 'that', 'with', 'from', 'into', 'about', 'can', 'there', 'work', 'works',
])

export const splitIdentifier = (word: string) =>
  word
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[_\s./-]+/)
    .filter(Boolean)
    .map((part) => part.toLowerCase())

export function searchTerms(path: string, content: string) {
  const parts = new Set(splitIdentifier(path))
  for (const word of content.match(IDENTIFIER) ?? []) {
    const pieces = splitIdentifier(word)
    if (pieces.length > 1) pieces.forEach((piece) => parts.add(piece))
  }
  return [...parts].join(' ')
}

export function keywordQuery(question: string) {
  const terms = new Set<string>()
  for (const word of question.match(WORD) ?? []) {
    terms.add(word.toLowerCase())
    splitIdentifier(word).forEach((part) => terms.add(part))
  }
  return [...terms].filter((t) => t.length > 2 && !STOP_WORDS.has(t)).join(' or ')
}
