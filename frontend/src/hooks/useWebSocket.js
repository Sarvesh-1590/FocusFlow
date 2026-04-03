import { useRef, useCallback, useEffect } from 'react'
import { createWebSocket } from '../utils/api'

const BEHAVIOR_INTERVAL_MS = 30000
const PING_INTERVAL_MS = 20000

export function useWebSocket(sessionId, handlers) {
  const wsRef = useRef(null)
  const behaviorRef = useRef({
    keyboard_idle_seconds: 0,
    mouse_movement_delta: 0,
    topic_shift_score: 0,
    audio_energy_variance: 0.3,
    time_since_last_ui_action: 0,
    words_per_minute_drop: 0,
    scroll_activity: 0,
    lastKeypress: Date.now(),
    lastMouseMove: Date.now(),
    lastUiAction: Date.now(),
    lastMouseX: 0,
    lastMouseY: 0,
  })
  const behaviorTimerRef = useRef(null)
  const pingTimerRef = useRef(null)

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const sendAudioChunk = useCallback((b64) => {
    send({ type: 'audio_chunk', data: b64 })
  }, [send])

  const connect = useCallback((explicitSessionId) => {
    const targetId = explicitSessionId || sessionId
    if (!targetId) return
    const ws = createWebSocket(targetId)
    wsRef.current = ws

    ws.onopen = () => {
      handlers.onOpen?.()

      // Ping keep-alive
      pingTimerRef.current = setInterval(() => {
        send({ type: 'ping' })
      }, PING_INTERVAL_MS)

      // Behavior reporting
      behaviorTimerRef.current = setInterval(() => {
        const b = behaviorRef.current
        const now = Date.now()
        b.keyboard_idle_seconds = (now - b.lastKeypress) / 1000
        b.time_since_last_ui_action = (now - b.lastUiAction) / 1000
        send({
          type: 'behavior',
          data: {
            keyboard_idle_seconds: b.keyboard_idle_seconds,
            mouse_movement_delta: b.mouse_movement_delta,
            topic_shift_score: b.topic_shift_score,
            audio_energy_variance: b.audio_energy_variance,
            time_since_last_ui_action: b.time_since_last_ui_action,
            words_per_minute_drop: b.words_per_minute_drop,
            scroll_activity: b.scroll_activity,
          }
        })
        // Reset per-window accumulators
        b.mouse_movement_delta = 0
        b.scroll_activity = 0
      }, BEHAVIOR_INTERVAL_MS)
    }

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      switch (msg.type) {
        case 'transcript':   handlers.onTranscript?.(msg);   break
        case 'summary':      handlers.onSummary?.(msg);      break
        case 'action_item':  handlers.onActionItem?.(msg);   break
        case 'decision':     handlers.onDecision?.(msg);     break
        case 'open_question':handlers.onOpenQuestion?.(msg); break
        case 'drift_nudge':  handlers.onDriftNudge?.(msg);   break
        case 'pong':         break
        default:             break
      }
    }

    ws.onerror = (e) => handlers.onError?.(e)
    ws.onclose = () => {
      handlers.onClose?.()
      clearInterval(pingTimerRef.current)
      clearInterval(behaviorTimerRef.current)
    }
  }, [sessionId, handlers, send])

  const disconnect = useCallback(() => {
    clearInterval(pingTimerRef.current)
    clearInterval(behaviorTimerRef.current)
    wsRef.current?.close()
  }, [])

  // Track user behavior passively
  useEffect(() => {
    const b = behaviorRef.current

    const onKey = () => { b.lastKeypress = Date.now(); b.lastUiAction = Date.now() }
    const onMouse = (e) => {
      const dx = e.clientX - b.lastMouseX
      const dy = e.clientY - b.lastMouseY
      b.mouse_movement_delta += Math.sqrt(dx*dx + dy*dy) / 1000
      b.lastMouseX = e.clientX; b.lastMouseY = e.clientY
    }
    const onScroll = () => { b.scroll_activity += 1; b.lastUiAction = Date.now() }
    const onClick = () => { b.lastUiAction = Date.now() }

    window.addEventListener('keydown', onKey)
    window.addEventListener('mousemove', onMouse)
    window.addEventListener('scroll', onScroll)
    window.addEventListener('click', onClick)

    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('click', onClick)
    }
  }, [])

  return { connect, disconnect, sendAudioChunk }
}
