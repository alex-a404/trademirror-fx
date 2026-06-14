import { dimCfg, getCourse } from './brokerConfig'

export function DimensionBadge({ dimension, label, count }) {
  const cfg = dimCfg(dimension)
  return (
    <span
      className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium ${cfg.badge}`}
    >
      {label || dimension}
      {count != null ? ` · ${count}` : ''}
    </span>
  )
}

export function CopyBtn({
  text,
  id,
  copiedKey,
  onCopy,
  label = 'Copy',
  className = '',
}) {
  const done = copiedKey === id
  return (
    <button
      type="button"
      onClick={() => onCopy(id, text)}
      className={`flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-500 transition-all hover:bg-gray-50 active:scale-95 ${className}`}
    >
      {done ? (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {label}
        </>
      )}
    </button>
  )
}

export function ConcernBar({ value }) {
  const pct = Math.min(Math.round((value / 3) * 100), 100)
  const color = value >= 2 ? '#ef4444' : value >= 1.5 ? '#f59e0b' : '#9ca3af'
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-7 text-right text-[11px] tabular-nums text-gray-500">
        {value.toFixed(1)}
      </span>
    </div>
  )
}

export function CourseCard({ courseId }) {
  const course = getCourse(courseId)

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300">
      <a
        href={course.url}
        target="_blank"
        rel="noreferrer"
        className="mb-1 block text-[12px] font-medium leading-snug text-slate-900 hover:text-slate-700"
      >
        {course.title}
      </a>
      <div className="text-[11px] leading-relaxed text-slate-500">{course.description}</div>
      {course.duration && (
        <div className="mt-2 text-[10px] text-slate-400">{course.duration}</div>
      )}
      <a
        href={course.url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 transition-colors hover:text-slate-800"
      >
        Open in Academy
        <span aria-hidden="true">→</span>
      </a>
    </div>
  )
}
