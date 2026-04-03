function formatTime(seconds) {
  const m = Math.floor((seconds || 0) / 60)
  const s = Math.floor((seconds || 0) % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function parseBullets(text) {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('-') || l.startsWith('•'))
    .map(l => l.replace(/^[-•]\s*/, ''))
}

export function SummaryCard({ summary }) {
  const bullets = parseBullets(summary.text || '')

  return (
    <div className="card animate-slide-in border-brand-600/30 bg-brand-600/5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-brand-400 uppercase tracking-wider">
          Summary
        </span>
        <span className="text-xs text-gray-600">{formatTime(summary.timestamp)}</span>
      </div>
      {bullets.length > 0 ? (
        <ul className="space-y-1.5">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-300">
              <span className="text-brand-400 mt-0.5 shrink-0">–</span>
              <span className="leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{summary.text}</p>
      )}
    </div>
  )
}

export function SummaryList({ summaries }) {
  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-2">
        <span className="text-2xl">📋</span>
        <p className="text-sm">Summaries appear every ~150 words of discussion</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
      {summaries.map(s => <SummaryCard key={s.id} summary={s} />)}
    </div>
  )
}
