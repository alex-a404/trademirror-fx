export const API_BASE = 'http://localhost:8000'
export const ACADEMY_BASE = 'https://academy.vertexfx.demo'

export const COURSE_CATALOG = {
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

export const CAMPAIGN_FALLBACK = {
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

export const DIMENSION_CONFIG = {
  patience_ratio: { badge: 'bg-red-50 text-red-700', dot: 'bg-red-400' },
  emotional_chain_rate: { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400' },
  session_variance: { badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-400' },
  sizing_cv: { badge: 'bg-purple-50 text-purple-700', dot: 'bg-purple-400' },
  trade_frequency: { badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
}

export function dimCfg(dimension) {
  return (
    DIMENSION_CONFIG[dimension] || { badge: 'bg-gray-100 text-gray-500', dot: 'bg-gray-300' }
  )
}

export function getCourseUrl(courseId) {
  return `${ACADEMY_BASE}/courses/${courseId}`
}

export function getCourse(courseId) {
  const entry = COURSE_CATALOG[courseId]
  if (entry) {
    return { ...entry, url: getCourseUrl(courseId) }
  }

  return {
    title: courseId.replace(/_/g, ' '),
    description: 'Available in the academy.',
    duration: '',
    url: getCourseUrl(courseId),
  }
}

export function formatCourseLinksBlock(courseIds) {
  if (!courseIds?.length) return ''

  const lines = courseIds.map((id) => {
    const course = getCourse(id)
    return `• ${course.title}: ${course.url}`
  })

  return `\n\nRecommended courses:\n${lines.join('\n')}`
}

export function buildCampaignBodyWithCourses(body, courseIds) {
  if (!body) return formatCourseLinksBlock(courseIds).trim()
  return `${body}${formatCourseLinksBlock(courseIds)}`
}

export function getCampaignContent(group) {
  const fb = CAMPAIGN_FALLBACK[group.dimension] || {}
  const cam = group.campaign || {}

  return {
    subject: cam.email_subject || fb.email_subject || '',
    body: cam.email_body || fb.email_body || '',
    notification: cam.notification || fb.notification || '',
    talking_points: cam.talking_points || fb.talking_points || '',
  }
}

export function groupClientEmails(group) {
  return (group.client_ids ?? [])
    .map((id) => group.client_profiles?.[id]?.email)
    .filter(Boolean)
}

export function buildCampaignMailto(recipients, subject, body) {
  const emails = (Array.isArray(recipients) ? recipients : [recipients]).filter(Boolean)
  if (emails.length === 0 || !subject) return null

  const query = [
    `subject=${encodeURIComponent(subject)}`,
    body ? `body=${encodeURIComponent(body)}` : null,
  ]
    .filter(Boolean)
    .join('&')

  return `mailto:${emails.join(',')}?${query}`
}
