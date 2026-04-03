const BASE_URL = import.meta.env.VITE_API_URL || ''

export async function startSession() {
  const res = await fetch(`${BASE_URL}/session/start`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to start session')
  return res.json()
}

export async function endSession(sessionId) {
  const res = await fetch(`${BASE_URL}/session/${sessionId}/end`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to end session')
  return res.json()
}

export async function askQuestion(sessionId, question) {
  const res = await fetch(`${BASE_URL}/qa/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, question }),
  })
  if (!res.ok) throw new Error('Failed to get answer')
  return res.json()
}

export async function getDigest(sessionId) {
  const res = await fetch(`${BASE_URL}/transcript/${sessionId}/digest`)
  if (!res.ok) throw new Error('Failed to get digest')
  return res.json()
}

export function createWebSocket(sessionId) {
  const wsBase = import.meta.env.VITE_WS_URL ||
    (window.location.protocol === 'https:' ? 'wss:' : 'ws:') +
    '//' + window.location.host
  return new WebSocket(`${wsBase}/session/${sessionId}/ws`)
}
