import { useCallback, useRef } from 'react'
import { useMeeting } from './hooks/useMeeting'
import { useWebSocket } from './hooks/useWebSocket'
import { useMicrophone } from './hooks/useMicrophone'
import { startSession, endSession, getDigest } from './utils/api'
import { MeetingRoom } from './components/MeetingRoom'
import { PostMeetingDigest } from './components/PostMeetingDigest'

import { motion, AnimatePresence } from 'framer-motion'

function LandingPage({ onStart, loading, error }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  }

  return (
    <motion.div 
      className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 relative overflow-hidden"
      initial="hidden" animate="show" exit="exit" variants={containerVariants}
    >
      {/* Ambient background glowing orbs */}
      <div className="ambient-blob bg-brand-600/30 w-[400px] h-[400px] top-[-10%] left-[-10%]" />
      <div className="ambient-blob bg-purple-600/20 w-[500px] h-[500px] bottom-[-10%] right-[-10%]" style={{ animationDelay: '-10s' }} />

      <motion.div className="max-w-md w-full text-center space-y-8 relative z-10 glass-panel p-8 rounded-3xl" variants={itemVariants}>
        {/* Logo */}
        <motion.div className="space-y-4" variants={itemVariants}>
          <motion.div 
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center
                       text-4xl font-extrabold text-white mx-auto shadow-xl shadow-brand-600/30 ring-1 ring-white/20"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            F
          </motion.div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            FocusFlow
          </h1>
          <p className="text-gray-300 text-base leading-relaxed font-medium">
            AI-powered meeting support for neurodiverse professionals.
            <span className="block text-gray-500 font-normal mt-1">Real-time summaries, action items, and silent Q&A.</span>
          </p>
        </motion.div>

        {/* Feature pills */}
        <motion.div className="flex flex-wrap gap-2.5 justify-center" variants={itemVariants}>
          {[
            '🎙️ Live transcription', '📋 Rolling summaries', '✅ Action items', '🔔 Drift nudges', '💬 Ask anything'
          ].map((f, i) => (
            <motion.span 
              key={f} 
              className="text-xs bg-white/5 border border-white/10 text-gray-300 px-3 py-1.5 rounded-full"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + (i * 0.05) }}
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              {f}
            </motion.span>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div variants={itemVariants} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={onStart}
            disabled={loading}
            className="btn-primary w-full py-4 text-lg rounded-2xl justify-center font-bold tracking-wide group"
          >
            {loading ? (
              <span className="flex items-center gap-3 justify-center">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Initializing Models...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Start Session
                <motion.span 
                  className="inline-block"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >→</motion.span>
              </span>
            )}
          </button>

          <p className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Private & Offline
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export default function App() {
  const meeting = useMeeting()
  const startErrorRef = useRef(null)

  // WebSocket handlers
  const wsHandlers = {
    onOpen:        () => meeting.setStatus('active'),
    onTranscript:  (msg) => meeting.addTranscriptLine(msg),
    onSummary:     (msg) => meeting.addSummary(msg),
    onActionItem:  (msg) => meeting.addActionItem(msg),
    onDecision:    (msg) => meeting.addDecision(msg),
    onOpenQuestion:(msg) => meeting.addOpenQuestion(msg),
    onDriftNudge:  (msg) => meeting.showDriftNudge(msg),
    onClose:       () => {},
    onError:       (e) => console.error('WS error', e),
  }

  const { connect, disconnect, sendAudioChunk } = useWebSocket(
    meeting.sessionId,
    wsHandlers,
  )

  const { isRecording, error: micError, start: startMic, stop: stopMic } = useMicrophone(sendAudioChunk)

  const handleStart = useCallback(async () => {
    meeting.setStatus('connecting')
    try {
      const { session_id } = await startSession()
      meeting.setSessionId(session_id)
      connect(session_id)
      await startMic()
    } catch (err) {
      console.error(err)
      meeting.setStatus('idle')
    }
  }, [meeting, connect, startMic])

  const handleToggleRecording = useCallback(() => {
    if (isRecording) stopMic()
    else startMic()
  }, [isRecording, startMic, stopMic])

  const handleEndMeeting = useCallback(async () => {
    stopMic()
    disconnect()
    meeting.setStatus('ended')
    try {
      const digestData = await getDigest(meeting.sessionId)
      meeting.setDigest(digestData)
      await endSession(meeting.sessionId)
    } catch (err) {
      console.error('Error getting digest', err)
      meeting.setDigest({ digest: 'Could not generate digest.', action_items: [], decisions: [], open_questions: [] })
    }
  }, [stopMic, disconnect, meeting])

  const handleRestart = useCallback(() => {
    meeting.reset()
  }, [meeting])

  return (
    <AnimatePresence mode="wait">
      {meeting.status === 'ended' || meeting.digest ? (
        <PostMeetingDigest key="post" digest={meeting.digest} onRestart={handleRestart} />
      ) : meeting.status === 'idle' || meeting.status === 'connecting' ? (
        <LandingPage key="landing" onStart={handleStart} loading={meeting.status === 'connecting'} error={micError} />
      ) : (
        <motion.div key="meeting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <MeetingRoom
            sessionId={meeting.sessionId}
            isRecording={isRecording}
            transcript={meeting.transcript}
            summaries={meeting.summaries}
            actionItems={meeting.actionItems}
            decisions={meeting.decisions}
            openQuestions={meeting.openQuestions}
            driftNudge={meeting.driftNudge}
            qaHistory={meeting.qaHistory}
            dyslexiaMode={meeting.dyslexiaMode}
            onToggleDyslexia={() => meeting.setDyslexiaMode(d => !d)}
            onToggleRecording={handleToggleRecording}
            onEndMeeting={handleEndMeeting}
            onAnswer={meeting.addQA}
            onDismissNudge={() => meeting.showDriftNudge(null)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
