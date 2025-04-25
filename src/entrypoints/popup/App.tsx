import { useEffect, useState } from 'react'

// 简化版，只保留 v0.dev 用量可视化

type StorageKey =
  | `local:${string}`
  | `managed:${string}`
  | `session:${string}`
  | `sync:${string}`

function useStorage<T>(key: StorageKey) {
  const [value, setValue] = useState<null | T>(null)
  useEffect(() => {
    const fetchStorageValue = async () => {
      const storedValue = await storage.getItem<null | T>(key)
      setValue(storedValue)
    }
    fetchStorageValue()
    const unwatch = storage.watch<T>(key, setValue)
    return unwatch
  }, [key])
  return value
}

// v0.dev rate-limit schema
interface V0RateLimit {
  lastUpdate?: number
  limit: number
  remaining: number
  reset: number
}

// relative time helper
function formatRelativeTime(timestamp?: number) {
  if (!timestamp)
    return 'N/A'
  const diff = Date.now() - timestamp
  const s = Math.floor(diff / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0)
    return `${d}d ago`
  if (h > 0)
    return `${h}h ago`
  if (m > 0)
    return `${m}m ago`
  return `${s}s ago`
}

export default function App() {
  const v0 = useStorage<V0RateLimit>('local:v0RateLimit')

  return (
    <div className="flex h-[400px] w-[300px] flex-col items-center justify-center bg-white font-sans">
      {v0
        ? (
            <>
              <div className="mb-3 text-lg font-medium text-slate-700">v0.dev</div>

              <div className="relative mb-4 h-2 w-48 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="absolute left-0 top-0 h-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(((v0.limit - v0.remaining) / v0.limit) * 100, 100)}%` }}
                />
              </div>

              <div className="mb-1 text-3xl font-bold text-slate-800">
                {v0.limit - v0.remaining}
                <span className="text-base text-slate-400">
                  {' '}
                  /
                  {v0.limit}
                </span>
              </div>

              <div className="mb-1 text-xs text-slate-500">
                {Math.round(((v0.limit - v0.remaining) / v0.limit) * 100)}
                % used
              </div>

              <div className="text-[10px] text-slate-400">
                Reset:
                {' '}
                {new Date(v0.reset).toLocaleDateString()}
                {' '}
                · Updated:
                {' '}
                {formatRelativeTime(v0.lastUpdate)}
              </div>
            </>
          )
        : (
            <div className="text-sm text-slate-400">Browse v0.dev to collect usage data</div>
          )}
    </div>
  )
}
