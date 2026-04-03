import { useState, useCallback } from 'react'

export function useMeeting() {
  const [sessionId, setSessionId] = useState(null)
  const [status, setStatus] = useState('idle') // idle | connecting | active | ended
  const [transcript, setTranscript] = useState([])
  const [summaries, setSummaries] = useState([])
  const [actionItems, setActionItems] = useState([])
  const [decisions, setDecisions] = useState([])
  const [openQuestions, setOpenQuestions] = useState([])
  const [driftNudge, setDriftNudge] = useState(null)
  const [qaHistory, setQaHistory] = useState([])
  const [digest, setDigest] = useState(null)
  const [dyslexiaMode, setDyslexiaMode] = useState(false)
  const [activeTab, setActiveTab] = useState('transcript')

  const addTranscriptLine = useCallback((entry) => {
    setTranscript(prev => [...prev, { ...entry, id: Date.now() + Math.random() }])
  }, [])

  const addSummary = useCallback((summary) => {
    setSummaries(prev => [...prev, { ...summary, id: Date.now() }])
  }, [])

  const addActionItem = useCallback((item) => {
    setActionItems(prev => [...prev, { ...item, id: Date.now() + Math.random() }])
  }, [])

  const addDecision = useCallback((item) => {
    setDecisions(prev => [...prev, { ...item, id: Date.now() + Math.random() }])
  }, [])

  const addOpenQuestion = useCallback((item) => {
    setOpenQuestions(prev => [...prev, { ...item, id: Date.now() + Math.random() }])
  }, [])

  const showDriftNudge = useCallback((nudge) => {
    setDriftNudge(nudge)
    setTimeout(() => setDriftNudge(null), 8000)
  }, [])

  const addQA = useCallback((question, answer) => {
    setQaHistory(prev => [...prev, { question, answer, id: Date.now() }])
  }, [])

  const reset = useCallback(() => {
    setSessionId(null)
    setStatus('idle')
    setTranscript([])
    setSummaries([])
    setActionItems([])
    setDecisions([])
    setOpenQuestions([])
    setDriftNudge(null)
    setQaHistory([])
    setDigest(null)
  }, [])

  return {
    sessionId, setSessionId,
    status, setStatus,
    transcript, addTranscriptLine,
    summaries, addSummary,
    actionItems, addActionItem,
    decisions, addDecision,
    openQuestions, addOpenQuestion,
    driftNudge, showDriftNudge,
    qaHistory, addQA,
    digest, setDigest,
    dyslexiaMode, setDyslexiaMode,
    activeTab, setActiveTab,
    reset,
  }
}
