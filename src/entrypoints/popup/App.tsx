import { exportPopupAsPng } from '@/lib/screenshot'
import { useEffect, useRef, useState } from 'react'

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

  const setItem = async (value: T) => {
    await storage.setItem(key, value)
    // Optimistically update state? Or rely on watcher?
    // For simplicity, relying on watcher triggered by setItem
  }

  return [value, setItem] as const // Return tuple
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
  const [v0, _setV0] = useStorage<V0RateLimit>('local:v0RateLimit')
  const [nickname, setNickname] = useStorage<string>('local:nickname')
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSave = (value: string) => {
    const trimmedValue = value.trim()
    setNickname(trimmedValue)
    setIsEditing(false)
  }

  // Handle edit state toggle and save
  const handleEditToggle = () => {
    setIsEditing(true)
    // setTimeout ensures input is focused after rendering
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave((e.target as HTMLInputElement).value)
    }
    else if (e.key === 'Escape') {
      setIsEditing(false) // Cancel edit on ESC
    }
  }

  return (
    <div className="relative flex h-[400px] w-[300px] flex-col items-center justify-center bg-white font-sans">
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
            <div className="text-center text-sm text-slate-400">Browse v0.dev to collect usage data</div>
          )}

      {/* Nickname display/edit area (bottom-left) */}
      <div
        className="absolute bottom-2 left-2 flex items-center text-xs text-slate-500"
        id="nickname-container"
        style={{ zIndex: 15 }}
      >
        {isEditing
          ? (
              <input
                className="w-full rounded border border-blue-400 px-1 py-px text-[10px] outline-none"
                defaultValue={nickname ?? ''}
                onBlur={e => handleSave(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter nickname..."
                ref={inputRef}
                type="text"
              />
            )
          : (
              <span
                className={`mr-1 cursor-pointer ${!nickname ? 'italic text-slate-400' : ''}`}
                onClick={handleEditToggle}
                title="Click to edit nickname"
              >
                {nickname || 'Set nickname'}
              </span>
            )}
        {/* Edit button only shown when not editing */}
        {!isEditing
        && (
          <button
            className="cursor-pointer opacity-50 hover:opacity-100"
            id="edit-nickname-button"
            onClick={handleEditToggle}
            title="Edit nickname"
          >
            ✏️
          </button>
        )}
      </div>

      {/* Export button (bottom-right) */}
      <button
        className="absolute bottom-2 right-2 cursor-pointer rounded bg-slate-100 p-1 text-xs text-slate-500 opacity-50 hover:bg-slate-200 hover:opacity-100"
        id="export-button"
        onClick={exportPopupAsPng}
        style={{ zIndex: 10 }}
        title="Export as PNG"
      >
        📸
      </button>
    </div>
  )
}
