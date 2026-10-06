import type { Step } from '@/types'

export function StepTrace({ steps }: { steps: Step[] }) {
  return (
    <section className='panel'>
      <h2>What the agent did</h2>
      <ol className='steps'>
        {steps.map((step, i) => (
          <li key={i}>
            <code>{step.tool}</code>
            {Object.keys(step.args).length > 0 && <span className='args'>{JSON.stringify(step.args)}</span>}
          </li>
        ))}
      </ol>
    </section>
  )
}
