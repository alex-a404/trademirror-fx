import { useState, useEffect, useCallback } from 'react'

const API_BASE = 'http://localhost:8000'

// ─── Course catalog ────────────────────────────────────────────────────────────
// Maps course IDs from the backend to human-readable titles and descriptions.

const COURSE_CATALOG = {
  course_exit_management_1: {
    title: 'Exit management masterclass',
    description: 'Techniques for holding winning positions longer and cutting losses efficiently.',
    duration: '4 modules · 45 min',
  },
  course_letting_winners_run_1: {
    title: 'Taking profits: timing your exits',
    description: 'When to exit, how to set targets, and why most traders leave gains on the table.',
    duration: '3 modules · 30 min',
  },
  course_post_loss_1: {
    title: 'Trading psychology: after a loss',
    description: 'How to manage decision-making after a difficult trade.',
    duration: '3 modules · 35 min',
  },
  course_trading_psychology_1: {
    title: 'Building a pre-trade routine',
    description: 'Structure your sessions to reduce emotional re-entry.',
    duration: '2 modules · 25 min',
  },
  course_position_sizing_1: {
    title: 'Position sizing fundamentals',
    description: 'Risk-based lot sizing and why consistency protects capital.',
    duration: '3 modules · 40 min',
  },
  course_risk_management_1: {
    title: 'Risk management for retail traders',
    description: 'Stop-loss placement, position limits, and protecting your account.',
    duration: '4 modules · 50 min',
  },
  course_session_awareness_1: {
    title: 'Understanding market sessions',
    description: 'How London, New York, and Asia hours differ and what that means for your strategy.',
    duration: '3 modules · 40 min',
  },
  course_market_hours_1: {
    title: 'Session timing for retail traders',
    description: 'Matching your trading approach to the right market conditions.',
    duration: '2 modules · 20 min',
  },
  course_trading_discipline_1: {
    title: 'Trading discipline and patience',
    description: 'Quality over quantity: why fewer, higher-conviction trades improve results.',
    duration: '3 modules · 35 min',
  },
  course_overtrading_1: {
    title: 'Recognising overtrading patterns',
    description: 'Signs that trade frequency is hurting performance and how to recalibrate.',
    duration: '2 modules · 25 min',
  },
}

// ─── Campaign fallbacks ────────────────────────────────────────────────────────
// Pre-written campaigns for each behavioral dimension.
// Used when Bedrock hasn't yet populated the backend fields.

const CAMPAIGN_FALLBACK = {
  patience_ratio: {
    email_subject: 'Something we noticed in your trading data',
    email_body:
      "We've been looking at patterns across our platform and noticed something in your recent activity worth sharing. Your winning trades tend to close significantly earlier than your losing ones — a very common pattern, but one that meaningfully affects returns over time. We've added a short course to your academy that addresses this directly.",
    notification: 'New insight about your exit timing is available in your academy',
    talking_points:
      '· Ask how they typically decide when to close a profitable trade\n· Introduce the disposition effect as a recognised pattern, not a criticism\n· Point to the Exit Management Masterclass as a practical next step',
  },
  emotional_chain_rate: {
    email_subject: 'A quick observation about your trading rhythm',
    email_body:
      "We noticed a pattern in your recent trading: there's sometimes a tendency to re-enter the market quickly after a loss. It's a very human response — the desire to recover. We've added a short resource to your academy specifically about managing decision-making after a difficult trade.",
    notification: 'New insight about your trading rhythm after losses is available',
    talking_points:
      '· Ask how they typically feel and act after a losing trade\n· Introduce the concept of emotional re-entry without being critical\n· Point to the trading psychology course in the academy',
  },
  session_variance: {
    email_subject: 'Your best trading session might surprise you',
    email_body:
      "Looking at your trading data, there's a noticeable difference in how you perform across different market sessions. This is actually useful information — it suggests your strategy may suit certain market conditions better than others. We've put together a resource on session timing that you might find practical.",
    notification: 'Insight available: your performance varies significantly by trading session',
    talking_points:
      '· Ask which sessions they typically trade and why\n· Share that their data shows meaningful variation across sessions\n· Recommend the market sessions course in the academy',
  },
  sizing_cv: {
    email_subject: 'A note on your position sizes',
    email_body:
      "We've noticed that your position sizes vary quite a bit from trade to trade. Consistent sizing is one of the clearest signs of a disciplined approach — and one of the easiest improvements to make. We've added a short course on position sizing to your academy.",
    notification: 'New insight about your position sizing consistency is available',
    talking_points:
      '· Ask about their process for deciding position size before a trade\n· Discuss the value of risk-based sizing over intuition-based sizing\n· Point to the position sizing course in the academy',
  },
  trade_frequency: {
    email_subject: 'Something to consider about your trading pace',
    email_body:
      "Your trading data shows a higher trade frequency than most of your peers on our platform. There's nothing wrong with active trading, but we've found that traders who focus on higher-conviction setups tend to produce more consistent results. We've added a resource on trading discipline to your academy.",
    notification: 'Insight available about your trading frequency and discipline',
    talking_points:
      '· Ask about their process for selecting which setups to trade\n· Discuss the difference between activity and edge\n· Point to the trading discipline course in the academy',
  },
}

// ─── Dimension config ──────────────────────────────────────────────────────────

const DIMENSION_CONFIG = {
  patience_ratio:      { badge: 'bg-red-50 text-red-700',     dot: 'bg-red-400'    },
  emotional_chain_rate:{ badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400'  },
  session_variance:    { badge: 'bg-blue-50 text-blue-700',   dot: 'bg-blue-400'   },
  sizing_cv:           { badge: 'bg-purple-50 text-purple-700', dot: 'bg-purple-400'},
  trade_frequency:     { badge: 'bg-gray-100 text-gray-600',  dot: 'bg-gray-400'   },
}

function dimCfg(dimension) {
  return DIMENSION_CONFIG[dimension] || { badge: 'bg-gray-100 text-gray-500', dot: 'bg-gray-300' }
}

// ─── Copy hook ─────────────────────────────────────────────────────────────────

function useCopy() {
  const [copiedKey, setCopied] = useState(null)
  const copy = useCallback((key, text) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }, [])
  return { copiedKey, copy }
}

// ─── Small primitives ──────────────────────────────────────────────────────────

function DimensionBadge({ dimension, label, count }) {
  const cfg = dimCfg(dimension)
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md whitespace-nowrap ${cfg.badge}`}>
      {label || dimension}{count != null ? ` · ${count}` : ''}
    </span>
  )
}

function CopyBtn({ text, id, copiedKey, onCopy, label = 'Copy', className = '' }) {
  const done = copiedKey === id
  return (
    <button
      onClick={() => onCopy(id, text)}
      className={`flex items-center gap-1.5 text-[11px] border border-gray-200 rounded-md
                  text-gray-500 hover:bg-gray-50 active:scale-95 transition-all px-2.5 py-1.5 ${className}`}
    >
      {done ? (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          {label}
        </>
      )}
    </button>
  )
}

function ConcernBar({ value }) {
  const pct = Math.min(Math.round((value / 3) * 100), 100)
  const color = value >= 2 ? '#ef4444' : value >= 1.5 ? '#f59e0b' : '#9ca3af'
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] text-gray-500 tabular-nums w-7 text-right">
        {value.toFixed(1)}
      </span>
    </div>
  )
}

// ─── Course card ───────────────────────────────────────────────────────────────

function CourseCard({ courseId }) {
  const course = COURSE_CATALOG[courseId] || {
    title: courseId.replace(/_/g, ' '),
    description: 'Available in the academy.',
    duration: '',
  }
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <div className="text-[12px] font-medium text-gray-900 mb-1 leading-snug">{course.title}</div>
      <div className="text-[11px] text-gray-500 leading-relaxed">{course.description}</div>
      {course.duration && (
        <div className="text-[10px] text-gray-400 mt-2">{course.duration}</div>
      )}
    </div>
  )
}

// ─── Campaign section ──────────────────────────────────────────────────────────

function CampaignSection({ group, sessionId, copiedKey, copy }) {
  const fb  = CAMPAIGN_FALLBACK[group.dimension] || {}
  const cam = group.campaign || {}

  const subject      = cam.email_subject  || fb.email_subject  || ''
  const body         = cam.email_body     || fb.email_body     || ''
  const notification = cam.notification   || fb.notification   || ''
  const talkingPts   = cam.talking_points || fb.talking_points || ''

  const allText = [
    `EMAIL SUBJECT: ${subject}`,
    `\nEMAIL BODY:\n${body}`,
    `\nIN-APP NOTIFICATION: ${notification}`,
    talkingPts ? `\nTALKING POINTS:\n${talkingPts}` : '',
  ].join('\n')

  const sid = sessionId || 'demo'

  return (
    <div>
      {/* Email */}
      <div className="bg-gray-50 rounded-lg p-3 mb-2 border border-gray-100">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] uppercase tracking-wide text-gray-400">Email</span>
          <CopyBtn
            text={`Subject: ${subject}\n\n${body}`}
            id={`email-${group.dimension}`}
            copiedKey={copiedKey}
            onCopy={copy}
          />
        </div>
        <div className="text-[12px] font-medium text-gray-900 mb-1.5">{subject}</div>
        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-3">{body}</p>
      </div>

      {/* Notification */}
      <div className="bg-gray-50 rounded-lg p-3 mb-2 border border-gray-100">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] uppercase tracking-wide text-gray-400">In-app notification</span>
          <CopyBtn
            text={notification}
            id={`notif-${group.dimension}`}
            copiedKey={copiedKey}
            onCopy={copy}
          />
        </div>
        <p className="text-[11px] text-gray-500">{notification}</p>
      </div>

      {/* Talking points */}
      {talkingPts && (
        <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
          <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">
            Account manager talking points
          </div>
          <div className="space-y-1.5">
            {talkingPts.split('\n').filter(Boolean).map((line, i) => (
              <div key={i} className="flex gap-2 text-[11px] text-gray-500">
                <span className="text-gray-300 shrink-0 mt-px">·</span>
                <span>{line.replace(/^[·\-\*•]\s*/, '')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <a
          href={`${API_BASE}/broker/export/${sid}/${group.dimension}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-[12px] border border-gray-200 rounded-lg
                     px-3 py-2 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export {group.client_count} {group.client_count === 1 ? 'client' : 'clients'}
        </a>
        <CopyBtn
          text={allText}
          id={`all-${group.dimension}`}
          copiedKey={copiedKey}
          onCopy={copy}
          label="Copy all campaign content"
          className="text-[12px] px-3 py-2"
        />
      </div>
    </div>
  )
}

// ─── Group card ────────────────────────────────────────────────────────────────

function GroupCard({ group, isExpanded, onToggle, sessionId, copiedKey, copy }) {
  const cfg = dimCfg(group.dimension)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-2">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center px-4 py-3.5 text-left
                   hover:bg-gray-50 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-medium text-gray-900">{group.display_name}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${cfg.badge}`}>
            {group.client_count} {group.client_count === 1 ? 'client' : 'clients'}
          </span>
        </div>
        <span className="text-[11px] text-gray-300">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 px-4 pb-4">

          {/* Behavioral description */}
          <p className="text-[12px] text-gray-500 leading-relaxed mt-3 mb-4">
            {group.behavioral_description}
          </p>

          {/* Recommended courses */}
          {group.recommended_course_ids?.length > 0 && (
            <>
              <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-2">
                Recommended courses
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {group.recommended_course_ids.slice(0, 2).map(id => (
                  <CourseCard key={id} courseId={id} />
                ))}
              </div>
            </>
          )}

          {/* Campaign */}
          <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-2">
            Campaign
          </div>
          <CampaignSection
            group={group}
            sessionId={sessionId}
            copiedKey={copiedKey}
            copy={copy}
          />
        </div>
      )}
    </div>
  )
}

// ─── Clients table ─────────────────────────────────────────────────────────────

function ClientsTable({ clientSignals, noSignalClients, excludedClients, onViewClient }) {
  const [filterDim, setFilterDim] = useState('all')
  const [sortField, setSortField] = useState('concern')

  // Build flat list — clientSignals already includes all clients
  const allRows = Object.entries(clientSignals).map(([id, s]) => ({ id, ...s }))

  // Dimensions that actually appear in results (for filter dropdown)
  const activeDimensions = [...new Set(
    allRows.map(r => r.primary_signal).filter(Boolean)
  )]

  // Filter
  const filtered = (() => {
    if (filterDim === 'all')       return allRows
    if (filterDim === '_nosignal') return allRows.filter(r => !r.primary_signal && r.sufficient_history)
    if (filterDim === '_excluded') return allRows.filter(r => !r.sufficient_history)
    return allRows.filter(r => r.primary_signal === filterDim)
  })()

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'concern') return (b.concern_strength || 0) - (a.concern_strength || 0)
    if (sortField === 'id')      return a.id.localeCompare(b.id)
    return 0
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
        <div className="text-sm font-medium text-gray-900">All clients</div>
        <div className="flex gap-2">
          <select
            value={filterDim}
            onChange={e => setFilterDim(e.target.value)}
            className="text-[11px] border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white"
          >
            <option value="all">All groups</option>
            {activeDimensions.map(d => (
              <option key={d} value={d}>
                {DIMENSION_CONFIG[d] ? d.replace(/_/g, ' ') : d}
              </option>
            ))}
            {noSignalClients?.length > 0 && (
              <option value="_nosignal">No signal</option>
            )}
            {excludedClients?.length > 0 && (
              <option value="_excluded">Excluded</option>
            )}
          </select>
          <select
            value={sortField}
            onChange={e => setSortField(e.target.value)}
            className="text-[11px] border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white"
          >
            <option value="concern">Sort: concern ↓</option>
            <option value="id">Sort: client ID</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '22%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2.5 text-left font-medium text-gray-500">Client ID</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-500">Primary signal</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-500">Concern</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-500">History</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No clients match this filter.
                </td>
              </tr>
            )}
            {sorted.map(client => {
              const dim = client.primary_signal
              const cfg = dim ? dimCfg(dim) : null
              const muted = !client.sufficient_history
              const displayName = client.display_name || (dim ? dim : 'No prominent signal')

              return (
                <tr
                  key={client.id}
                  className={`border-t border-gray-100 transition-colors ${
                    !muted ? 'hover:bg-gray-50' : ''
                  }`}
                >
                  <td className={`px-4 py-3 font-medium ${muted ? 'text-gray-400' : 'text-gray-900'}`}>
                    {client.id}
                  </td>
                  <td className="px-4 py-3">
                    {cfg ? (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${cfg.badge}`}>
                        {displayName}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400">{displayName}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {client.concern_strength > 0
                      ? <ConcernBar value={client.concern_strength} />
                      : <span className="text-gray-300 float-right pr-7">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-center">
                    {client.sufficient_history
                      ? <span className="text-emerald-500 text-[10px]">✓</span>
                      : <span className="text-[10px] text-gray-300">low</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    {client.sufficient_history && onViewClient && (
                      <button
                        onClick={() => onViewClient(client.id)}
                        className="text-gray-300 hover:text-gray-600 transition-colors text-sm"
                        aria-label={`View ${client.id}`}
                      >
                        →
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── BrokerAdmin (main export) ─────────────────────────────────────────────────

/**
 * BrokerAdmin — white-label broker intelligence dashboard.
 *
 * Props
 *   sessionId   string   Real session ID from POST /broker/upload.
 *                        If null, uses the pre-loaded demo session.
 *   brokerName  string   Broker brand name in the section header.
 *   onViewClient fn(id)  Called when the user drills into an individual client.
 */
export default function BrokerAdmin({
  sessionId   = null,
  brokerName  = 'Demo Broker',
  onViewClient = null,
}) {
  const [data,           setData]      = useState(null)
  const [loading,        setLoading]   = useState(true)
  const [error,          setError]     = useState(null)
  const [activeTab,      setActiveTab] = useState('groups')
  const [expandedGroups, setExpanded]  = useState(new Set())
  const { copiedKey, copy } = useCopy()

  useEffect(() => {
    const url = sessionId
      ? `${API_BASE}/broker/session/${sessionId}`
      : `${API_BASE}/demo/broker`

    fetch(url)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(d => {
        setData(d)
        setLoading(false)
        // Auto-expand the first group (sorted by client count descending by backend)
        if (d.groups?.length > 0) {
          setExpanded(new Set([d.groups[0].dimension]))
        }
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [sessionId])

  function toggleGroup(dimension) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(dimension) ? next.delete(dimension) : next.add(dimension)
      return next
    })
  }

  // ── Loading / error states ────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-sm text-gray-400">Loading client intelligence…</p>
    </div>
  )

  if (error || !data) return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <p className="text-sm text-red-500 mb-1">
          Could not load broker session{error ? ` (${error})` : ''}.
        </p>
        <p className="text-xs text-gray-400">Is the backend running at {API_BASE}?</p>
      </div>
    </div>
  )

  // ── Summary stats ─────────────────────────────────────────────────────────────

  const inGroups = data.groups.reduce((s, g) => s + g.client_count, 0)
  const noSignal = data.no_signal_clients?.length  ?? 0
  const excluded = data.excluded_clients?.length   ?? 0
  const total    = inGroups + noSignal + excluded

  const summaryCards = [
    { label: 'Clients processed',    value: total    },
    { label: 'In behavioral groups', value: inGroups },
    { label: 'No prominent signal',  value: noSignal },
    { label: 'Excluded',             value: excluded },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-5 py-6">

      {/* Section header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Client intelligence</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {total} clients · {data.groups.length} behavioral {data.groups.length === 1 ? 'group' : 'groups'} identified
          </p>
        </div>
        <span className="text-[10px] text-gray-300">Powered by TradeMirror</span>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {summaryCards.map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-3.5">
            <div className="text-[10px] text-gray-400 mb-1.5 leading-snug">{label}</div>
            <div className="text-[22px] font-medium text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-5">
        {[
          { id: 'groups',  label: 'Groups'  },
          { id: 'clients', label: 'Clients' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-[13px] px-4 pb-2.5 pt-0 border-b-2 transition-colors focus:outline-none ${
              activeTab === tab.id
                ? 'border-gray-900 font-medium text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Groups tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'groups' && (
        <div>
          {data.groups.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-400">
                No behavioral groups found.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                At least 3 clients with sufficient trade history are needed for population analysis.
              </p>
            </div>
          ) : (
            data.groups.map(group => (
              <GroupCard
                key={group.dimension}
                group={group}
                isExpanded={expandedGroups.has(group.dimension)}
                onToggle={() => toggleGroup(group.dimension)}
                sessionId={sessionId}
                copiedKey={copiedKey}
                copy={copy}
              />
            ))
          )}

          {/* No prominent signal */}
          {noSignal > 0 && (
            <div className="bg-gray-50 rounded-xl px-4 py-3.5 mt-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[13px] font-medium text-gray-700">
                    No prominent signal — {noSignal} {noSignal === 1 ? 'client' : 'clients'}
                  </span>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    No significant behavioral deviation detected. Standard engagement is appropriate.
                  </p>
                </div>
                <span className="text-[11px] text-gray-400 ml-4 shrink-0">
                  {data.no_signal_clients.join(', ')}
                </span>
              </div>
            </div>
          )}

          {/* Excluded */}
          {excluded > 0 && (
            <p className="text-[11px] text-gray-400 mt-3 px-1">
              {excluded} {excluded === 1 ? 'client' : 'clients'} excluded — insufficient trade history for population analysis
              ({data.excluded_clients.join(', ')}).
            </p>
          )}
        </div>
      )}

      {/* ── Clients tab ────────────────────────────────────────────────────────── */}
      {activeTab === 'clients' && (
        <ClientsTable
          clientSignals={data.client_signals}
          noSignalClients={data.no_signal_clients}
          excludedClients={data.excluded_clients}
          onViewClient={onViewClient}
        />
      )}

    </div>
  )
}
