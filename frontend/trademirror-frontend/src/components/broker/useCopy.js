import { useCallback, useState } from 'react'

export default function useCopy() {
  const [copiedKey, setCopied] = useState(null)

  const copy = useCallback((key, text) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }, [])

  return { copiedKey, copy }
}
