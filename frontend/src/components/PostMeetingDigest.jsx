export function PostMeetingDigest({ digest, onRestart }) {
  if (!digest) return null

  const { digest: text, action_items = [], decisions = [], open_questions = [] } = digest

  const handleCopy = () => {
    const content = [
      '# FocusFlow Meeting Digest',
      '',
      text,
      '',
      '## Action Items',
      ...action_items.map(i => `- [${i.speaker || 'Unknown'}] ${i.text}`),
      '',
      '## Decisions',
      ...decisions.map(d => `- ${d.text}`),
      '',
      '## Open Questions',
      ...open_questions.map(q => `- ${q.text}`),
    ].join('\n')
    navigator.clipboard.writeText(content)
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 bg-green-500/10 border border-green-500/30 rounded-full
                          flex items-center justify-center text-3xl mx-auto mb-3">
            ✅
          </div>
          <h1 className="text-2xl font-semibold text-white">Meeting digest</h1>
          <p className="text-gray-500 text-sm">Your meeting summary is ready</p>
        </div>

        {/* Main digest */}
        <div className="card space-y-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Summary</h2>
          <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{text}</div>
        </div>

        {/* Action items */}
        {action_items.length > 0 && (
          <div className="card space-y-3">
            <h2 className="text-xs font-semibold text-green-400 uppercase tracking-wider">
              Action items ({action_items.length})
            </h2>
            <ul className="space-y-2">
              {action_items.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-green-400 shrink-0 mt-0.5">✅</span>
                  <div>
                    <span className="text-gray-200">{item.text}</span>
                    {item.speaker && (
                      <span className="text-xs text-green-400 ml-2">{item.speaker}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Decisions */}
        {decisions.length > 0 && (
          <div className="card space-y-3">
            <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Decisions ({decisions.length})
            </h2>
            <ul className="space-y-2">
              {decisions.map((d, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-blue-400 shrink-0 mt-0.5">🔵</span>
                  <span className="text-gray-200">{d.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Open questions */}
        {open_questions.length > 0 && (
          <div className="card space-y-3">
            <h2 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">
              Open questions ({open_questions.length})
            </h2>
            <ul className="space-y-2">
              {open_questions.map((q, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-yellow-400 shrink-0 mt-0.5">❓</span>
                  <span className="text-gray-200">{q.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-600 text-center">
            FocusFlow is an AI assistant. For important legal, medical, or contractual decisions,
            please verify with the relevant professionals.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button onClick={handleCopy} className="btn-ghost">
            Copy digest
          </button>
          <button onClick={onRestart} className="btn-primary">
            New meeting
          </button>
        </div>
      </div>
    </div>
  )
}
