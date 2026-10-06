import type { CodeHit } from '@/types'

export function CodeSources({ hits }: { hits: CodeHit[] }) {
  return (
    <section className='panel'>
      <h2>Code it looked at</h2>
      {hits.map((hit) => (
        <details className='source' key={hit.id}>
          <summary>{hit.path}:{hit.start_line}-{hit.end_line}</summary>
          <pre>{hit.content}</pre>
        </details>
      ))}
    </section>
  )
}
