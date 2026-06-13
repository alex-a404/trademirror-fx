import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

const INSIGHT_TABS = [
  { id: 'critical_mistakes', label: 'Critical Mistakes' },
  { id: 'action_plan', label: 'Action Plan' },
  { id: 'hidden_edge', label: 'Hidden Edge' },
]

export default function AiDeepDive({ clientId }) {
  const [activeInsightTab, setActiveInsightTab] = useState(null)
  const [insightData, setInsightData] = useState('')
  const [streamedText, setStreamedText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [insightCache, setInsightCache] = useState({})
  const activeRequestRef = useRef(null)

  useEffect(() => {
    if (!insightData) return undefined

    setStreamedText('')
    setIsTyping(true)

    let index = 0
    const intervalId = setInterval(() => {
      index += 1
      if (index <= insightData.length) {
        setStreamedText(insightData.slice(0, index))
      } else {
        clearInterval(intervalId)
        setIsTyping(false)
      }
    }, 15)

    return () => clearInterval(intervalId)
  }, [insightData])

  async function handleInsightClick(tabId) {
    activeRequestRef.current = tabId
    setActiveInsightTab(tabId)
    setInsightData('')

    if (insightCache[tabId]) {
      setIsGenerating(false)
      setIsTyping(false)
      setStreamedText(insightCache[tabId])
      return
    }

    setStreamedText('')
    setIsGenerating(true)
    setIsTyping(false)

    try {
      const res = await fetch('http://localhost:8000/api/generate-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          insight_type: tabId,
        }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()
      if (activeRequestRef.current !== tabId) return

      const responseData = data.text || ''
      setInsightCache((prev) => ({ ...prev, [tabId]: responseData }))
      setInsightData(responseData)
    } catch {
      if (activeRequestRef.current !== tabId) return

      setInsightData('Failed to connect to Bedrock. Is the backend running on port 8000?')
    } finally {
      if (activeRequestRef.current === tabId) {
        setIsGenerating(false)
      }
    }
  }

  function handleClose() {
    activeRequestRef.current = null
    setActiveInsightTab(null)
    setIsGenerating(false)
    setIsTyping(false)
    setInsightData('')
    setStreamedText('')
  }

  const markdownContent = isTyping ? `${streamedText}▋` : streamedText

  return (
    <div className="mb-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs text-gray-400">✦</span>
        <h2 className="text-sm font-medium text-gray-900">AI Deep Dive</h2>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {INSIGHT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleInsightClick(tab.id)}
            className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors focus:outline-none ${
              activeInsightTab === tab.id
                ? 'bg-slate-800 text-white shadow-md'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeInsightTab !== null ? (
        <div className="relative min-h-[120px] rounded-xl border border-slate-200 bg-white p-6 pr-12 text-slate-800 shadow-sm">
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-slate-400 transition-colors hover:text-slate-700 focus:outline-none"
          >
            <span className="text-sm leading-none">✕</span>
          </button>

          {isGenerating ? (
            <span className="animate-pulse">✨ Synthesizing Behavioral Intelligence...</span>
          ) : (
            <div className="prose prose-slate max-w-none text-sm leading-relaxed">
              <ReactMarkdown>{markdownContent}</ReactMarkdown>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
