import { useEffect, useRef, useState } from 'react'
import { errorText } from './api'

export function useLoad<T>(key: string, loader: () => Promise<T>) {
  const loaderRef = useRef(loader)
  loaderRef.current = loader
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let live = true
    setLoading(true)
    setError(null)
    loaderRef.current()
      .then((value) => {
        if (live) setData(value)
      })
      .catch((reason: unknown) => {
        if (live) {
          setData(null)
          setError(errorText(reason))
        }
      })
      .finally(() => {
        if (live) setLoading(false)
      })
    return () => {
      live = false
    }
  }, [key, nonce])

  return {
    data,
    error,
    loading,
    reload: () => setNonce((value) => value + 1),
  }
}
