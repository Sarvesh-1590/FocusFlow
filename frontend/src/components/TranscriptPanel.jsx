import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function TranscriptPanel({ transcript }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  if (transcript.length === 0) {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center h-64 text-gray-500 gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-600/10 to-transparent" />
          <span className="text-3xl relative z-10 animate-pulse">🎙️</span>
        </div>
        <p className="text-sm font-medium tracking-wide">Transcript will appear here once the meeting starts</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 pb-12 custom-scrollbar">
      <AnimatePresence initial={false}>
        {transcript.map((line) => (
          <motion.div 
            key={line.id} 
            className="flex gap-4 group"
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <span className="text-xs text-gray-500/50 mt-1.5 shrink-0 w-12 text-right font-mono tracking-wider">
              {formatTime(line.timestamp || 0)}
            </span>
            <div className="glass-panel p-4 rounded-2xl rounded-tl-sm flex-1 border-white/5 transition-colors hover:border-white/10 hover:bg-white/[0.03]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-500" />
                <span className="text-[11px] font-bold text-brand-400 uppercase tracking-wider">
                  {line.speaker || 'Speaker'}
                </span>
              </div>
              <span className="text-[15px] text-gray-200 leading-relaxed font-medium block">
                {line.text}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} className="h-4" />
    </div>
  )
}
