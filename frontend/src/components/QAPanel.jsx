import { useState, useRef, useEffect } from 'react'
import { askQuestion } from '../utils/api'

export function QAPanel({ sessionId, qaHistory, onAnswer }) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const historyRef = useRef(null)

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: 'smooth' })
  }, [qaHistory])

  const handleAsk = async (e) => {
    e.preventDefault()
    const q = question.trim()
    if (!q || !sessionId || loading) return
    setQuestion('')
    setLoading(true)
    setError(null)
    try {
      const res = await askQuestion(sessionId, q)
      onAnswer(q, res.answer)
    } catch {
      setError('Could not get an answer. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full relative">
      {/* Ambient background glow for the panel */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none rounded-3xl" />

      {/* History */}
      <div ref={historyRef} className="flex-1 space-y-6 overflow-y-auto max-h-[500px] min-h-[200px] pr-2 pb-4 relative z-10">
        {qaHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(var(--brand-500),0.1)]">
              <span className="text-2xl">✨</span>
            </div>
            <p className="text-sm text-center font-medium text-gray-400">
              Ask me anything about this meeting.<br />
              <span className="text-xs text-gray-500 font-normal mt-1 block">Try "What did we just decide?"</span>
            </p>
          </div>
        ) : (
          qaHistory.map(item => (
            <div key={item.id} className="animate-slide-in space-y-3">
              <div className="flex justify-end">
                <div className="bg-gradient-to-br from-brand-600 to-indigo-700 shadow-lg shadow-brand-600/20 
                                border border-white/10 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]">
                  <p className="text-sm text-white font-medium">{item.question}</p>
                </div>
              </div>
              <div className="flex justify-start gap-2 items-end">
                <div className="w-6 h-6 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center shrink-0 mb-1">
                  <span className="text-[10px]">AI</span>
                </div>
                <div className="glass-panel rounded-2xl rounded-bl-sm px-4 py-3 max-w-[85%] relative overflow-hidden group hover:border-white/20 transition-colors">
                  <div className="absolute inset-0 bg-brand-500/5 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <p className="text-sm text-gray-200 leading-relaxed relative z-10 whitespace-pre-wrap">{item.answer}</p>
                </div>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start gap-2 items-end animate-fade-in">
            <div className="w-6 h-6 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center shrink-0 mb-1">
              <span className="text-[10px]">AI</span>
            </div>
            <div className="glass-panel rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center h-5">
                <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="glass-panel !bg-red-500/10 !border-red-500/30 px-3 py-2 rounded-xl text-xs text-red-400 mx-2 text-center">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleAsk} className="relative z-10 mt-auto">
        <div className="glass-panel rounded-2xl flex p-1.5 focus-within:border-brand-500/50 focus-within:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all">
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            disabled={!sessionId || loading}
            className="flex-1 bg-transparent px-4 py-2
                       text-sm text-gray-200 placeholder-gray-500
                       focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!question.trim() || !sessionId || loading}
            className="btn-primary !px-4 !rounded-xl shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
