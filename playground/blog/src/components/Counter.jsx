import { useState } from 'preact/hooks'

export default function Counter({ text }) {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>{text ?? 'Increment'}</button>
    </div>
  )
}
