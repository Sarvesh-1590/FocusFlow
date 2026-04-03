import { useState, useEffect } from 'react'

export function DriftNudge({ nudge, onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (nudge) {
      setVisible(true)
    }
  }, [nudge])

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(onDismiss, 300)
  }

  if (!nudge || !visible) return null

  const context = nudge.context || 'Meeting is in progress.'
  const prob = Math.round((nudge.drift_probability || 0) * 100)

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50 max-w-sm w-full
        bg-gray-900 border border-yellow-500/40 rounded-2xl p-4 shadow-2xl
        transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/30
                        flex items-center justify-center shrink-0 animate-pulse-soft">
          <span className="text-base">🔔</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-yellow-400 mb-1">
            Topic just changed
          </p>
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
            {context}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 rounded-full transition-all"
                style={{ width: `${prob}%` }}
              />
            </div>
            <span className="text-xs text-gray-600">drift {prob}%</span>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-600 hover:text-gray-400 text-lg leading-none ml-1 shrink-0"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}
