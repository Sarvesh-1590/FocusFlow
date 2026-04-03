import { useState, useCallback } from 'react'
import { TranscriptPanel } from './TranscriptPanel'
import { SummaryList } from './SummaryCard'
import { ActionSidebar } from './ActionSidebar'
import { QAPanel } from './QAPanel'
import { DriftNudge } from './DriftNudge'
import { motion, AnimatePresence } from 'framer-motion'

const TABS = [
  { id: 'transcript', label: 'Transcript' },
  { id: 'summaries',  label: 'Summaries' },
  { id: 'actions',    label: 'Actions' },
  { id: 'qa',         label: 'Ask' },
]

function RecordingPulse({ isRecording }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`} />
      <span className="text-xs text-gray-500 font-medium tracking-wide">{isRecording ? 'RECORDING' : 'PAUSED'}</span>
    </div>
  )
}

export function MeetingRoom({
  sessionId,
  isRecording,
  transcript,
  summaries,
  actionItems,
  decisions,
  openQuestions,
  driftNudge,
  qaHistory,
  dyslexiaMode,
  onToggleDyslexia,
  onToggleRecording,
  onEndMeeting,
  onAnswer,
  onDismissNudge,
}) {
  const [activeTab, setActiveTab] = useState('transcript')

  const totalItems = actionItems.length + decisions.length + openQuestions.length

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  }

  return (
    <div className={`min-h-screen bg-gray-950 flex flex-col relative ${dyslexiaMode ? 'font-dyslexic' : ''}`}>
      {/* Background Ambience */}
      <div className="ambient-blob bg-brand-900/10 w-[600px] h-[600px] top-[-20%] left-[20%]" />

      {/* Top bar (Glassmorphism) */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 backdrop-blur-2xl bg-black/40 z-40 shadow-xl">
        <div className="flex items-center gap-4">
          <motion.div 
            className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-base font-extrabold text-white shadow-lg shadow-brand-500/20"
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            F
          </motion.div>
          <span className="font-bold text-white tracking-wide">FocusFlow</span>
          <div className="h-4 w-px bg-white/10 mx-2" />
          <RecordingPulse isRecording={isRecording} />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleDyslexia}
            className={`text-xs px-4 py-2 rounded-xl transition-all font-medium ${
              dyslexiaMode
                ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/50'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Dyslexia mode
          </button>
          <button
            onClick={onToggleRecording}
            className={`btn text-xs px-4 py-2 rounded-xl ${
              isRecording
                ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                : 'btn-primary py-2'
            }`}
          >
            {isRecording ? 'Pause' : 'Resume'}
          </button>
          <button onClick={onEndMeeting} className="btn-danger text-xs px-4 py-2 rounded-xl py-2">
            End meeting
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-white/5 px-8 flex gap-6 relative z-10 bg-black/20">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-2 py-4 text-sm font-semibold transition-colors ${
                isActive ? 'text-brand-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
              
              {/* Badges */}
              {tab.id === 'actions' && totalItems > 0 && (
                <span className="ml-2 text-[10px] bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full ring-1 ring-brand-500/30">
                  {totalItems}
                </span>
              )}
              {tab.id === 'summaries' && summaries.length > 0 && (
                <span className="ml-2 text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">
                  {summaries.length}
                </span>
              )}

              {/* Animated active underline */}
              {isActive && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-400 rounded-t-full shadow-[0_-2px_10px_rgba(167,139,250,0.5)]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <main className="flex-1 px-8 py-8 max-w-5xl mx-auto w-full relative z-10 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            {activeTab === 'transcript' && <TranscriptPanel transcript={transcript} />}
            {activeTab === 'summaries' && <SummaryList summaries={summaries} />}
            {activeTab === 'actions' && (
              <ActionSidebar actionItems={actionItems} decisions={decisions} openQuestions={openQuestions} />
            )}
            {activeTab === 'qa' && (
              <QAPanel sessionId={sessionId} qaHistory={qaHistory} onAnswer={onAnswer} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Drift nudge */}
      <DriftNudge nudge={driftNudge} onDismiss={onDismissNudge} />
    </div>
  )
}
