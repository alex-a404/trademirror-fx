import {
  API_BASE,
  buildCampaignBodyWithCourses,
  buildCampaignMailto,
  getCampaignContent,
  groupClientEmails,
} from './brokerConfig'
import { CopyBtn } from './BrokerPrimitives'

function CampaignMailButton({ href, label, variant = 'outline' }) {
  if (!href) return null

  const styles =
    variant === 'primary'
      ? 'border-slate-300 bg-slate-800 text-white hover:border-slate-400 hover:bg-slate-900'
      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'

  return (
    <a href={href} className="shrink-0">
      <button
        type="button"
        className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors ${styles}`}
      >
        {label}
      </button>
    </a>
  )
}

export default function CampaignSection({ group, sessionId, copiedKey, copy }) {
  const { subject, body, notification, talking_points: talkingPts } = getCampaignContent(group)
  const emailBody = buildCampaignBodyWithCourses(body, group.recommended_course_ids)
  const groupEmails = groupClientEmails(group)
  const sendToAllHref = buildCampaignMailto(groupEmails, subject, emailBody)

  const allText = [
    `EMAIL SUBJECT: ${subject}`,
    `\nEMAIL BODY:\n${emailBody}`,
    `\nIN-APP NOTIFICATION: ${notification}`,
    talkingPts ? `\nTALKING POINTS:\n${talkingPts}` : '',
  ].join('\n')

  const sid = sessionId || 'demo'

  return (
    <div>
      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex items-start justify-between gap-3">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">Campaign email</span>
          <div className="flex shrink-0 items-center gap-2">
            <CopyBtn
              text={`Subject: ${subject}\n\n${emailBody}`}
              id={`email-${group.dimension}`}
              copiedKey={copiedKey}
              onCopy={copy}
            />
            <CampaignMailButton
              href={sendToAllHref}
              label={`Send to All (${groupEmails.length})`}
              variant="primary"
            />
          </div>
        </div>
        <div className="mb-1.5 text-[12px] font-medium text-slate-900">{subject}</div>
        <p className="whitespace-pre-line text-[11px] leading-relaxed text-slate-600">{emailBody}</p>
      </div>

      {group.client_ids?.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Recipients
          </div>
          <div className="space-y-2">
            {group.client_ids.map((id) => {
              const email = group.client_profiles?.[id]?.email
              const sendHref = email ? buildCampaignMailto(email, subject, emailBody) : null

              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-slate-900">{id}</div>
                    {email ? (
                      <div className="truncate text-[11px] text-slate-500">{email}</div>
                    ) : (
                      <div className="text-[11px] text-slate-400">No email on file</div>
                    )}
                  </div>

                  <CampaignMailButton href={sendHref} label="Send Campaign" />
                </div>
              )
            })}
          </div>
        </div>
      )}

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
