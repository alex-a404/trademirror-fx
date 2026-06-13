import { API_BASE, CAMPAIGN_FALLBACK } from './brokerConfig'
import { CopyBtn } from './BrokerPrimitives'

export default function CampaignSection({ group, sessionId, copiedKey, copy }) {
  const fb = CAMPAIGN_FALLBACK[group.dimension] || {}
  const cam = group.campaign || {}

  const subject = cam.email_subject || fb.email_subject || ''
  const body = cam.email_body || fb.email_body || ''
  const notification = cam.notification || fb.notification || ''
  const talkingPts = cam.talking_points || fb.talking_points || ''

  const allText = [
    `EMAIL SUBJECT: ${subject}`,
    `\nEMAIL BODY:\n${body}`,
    `\nIN-APP NOTIFICATION: ${notification}`,
    talkingPts ? `\nTALKING POINTS:\n${talkingPts}` : '',
  ].join('\n')

  const sid = sessionId || 'demo'

  return (
    <div>
      <div className="mb-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
        <div className="mb-2 flex items-start justify-between">
          <span className="text-[10px] uppercase tracking-wide text-gray-400">Email</span>
          <CopyBtn
            text={`Subject: ${subject}\n\n${body}`}
            id={`email-${group.dimension}`}
            copiedKey={copiedKey}
            onCopy={copy}
          />
        </div>
        <div className="mb-1.5 text-[12px] font-medium text-gray-900">{subject}</div>
        <p className="line-clamp-3 text-[11px] leading-relaxed text-gray-500">{body}</p>
      </div>

      <div className="mb-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wide text-gray-400">
            In-app notification
          </span>
          <CopyBtn
            text={notification}
            id={`notif-${group.dimension}`}
            copiedKey={copiedKey}
            onCopy={copy}
          />
        </div>
        <p className="text-[11px] text-gray-500">{notification}</p>
      </div>

      {talkingPts && (
        <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Account manager talking points
          </div>
          <div className="space-y-1.5">
            {talkingPts.split('\n').filter(Boolean).map((line, i) => (
              <div key={i} className="flex gap-2 text-[11px] text-gray-500">
                <span className="mt-px shrink-0 text-gray-300">·</span>
                <span>{line.replace(/^[·\-*•]\s*/, '')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <a
          href={`${API_BASE}/broker/export/${sid}/${group.dimension}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[12px] text-gray-600 transition-colors hover:bg-gray-50"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export {group.client_count} {group.client_count === 1 ? 'client' : 'clients'}
        </a>
        <CopyBtn
          text={allText}
          id={`all-${group.dimension}`}
          copiedKey={copiedKey}
          onCopy={copy}
          label="Copy all campaign content"
          className="px-3 py-2 text-[12px]"
        />
      </div>
    </div>
  )
}
