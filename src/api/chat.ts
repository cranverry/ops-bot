import type { Role } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

export interface StreamCallbacks {
  onToken: (token: string) => void
  onDone: () => void
  onError: (err: Error) => void
}

export async function streamChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  role: Role,
  callbacks: StreamCallbacks
): Promise<void> {
  const { onToken, onDone, onError } = callbacks

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('opsbot-token') ?? ''}`,
      },
      body: JSON.stringify({ messages, role }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`API error ${res.status}: ${text}`)
    }

    if (!res.body) {
      throw new Error('No response body')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            onDone()
            return
          }
          try {
            const parsed = JSON.parse(data)
            const token = parsed.choices?.[0]?.delta?.content ?? ''
            if (token) onToken(token)
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    }

    onDone()
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)))
  }
}
