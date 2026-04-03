function formatTime(s) {
  const m = Math.floor((s || 0) / 60)
  const sec = Math.floor((s || 0) % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function ConfidencePip({ score }) {
  const pct = Math.round((score || 0) * 100)
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-gray-600'
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500">
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {pct}%
    </span>
  )
}

function ItemRow({ item, color, icon }) {
  return (
    <div className="flex gap-2 animate-slide-in">
      <span className="mt-0.5 text-base shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 leading-relaxed">{item.text}</p>
        <div className="flex items-center gap-3 mt-1">
          {item.speaker && (
            <span className={`text-xs font-medium ${color}`}>{item.speaker}</span>
          )}
          {item.timestamp > 0 && (
            <span className="text-xs text-gray-600">{formatTime(item.timestamp)}</span>
          )}
          <ConfidencePip score={item.confidence} />
        </div>
      </div>
    </div>
  )
}

function Section({ title, items, color, icon, emptyMsg }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{title}</h3>
        <span className="text-xs text-gray-600 ml-auto">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-600 pl-6">{emptyMsg}</p>
      ) : (
        <div className="space-y-3 pl-1">
          {items.map(item => (
            <ItemRow key={item.id} item={item} color={color} icon={icon} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ActionSidebar({ actionItems, decisions, openQuestions }) {
  return (
    <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1">
      <Section
        title="Action items"
        items={actionItems}
        color="text-green-400"
        icon="✅"
        emptyMsg="None detected yet"
      />
      <div className="border-t border-gray-800" />
      <Section
        title="Decisions"
        items={decisions}
        color="text-blue-400"
        icon="🔵"
        emptyMsg="None detected yet"
      />
      <div className="border-t border-gray-800" />
      <Section
        title="Open questions"
        items={openQuestions}
        color="text-yellow-400"
        icon="❓"
        emptyMsg="None detected yet"
      />
    </div>
  )
}
