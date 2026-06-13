const STATUS_TEXT_CLASSES = {
  green: 'text-emerald-500',
  amber: 'text-amber-500',
  red: 'text-rose-500',
}

export default function InsightCard({ title, value, statusColor, insight }) {
  const valueColorClass = STATUS_TEXT_CLASSES[statusColor] ?? 'text-slate-900'

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className={`mt-2 text-3xl font-bold ${valueColorClass}`}>{value}</p>

      <p className="mt-4 text-sm font-medium leading-relaxed text-slate-900">
        {insight}
      </p>
    </article>
  )
}
