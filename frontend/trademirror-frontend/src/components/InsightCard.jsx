export const METRIC_CONFIG = {
  emotional_chain_rate: {
    label: 'Post-loss trading',
    format: (v) => `${(v * 100).toFixed(0)}%`,
    status: (v) => (v > 0.35 ? 'critical' : v > 0.10 ? 'watch' : 'good'),
  },
  sizing_cv: {
    label: 'Sizing consistency',
    format: (v) => v.toFixed(2),
    status: (v) => (v > 0.50 ? 'critical' : v > 0.25 ? 'watch' : 'good'),
  },
  patience_ratio: {
    label: 'Patience ratio',
    format: (v) => (v != null ? v.toFixed(2) : '—'),
    status: (v) => (v == null ? 'watch' : v < 0.5 ? 'critical' : v < 0.8 ? 'watch' : 'good'),
  },
  session_variance: {
    label: 'Session variance',
    format: (v) => v.toFixed(2),
    status: (v) => (v > 0.35 ? 'critical' : v > 0.20 ? 'watch' : 'good'),
  },
  trade_frequency: {
    label: 'Trade frequency',
    format: (v) => `${v.toFixed(1)}/day`,
    status: (v) => (v > 15 ? 'watch' : 'good'),
  },
}

export const STATUS_STYLES = {
  critical: {
    badge: 'bg-red-50 text-red-700',
    value: 'text-red-600',
    ring: 'ring-1 ring-red-200',
    label: 'Critical',
  },
  watch: {
    badge: 'bg-amber-50 text-amber-700',
    value: '',
    ring: '',
    label: 'Watch',
  },
  good: {
    badge: 'bg-emerald-50 text-emerald-700',
    value: '',
    ring: '',
    label: 'Normal',
  },
}

export const FLAG_CONFIG = {
  post_loss: { label: 'Post-loss', cls: 'bg-amber-50 text-amber-700' },
  oversized: { label: 'Oversized', cls: 'bg-red-50 text-red-700' },
  early_exit: { label: 'Early exit', cls: 'bg-blue-50 text-blue-700' },
}

export const AUTOPSY_FALLBACK = {
  post_loss:
    'This trade was opened shortly after a closing loss. Entering the market quickly after a loss is associated with reactive rather than planned decision-making.',
  oversized:
    'This trade used significantly more volume than usual and closed at a loss. Oversized entries on losing trades are the most damaging pattern in this data.',
  early_exit:
    'This winning trade was closed well before reaching its potential. The position was moving correctly but was exited early.',
}

export function StatusBadge({ status }) {
  const s = STATUS_STYLES[status]
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${s.badge}`}>
      {s.label}
    </span>
  )
}

export function FlagBadge({ flag }) {
  const cfg = FLAG_CONFIG[flag]
  if (!cfg) return null
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

export default function InsightCard({ label, value, status }) {
  const styles = STATUS_STYLES[status]

  return (
    <div className={`rounded-xl bg-gray-50 p-3 ${styles.ring}`}>
      <div className="mb-1 text-[11px] leading-snug text-gray-500">{label}</div>
      <div className={`mb-2 text-xl font-medium ${styles.value}`}>{value}</div>
      <StatusBadge status={status} />
    </div>
  )
}
