import { useRef, useState, useCallback } from 'react'

const CHUNK_INTERVAL_MS = 5000 // send audio every 5 seconds

export function useMicrophone(onChunk) {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState(null)
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)
  const chunksRef = useRef([])

  const start = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })
      streamRef.current = stream

      const getMimeType = () => {
        return MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      }

      const createRecorder = () => {
        const recorder = new MediaRecorder(stream, { mimeType: getMimeType() })
        const localChunks = []
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) localChunks.push(e.data)
        }
        recorder.onstop = async () => {
          if (localChunks.length === 0) return
          const blob = new Blob(localChunks, { type: recorder.mimeType })
          const buffer = await blob.arrayBuffer()
          const bytes = new Uint8Array(buffer)
          const b64 = btoa(String.fromCharCode(...bytes))
          onChunk(b64)
        }
        return recorder
      }

      mediaRecorderRef.current = createRecorder()
      mediaRecorderRef.current.start()

      intervalRef.current = setInterval(() => {
        const oldRecorder = mediaRecorderRef.current
        if (oldRecorder && oldRecorder.state === 'recording') {
          oldRecorder.stop()
        }
        mediaRecorderRef.current = createRecorder()
        mediaRecorderRef.current.start()
      }, CHUNK_INTERVAL_MS)

      setIsRecording(true)
    } catch (err) {
      setError(err.message || 'Microphone access denied')
    }
  }, [onChunk])

  const stop = useCallback(() => {
    clearInterval(intervalRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
    chunksRef.current = []
    setIsRecording(false)
  }, [])

  return { isRecording, error, start, stop }
}
