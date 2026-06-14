import { dimCfg } from './brokerConfig'
import { CourseCard } from './BrokerPrimitives'
import CampaignSection from './CampaignSection'

export default function GroupCard({
  group,
  isExpanded,
  onToggle,
  sessionId,
  copiedKey,
  copy,
}) {
  const cfg = dimCfg(group.dimension)

  return (
    <div className="mb-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-gray-50 focus:outline-none"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-medium text-gray-900">{group.display_name}</span>
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${cfg.badge}`}>
            {group.client_count} {group.client_count === 1 ? 'client' : 'clients'}
          </span>
        </div>
        <span className="text-[11px] text-gray-300">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          <p className="mb-4 mt-3 text-[12px] leading-relaxed text-gray-500">
            {group.behavioral_description}
          </p>

          {group.recommended_course_ids?.length > 0 && (
            <>
              <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                Recommended courses
              </div>
              <div className="mb-4 grid grid-cols-2 gap-2">
                {group.recommended_course_ids.slice(0, 2).map((id) => (
                  <CourseCard key={id} courseId={id} />
                ))}
              </div>
            </>
          )}

          <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Campaign outreach
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
