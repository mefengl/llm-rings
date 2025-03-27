import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

type StorageKey = `local:${string}` | `managed:${string}` | `session:${string}` | `sync:${string}`
function useStorage<T>(key: StorageKey) {
  const [value, setValue] = useState<null | T>(null)
  useEffect(() => {
    const fetchStorageValue = async () => {
      const storedvalue = await storage.getItem<null | T>(key)
      setValue(storedvalue)
    }
    fetchStorageValue()
    const unwatch = storage.watch<T>(key, setValue)
    return unwatch
  }, [key])
  return value
}

interface V0RateLimit {
  lastUpdate?: number
  limit: number
  remaining: number
  reset: number
}

interface BoltRateLimit {
  lastUpdate?: number
  maxPerDay: number
  maxPerMonth: number
  totalThisMonth: number
  totalToday: number
}

interface RecraftLimit {
  lastUpdate?: number
  period: string
  remaining: number
  resetTime: number
  total: number
}

interface ElevenLabsLimit {
  characterCount: number
  characterLimit: number
  lastReset: number
  lastUpdate?: number
  nextReset: number
  tier: string
}

interface CustomAILimit {
  characterCount: number
  characterLimit: number
  domainName: string
  lastUpdate?: number
  period: string
}

interface GrokRateLimit {
  DEEPSEARCH?: {
    lastUpdate: number
    remainingQueries: number
    waitTimeSeconds?: number
    windowSizeSeconds: number
  }
  DEFAULT?: {
    lastUpdate: number
    remainingQueries: number
    waitTimeSeconds?: number
    windowSizeSeconds: number
  }
  REASONING?: {
    lastUpdate: number
    remainingQueries: number
    waitTimeSeconds?: number
    windowSizeSeconds: number
  }
}

interface CursorUsage {
  lastUpdate: number
  models: {
    'gpt-3.5-turbo': {
      tokens: number
      total: number
      used: number
    }
    'gpt-4': {
      tokens: number
      total: number
      used: number
    }
    'gpt-4-32k': {
      tokens: number
      total: number
      used: number
    }
  }
  startOfMonth: string
}

interface CursorInvoice {
  items: {
    cents: number
    description: string
  }[]
  lastUpdate: number
  pricing: string
  totalCents: number
}

interface CursorHardLimit {
  hardLimit: number
  lastUpdate: number
}

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0)
    return `${days}d ago`
  if (hours > 0)
    return `${hours}h ago`
  if (minutes > 0)
    return `${minutes}m ago`
  return 'just now'
}

function ProgressBar({ compact = false, max, value }: { compact?: boolean, max: number, value: number }) {
  const usage = max - value
  const percentage = Math.min((usage / max) * 100, 100)

  const getBarColor = (percentage: number) => {
    if (percentage >= 80)
      return 'bg-emerald-500'
    if (percentage >= 60)
      return 'bg-green-500'
    if (percentage >= 30)
      return 'bg-yellow-400'
    return 'bg-amber-400'
  }

  return (
    <div className={compact ? 'w-16' : 'w-full'}>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`absolute left-0 top-0 h-full transition-all ${getBarColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

const SERVICE_URLS = {
  'Bolt.new': 'https://bolt.new',
  'Cursor': 'https://www.cursor.com/settings',
  'ElevenLabs': 'https://elevenlabs.io/app/sign-up',
  'Grok': 'https://grok.com',
  'Recraft.ai': 'https://recraft.ai',
  'V0.dev': 'https://v0.dev/chat',
} as const

function isDataStale(lastUpdate?: number): boolean {
  if (!lastUpdate)
    return true
  const STALE_THRESHOLD = 16 * 60 * 60 * 1000 // 16 hours in milliseconds
  return Date.now() - lastUpdate > STALE_THRESHOLD
}

function App() {
  const v0Data = useStorage<V0RateLimit>('local:v0RateLimit')
  const boltData = useStorage<BoltRateLimit>('local:boltRateLimit')
  const recraftData = useStorage<RecraftLimit>('local:recraftLimit')
  const elevenLabsData = useStorage<ElevenLabsLimit>('local:elevenLabsLimit')
  const customAIData = useStorage<CustomAILimit>('local:customAILimit')
  const grokData = useStorage<GrokRateLimit>('local:grokLimit')
  const cursorUsageData = useStorage<CursorUsage>('local:cursorModelUsage')
  const cursorInvoiceData = useStorage<CursorInvoice>('local:cursorUsage')
  const cursorHardLimitData = useStorage<CursorHardLimit>('local:cursorHardLimit')

  // Format cents to dollar amount
  const formatDollars = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  return (
    <div className="scrollbar-thin h-[400px] w-[600px] overflow-y-auto bg-slate-50/60 p-3 font-sans text-sm">
      <h2 className="mb-3 text-base font-medium text-slate-600">AI Services Dashboard</h2>

      {/* Grok Section */}
      {grokData && (
        <div className="mb-4">
          <div className="mb-1 flex items-center">
            <span className="text-sm font-medium text-slate-600">Grok</span>
            <span className="ml-1.5 rounded-sm bg-blue-50 px-1 py-0.5 text-xs text-blue-600">{isDataStale(grokData.DEFAULT?.lastUpdate || 0) ? 'Stale' : 'Active'}</span>
            <a className="ml-auto text-xs text-slate-400 hover:text-slate-600" href="https://grok.com" target="_blank">Visit →</a>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-1 pl-1 font-medium">Type</th>
                <th className="pb-1 font-medium">Remaining</th>
                <th className="pb-1 font-medium">Window</th>
                <th className="pb-1 font-medium">Updated</th>
                <th className="pb-1 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(['DEFAULT', 'DEEPSEARCH', 'REASONING'] as const).map((type) => {
                const data = grokData[type]
                if (!data)
                  return null
                const isStale = isDataStale(data.lastUpdate)

                return (
                  <tr className={`border-b border-slate-100 ${isStale ? 'text-slate-400' : 'text-slate-700'}`} key={type}>
                    <td className="py-1.5 pl-1">{type}</td>
                    <td className="py-1.5">
                      {data.remainingQueries}
                      /
                      {type === 'DEEPSEARCH' ? 5 : 20}
                    </td>
                    <td className="py-1.5">
                      {data.windowSizeSeconds / 3600}
                      h
                    </td>
                    <td className="py-1.5">{formatRelativeTime(data.lastUpdate)}</td>
                    <td className="py-1.5">
                      <div className="flex items-center space-x-1">
                        <ProgressBar
                          compact
                          max={type === 'DEEPSEARCH' ? 5 : 20}
                          value={data.remainingQueries}
                        />
                        <span className="text-xs text-slate-500">
                          {Math.round((data.remainingQueries / (type === 'DEEPSEARCH' ? 5 : 20)) * 100)}
                          %
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* General Services Table */}
      <div className="mb-4">
        <div className="mb-1 text-sm font-medium text-slate-600">General Services</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="pb-1 pl-1 font-medium">Service</th>
              <th className="pb-1 font-medium">Usage</th>
              <th className="pb-1 font-medium">Period</th>
              <th className="pb-1 font-medium">Updated</th>
              <th className="pb-1 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {v0Data && (
              <tr className="border-b border-slate-100">
                <td className="py-1.5 pl-1">
                  <div className="flex items-center">
                    <span className="text-slate-700">V0.dev</span>
                    {isDataStale(v0Data.lastUpdate) && <span className="ml-1 text-[10px] text-amber-500">⚠</span>}
                  </div>
                </td>
                <td className="py-1.5">
                  {v0Data.limit - v0Data.remaining}
                  /
                  {v0Data.limit}
                </td>
                <td className="py-1.5" title={new Date(v0Data.reset).toLocaleString()}>
                  Reset:
                  {' '}
                  {new Date(v0Data.reset).toLocaleDateString()}
                </td>
                <td className="py-1.5">{v0Data.lastUpdate ? formatRelativeTime(v0Data.lastUpdate) : 'N/A'}</td>
                <td className="py-1.5">
                  <div className="flex items-center space-x-1">
                    <ProgressBar
                      compact
                      max={v0Data.limit}
                      value={v0Data.remaining}
                    />
                    <span className="text-xs text-slate-500">
                      {Math.round((v0Data.remaining / v0Data.limit) * 100)}
                      %
                    </span>
                  </div>
                </td>
              </tr>
            )}

            {boltData && (
              <tr className="border-b border-slate-100">
                <td className="py-1.5 pl-1">
                  <div className="flex items-center">
                    <span className="text-slate-700">Bolt.new</span>
                    {isDataStale(boltData.lastUpdate) && <span className="ml-1 text-[10px] text-amber-500">⚠</span>}
                  </div>
                </td>
                <td className="py-1.5">
                  <div>
                    <div>
                      Day:
                      {boltData.totalToday}
                      /
                      {boltData.maxPerDay}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Month:
                      {boltData.totalThisMonth}
                      /
                      {boltData.maxPerMonth}
                    </div>
                  </div>
                </td>
                <td className="py-1.5">Daily</td>
                <td className="py-1.5">{boltData.lastUpdate ? formatRelativeTime(boltData.lastUpdate) : 'N/A'}</td>
                <td className="py-1.5">
                  <div className="flex items-center space-x-1">
                    <ProgressBar
                      compact
                      max={boltData.maxPerDay}
                      value={boltData.maxPerDay - boltData.totalToday}
                    />
                    <span className="text-xs text-slate-500">
                      {Math.round(((boltData.maxPerDay - boltData.totalToday) / boltData.maxPerDay) * 100)}
                      %
                    </span>
                  </div>
                </td>
              </tr>
            )}

            {recraftData && (
              <tr className="border-b border-slate-100">
                <td className="py-1.5 pl-1">
                  <div className="flex items-center">
                    <span className="text-slate-700">Recraft.ai</span>
                    {isDataStale(recraftData.lastUpdate) && <span className="ml-1 text-[10px] text-amber-500">⚠</span>}
                  </div>
                </td>
                <td className="py-1.5">
                  {recraftData.total - recraftData.remaining}
                  /
                  {recraftData.total}
                </td>
                <td className="py-1.5" title={new Date(recraftData.resetTime).toLocaleString()}>
                  {recraftData.period}
                </td>
                <td className="py-1.5">{recraftData.lastUpdate ? formatRelativeTime(recraftData.lastUpdate) : 'N/A'}</td>
                <td className="py-1.5">
                  <div className="flex items-center space-x-1">
                    <ProgressBar
                      compact
                      max={recraftData.total}
                      value={recraftData.remaining}
                    />
                    <span className="text-xs text-slate-500">
                      {Math.round((recraftData.remaining / recraftData.total) * 100)}
                      %
                    </span>
                  </div>
                </td>
              </tr>
            )}

            {elevenLabsData && (
              <tr className="border-b border-slate-100">
                <td className="py-1.5 pl-1">
                  <div className="flex items-center">
                    <span className="text-slate-700">ElevenLabs</span>
                    {isDataStale(elevenLabsData.lastUpdate) && <span className="ml-1 text-[10px] text-amber-500">⚠</span>}
                  </div>
                </td>
                <td className="py-1.5">
                  {elevenLabsData.characterCount.toLocaleString()}
                  /
                  {elevenLabsData.characterLimit.toLocaleString()}
                </td>
                <td className="py-1.5" title={new Date(elevenLabsData.nextReset).toLocaleString()}>
                  Reset:
                  {' '}
                  {new Date(elevenLabsData.nextReset).toLocaleDateString()}
                </td>
                <td className="py-1.5">{elevenLabsData.lastUpdate ? formatRelativeTime(elevenLabsData.lastUpdate) : 'N/A'}</td>
                <td className="py-1.5">
                  <div className="flex items-center space-x-1">
                    <ProgressBar
                      compact
                      max={elevenLabsData.characterLimit}
                      value={elevenLabsData.characterLimit - elevenLabsData.characterCount}
                    />
                    <span className="text-xs text-slate-500">
                      {Math.round(((elevenLabsData.characterLimit - elevenLabsData.characterCount) / elevenLabsData.characterLimit) * 100)}
                      %
                    </span>
                  </div>
                </td>
              </tr>
            )}

            {customAIData && (
              <tr className="border-b border-slate-100">
                <td className="py-1.5 pl-1">
                  <div className="flex items-center">
                    <span className="text-slate-700">{customAIData.domainName}</span>
                    {isDataStale(customAIData.lastUpdate) && <span className="ml-1 text-[10px] text-amber-500">⚠</span>}
                  </div>
                </td>
                <td className="py-1.5">
                  {customAIData.characterCount}
                  /
                  {customAIData.characterLimit}
                </td>
                <td className="py-1.5">{customAIData.period}</td>
                <td className="py-1.5">{customAIData.lastUpdate ? formatRelativeTime(customAIData.lastUpdate) : 'N/A'}</td>
                <td className="py-1.5">
                  <div className="flex items-center space-x-1">
                    <ProgressBar
                      compact
                      max={customAIData.characterLimit}
                      value={customAIData.characterLimit - customAIData.characterCount}
                    />
                    <span className="text-xs text-slate-500">
                      {Math.round(((customAIData.characterLimit - customAIData.characterCount) / customAIData.characterLimit) * 100)}
                      %
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cursor Section */}
      {(cursorUsageData || cursorInvoiceData) && (
        <div className="mb-4">
          <div className="mb-1 flex items-center">
            <span className="text-sm font-medium text-slate-600">Cursor</span>
            <span className="ml-1.5 rounded-sm bg-blue-50 px-1 py-0.5 text-xs text-blue-600">
              {isDataStale(cursorUsageData?.lastUpdate || cursorInvoiceData?.lastUpdate || 0) ? 'Stale' : 'Active'}
            </span>
            <a className="ml-auto text-xs text-slate-400 hover:text-slate-600" href="https://www.cursor.com/settings" target="_blank">Visit →</a>
          </div>

          {cursorUsageData && (
            <div className="mb-2 rounded border border-slate-200 bg-white p-2">
              <div className="mb-1.5 text-xs font-medium text-slate-600">Premium Models</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Used/Total</span>
                    <span>
                      {cursorUsageData.models['gpt-4'].used}
                      /
                      {cursorUsageData.models['gpt-4'].total}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tokens</span>
                    <span>{cursorUsageData.models['gpt-4'].tokens.toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Updated</span>
                    <span>{formatRelativeTime(cursorUsageData.lastUpdate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Billing Start</span>
                    <span>{new Date(cursorUsageData.startOfMonth).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="col-span-2 mt-1">
                  <ProgressBar
                    max={cursorUsageData.models['gpt-4'].total}
                    value={cursorUsageData.models['gpt-4'].total - cursorUsageData.models['gpt-4'].used}
                  />
                </div>
              </div>
            </div>
          )}

          {cursorInvoiceData && cursorHardLimitData && (
            <div className="rounded border border-slate-200 bg-white p-2">
              <div className="mb-1.5 text-xs font-medium text-slate-600">Billing</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current Usage</span>
                    <span>{formatDollars(cursorInvoiceData.totalCents)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hard Limit</span>
                    <span>
                      $
                      {cursorHardLimitData.hardLimit}
                    </span>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Updated</span>
                    <span>{formatRelativeTime(cursorInvoiceData.lastUpdate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Remaining</span>
                    <span>
                      $
                      {cursorHardLimitData.hardLimit - (cursorInvoiceData.totalCents / 100)}
                    </span>
                  </div>
                </div>
                <div className="col-span-2 mt-1">
                  <ProgressBar
                    max={cursorHardLimitData.hardLimit * 100}
                    value={(cursorHardLimitData.hardLimit * 100) - cursorInvoiceData.totalCents}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Data State */}
      {!grokData && !v0Data && !boltData && !recraftData && !elevenLabsData && !customAIData && !cursorUsageData && !cursorInvoiceData && (
        <div className="mt-20 text-center text-slate-500">
          <p>No usage data available yet.</p>
          <p className="mt-2 text-sm">Visit AI services to start tracking usage.</p>
        </div>
      )}

      {/* Footer links */}
      <div className="mt-4 flex justify-end space-x-2 text-xs text-slate-400">
        {Object.entries(SERVICE_URLS).map(([name, url]) => (
          <a className="hover:text-slate-600" href={url} key={name} target="_blank">
            {name}
          </a>
        ))}
      </div>
    </div>
  )
}

export default App
