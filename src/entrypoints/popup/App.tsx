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

interface SameNewLimit {
  isActive: boolean
  isSubscription: boolean
  lastReset: number
  lastUpdate: number
  nextReset: number
  tokenQuota: number
  tokenUsed: number
}

interface GrokRateLimit {
  DEEPERSEARCH?: {
    lastUpdate: number
    remainingQueries: number
    totalQueries?: number
    waitTimeSeconds?: number
    windowSizeSeconds: number
  }
  DEEPSEARCH?: {
    lastUpdate: number
    remainingQueries: number
    totalQueries?: number
    waitTimeSeconds?: number
    windowSizeSeconds: number
  }
  DEFAULT?: {
    lastUpdate: number
    remainingQueries: number
    totalQueries?: number
    waitTimeSeconds?: number
    windowSizeSeconds: number
  }
  REASONING?: {
    lastUpdate: number
    remainingQueries: number
    totalQueries?: number
    waitTimeSeconds?: number
    windowSizeSeconds: number
  }
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

interface ChatGPTLimit {
  default_model_slug: string
  lastUpdate?: number
  limits_progress: {
    feature_name: string
    remaining: number
    reset_after: string
  }[]
  model_limits: {
    model_slug: string
    resets_after: string
    using_default_model_slug: string
  }[]
}

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0)
    return `${days}d ago`
  if (hours > 0)
    return `${hours}h ago`
  if (minutes > 0)
    return `${minutes}m ago`
  if (seconds > 0)
    return `${seconds}s ago`
  return 'just now'
}

function ProgressBar({ compact = false, max, value }: { compact?: boolean, max: number, value: number }) {
  const percentage = Math.min((value / max) * 100, 100)

  const getBarColor = (percentage: number) => {
    if (percentage <= 20)
      return 'bg-emerald-500'
    if (percentage <= 40)
      return 'bg-green-500'
    if (percentage <= 70)
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
  'ChatGPT': 'https://chat.openai.com',
  'Cursor': 'https://www.cursor.com/settings',
  'ElevenLabs': 'https://elevenlabs.io/app/sign-up',
  'Grok': 'https://grok.com',
  'Recraft.ai': 'https://recraft.ai',
  'Same.new': 'https://same.new',
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
  const cursorInvoiceData = useStorage<CursorInvoice>('local:cursorUsage')
  const cursorHardLimitData = useStorage<CursorHardLimit>('local:cursorHardLimit')
  const chatGPTData = useStorage<ChatGPTLimit>('local:chatGPTLimit')
  const sameNewData = useStorage<SameNewLimit>('local:sameNewLimit')

  // Add sort type and state
  type SortType = 'lastUpdated' | 'name' | 'usage'
  const [sortType, setSortType] = useState<SortType>('lastUpdated')

  // Format cents to dollar amount
  const formatDollars = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  // Create a unified data structure for all services
  interface ServiceData {
    data: any
    lastUpdate: number
    name: string
    usagePercentage: number
  }

  const servicesData = [
    v0Data && {
      data: v0Data,
      lastUpdate: v0Data.lastUpdate || 0,
      name: 'V0.dev',
      usagePercentage: Math.round((v0Data.remaining / v0Data.limit) * 100),
    },
    boltData && {
      data: boltData,
      lastUpdate: boltData.lastUpdate || 0,
      name: 'Bolt.new',
      usagePercentage: Math.round((boltData.totalToday / boltData.maxPerDay) * 100),
    },
    recraftData && {
      data: recraftData,
      lastUpdate: recraftData.lastUpdate || 0,
      name: 'Recraft.ai',
      usagePercentage: Math.round((recraftData.total - recraftData.remaining) / recraftData.total * 100),
    },
    elevenLabsData && {
      data: elevenLabsData,
      lastUpdate: elevenLabsData.lastUpdate || 0,
      name: 'ElevenLabs',
      usagePercentage: Math.round((elevenLabsData.characterCount / elevenLabsData.characterLimit) * 100),
    },
    customAIData && {
      data: customAIData,
      lastUpdate: customAIData.lastUpdate || 0,
      name: customAIData.domainName,
      usagePercentage: Math.round((customAIData.characterCount / customAIData.characterLimit) * 100),
    },
    chatGPTData && {
      data: chatGPTData,
      lastUpdate: chatGPTData.lastUpdate || 0,
      name: 'ChatGPT',
      usagePercentage: chatGPTData.limits_progress && chatGPTData.limits_progress.length > 0
        ? Math.round((chatGPTData.limits_progress[0].remaining / 10) * 100)
        : 100,
    },
    grokData && {
      data: grokData,
      lastUpdate: Math.max(
        grokData.DEFAULT?.lastUpdate || 0,
        grokData.DEEPSEARCH?.lastUpdate || 0,
        grokData.DEEPERSEARCH?.lastUpdate || 0,
        grokData.REASONING?.lastUpdate || 0,
      ),
      name: 'Grok',
      usagePercentage: grokData.DEFAULT ? Math.round((grokData.DEFAULT.remainingQueries / 20) * 100) : 0,
    },
    (cursorInvoiceData && cursorHardLimitData) && {
      data: { cursorHardLimitData, cursorInvoiceData },
      lastUpdate: Math.max(
        cursorInvoiceData?.lastUpdate || 0,
        cursorHardLimitData?.lastUpdate || 0,
      ),
      name: 'Cursor',
      usagePercentage: Math.round((cursorInvoiceData.totalCents / (cursorHardLimitData.hardLimit * 100)) * 100),
    },
    sameNewData && {
      data: sameNewData,
      lastUpdate: sameNewData.lastUpdate || 0,
      name: 'Same.new',
      usagePercentage: Math.round((sameNewData.tokenUsed / sameNewData.tokenQuota) * 100),
    },
  ].filter(Boolean) as ServiceData[]

  // Sort services based on selected sort type
  const sortedServices = [...servicesData].sort((a, b) => {
    if (sortType === 'lastUpdated') {
      return b.lastUpdate - a.lastUpdate // Most recent first
    }
    else if (sortType === 'name') {
      return a.name.localeCompare(b.name)
    }
    else if (sortType === 'usage') {
      return b.usagePercentage - a.usagePercentage // Higher percentage first
    }
    return 0
  })

  return (
    <div className="h-[400px] w-[600px] overflow-y-auto bg-slate-50/60 p-3 font-sans text-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">Services</span>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-slate-200 bg-white text-xs">
            <button
              aria-label="Sort by most recent"
              aria-pressed={sortType === 'lastUpdated'}
              className={`px-2 py-1 ${sortType === 'lastUpdated' ? 'bg-slate-100 font-medium' : ''}`}
              onClick={() => setSortType('lastUpdated')}
            >
              Recent
            </button>
            <button
              aria-label="Sort alphabetically by name"
              aria-pressed={sortType === 'name'}
              className={`px-2 py-1 ${sortType === 'name' ? 'bg-slate-100 font-medium' : ''}`}
              onClick={() => setSortType('name')}
            >
              Name
            </button>
            <button
              aria-label="Sort by usage percentage"
              aria-pressed={sortType === 'usage'}
              className={`px-2 py-1 ${sortType === 'usage' ? 'bg-slate-100 font-medium' : ''}`}
              onClick={() => setSortType('usage')}
            >
              Usage
            </button>
          </div>
          <span className="text-xs text-slate-400">{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Display sorted Grok first if it exists in sorted services */}
      {sortedServices.some(service => service.name === 'Grok') && grokData && (
        <div className="mb-4">
          <div className="mb-1 flex items-center">
            <span className="text-sm font-medium text-slate-600">Grok</span>
            <span className="ml-1.5 rounded-sm bg-blue-50 px-1 py-0.5 text-xs text-blue-600">
              {isDataStale(grokData.DEFAULT?.lastUpdate || 0) ? 'Stale' : 'Active'}
            </span>
            <a className="ml-auto text-xs text-slate-400 hover:text-slate-600" href="https://grok.com" target="_blank" title="Visit Grok website">Visit →</a>
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
              {(['DEFAULT', 'DEEPSEARCH', 'DEEPERSEARCH', 'REASONING'] as const).map((type) => {
                const data = grokData[type]
                if (!data)
                  return null
                const isStale = isDataStale(data.lastUpdate)

                // Default max values for different types
                const maxQueries = data.totalQueries || (
                  type === 'DEEPSEARCH' || type === 'DEEPERSEARCH' ? 5 : 20
                )

                return (
                  <tr className={`border-b border-slate-100 ${isStale ? 'text-slate-400' : 'text-slate-700'}`} key={type}>
                    <td className="py-1.5 pl-1">{type}</td>
                    <td className="py-1.5">
                      {data.remainingQueries}
                      /
                      {maxQueries}
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
                          max={maxQueries}
                          value={maxQueries - data.remainingQueries}
                        />
                        <span className="text-xs text-slate-500">
                          {Math.round(((maxQueries - data.remainingQueries) / maxQueries) * 100)}
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

      {/* Display ChatGPT data if it exists */}
      {sortedServices.some(service => service.name === 'ChatGPT') && chatGPTData && (
        <div className="mb-4">
          <div className="mb-1 flex items-center">
            <span className="text-sm font-medium text-slate-600">ChatGPT</span>
            <span className="ml-1.5 rounded-sm bg-blue-50 px-1 py-0.5 text-xs text-blue-600">
              {isDataStale(chatGPTData.lastUpdate || 0) ? 'Stale' : 'Active'}
            </span>
            <a className="ml-auto text-xs text-slate-400 hover:text-slate-600" href="https://chat.openai.com" target="_blank" title="Visit ChatGPT website">Visit →</a>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-1 pl-1 font-medium">Type</th>
                <th className="pb-1 font-medium">Status</th>
                <th className="pb-1 font-medium">Resets At</th>
                <th className="pb-1 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {/* Model Limits */}
              {chatGPTData.model_limits && chatGPTData.model_limits.map((model, index) => {
                const isStale = isDataStale(chatGPTData.lastUpdate || 0)

                return (
                  <tr className={`border-b border-slate-100 ${isStale ? 'text-slate-400' : 'text-slate-700'}`} key={`model-${index}`}>
                    <td className="py-1.5 pl-1">{model.model_slug}</td>
                    <td className="py-1.5">
                      <span className="rounded-sm bg-amber-50 px-1 py-0.5 text-xs text-amber-600">
                        {model.using_default_model_slug || 'Active'}
                      </span>
                    </td>
                    <td className="py-1.5">
                      {new Date(model.resets_after).toLocaleDateString()}
                      {' '}
                      {new Date(model.resets_after).toLocaleTimeString()}
                    </td>
                    <td className="py-1.5">{chatGPTData.lastUpdate ? formatRelativeTime(chatGPTData.lastUpdate) : 'Unknown'}</td>
                  </tr>
                )
              })}

              {/* Features Limits */}
              {chatGPTData.limits_progress && chatGPTData.limits_progress.map((feature, index) => {
                const isStale = isDataStale(chatGPTData.lastUpdate || 0)
                const maxValue = 10 // Default assumption for max value, may need to adjust based on actual API

                return (
                  <tr className={`border-b border-slate-100 ${isStale ? 'text-slate-400' : 'text-slate-700'}`} key={`feature-${index}`}>
                    <td className="py-1.5 pl-1">{feature.feature_name}</td>
                    <td className="py-1.5">
                      <div className="flex items-center space-x-1">
                        <ProgressBar
                          compact
                          max={maxValue}
                          value={maxValue - feature.remaining}
                        />
                        <span className="text-xs text-slate-500">
                          {feature.remaining}
                          {' '}
                          remaining
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5">
                      {new Date(feature.reset_after).toLocaleDateString()}
                      {' '}
                      {new Date(feature.reset_after).toLocaleTimeString()}
                    </td>
                    <td className="py-1.5">{chatGPTData.lastUpdate ? formatRelativeTime(chatGPTData.lastUpdate) : 'Unknown'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* General Services Table with sorted services */}
      <div className="mb-4">
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
            {sortedServices
              .map((service) => {
                if (service.name === 'V0.dev' && v0Data) {
                  return (
                    <tr className="border-b border-slate-100" key={service.name}>
                      <td className="py-1.5 pl-1">
                        <div className="flex items-center">
                          <span className="text-slate-700">{service.name}</span>
                          {isDataStale(v0Data.lastUpdate) && <span className="ml-1 text-[10px] text-amber-300/70">stale</span>}
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
                            value={v0Data.limit - v0Data.remaining}
                          />
                          <span className="text-xs text-slate-500">
                            {Math.round(((v0Data.limit - v0Data.remaining) / v0Data.limit) * 100)}
                            %
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                }

                if (service.name === 'Bolt.new' && boltData) {
                  return (
                    <tr className="border-b border-slate-100" key={service.name}>
                      <td className="py-1.5 pl-1">
                        <div className="flex items-center">
                          <span className="text-slate-700">{service.name}</span>
                          {isDataStale(boltData.lastUpdate) && <span className="ml-1 text-[10px] text-amber-300/70">stale</span>}
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
                            {' '}
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
                            value={boltData.totalToday}
                          />
                          <span className="text-xs text-slate-500">
                            {Math.round((boltData.totalToday / boltData.maxPerDay) * 100)}
                            %
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                }

                if (service.name === 'Recraft.ai' && recraftData) {
                  return (
                    <tr className="border-b border-slate-100" key={service.name}>
                      <td className="py-1.5 pl-1">
                        <div className="flex items-center">
                          <span className="text-slate-700">{service.name}</span>
                          {isDataStale(recraftData.lastUpdate) && <span className="ml-1 text-[10px] text-amber-300/70">stale</span>}
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
                            value={recraftData.total - recraftData.remaining}
                          />
                          <span className="text-xs text-slate-500">
                            {Math.round(((recraftData.total - recraftData.remaining) / recraftData.total) * 100)}
                            %
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                }

                if (service.name === 'ElevenLabs' && elevenLabsData) {
                  return (
                    <tr className="border-b border-slate-100" key={service.name}>
                      <td className="py-1.5 pl-1">
                        <div className="flex items-center">
                          <span className="text-slate-700">{service.name}</span>
                          {isDataStale(elevenLabsData.lastUpdate) && <span className="ml-1 text-[10px] text-amber-300/70">stale</span>}
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
                            value={elevenLabsData.characterCount}
                          />
                          <span className="text-xs text-slate-500">
                            {Math.round((elevenLabsData.characterCount / elevenLabsData.characterLimit) * 100)}
                            %
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                }

                if (customAIData && service.name === customAIData.domainName) {
                  return (
                    <tr className="border-b border-slate-100" key={service.name}>
                      <td className="py-1.5 pl-1">
                        <div className="flex items-center">
                          <span className="text-slate-700">{service.name}</span>
                          {isDataStale(customAIData.lastUpdate) && <span className="ml-1 text-[10px] text-amber-300/70">stale</span>}
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
                            value={customAIData.characterCount}
                          />
                          <span className="text-xs text-slate-500">
                            {Math.round((customAIData.characterCount / customAIData.characterLimit) * 100)}
                            %
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                }

                if (service.name === 'Grok' && grokData) {
                  // Find the first available data type to display in the general table
                  const dataType = ['DEEPERSEARCH', 'DEFAULT', 'DEEPSEARCH', 'REASONING'].find(type => grokData[type as keyof GrokRateLimit])
                  const data = dataType ? grokData[dataType as keyof GrokRateLimit] : null

                  if (!data)
                    return null

                  const maxQueries = data.totalQueries || (
                    dataType === 'DEEPSEARCH' || dataType === 'DEEPERSEARCH' ? 5 : 20
                  )

                  return (
                    <tr className="border-b border-slate-100" key={service.name}>
                      <td className="py-1.5 pl-1">
                        <div className="flex items-center">
                          <span className="text-slate-700">{service.name}</span>
                          {isDataStale(data.lastUpdate) && <span className="ml-1 text-[10px] text-amber-300/70">stale</span>}
                        </div>
                      </td>
                      <td className="py-1.5">
                        {data.remainingQueries}
                        /
                        {maxQueries}
                      </td>
                      <td className="py-1.5">
                        {data.windowSizeSeconds / 3600}
                        h
                      </td>
                      <td className="py-1.5">{data.lastUpdate ? formatRelativeTime(data.lastUpdate) : 'N/A'}</td>
                      <td className="py-1.5">
                        <div className="flex items-center space-x-1">
                          <ProgressBar
                            compact
                            max={maxQueries}
                            value={maxQueries - data.remainingQueries}
                          />
                          <span className="text-xs text-slate-500">
                            {Math.round(((maxQueries - data.remainingQueries) / maxQueries) * 100)}
                            %
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                }

                if (service.name === 'Cursor' && (cursorInvoiceData && cursorHardLimitData)) {
                  // Display billing data
                  return (
                    <tr className="border-b border-slate-100" key={service.name}>
                      <td className="py-1.5 pl-1">
                        <div className="flex items-center">
                          <span className="text-slate-700">{service.name}</span>
                          {isDataStale(cursorInvoiceData.lastUpdate) && <span className="ml-1 text-[10px] text-amber-300/70">stale</span>}
                        </div>
                      </td>
                      <td className="py-1.5">
                        {formatDollars(cursorInvoiceData.totalCents)}
                        /
                        $
                        {cursorHardLimitData.hardLimit}
                      </td>
                      <td className="py-1.5">
                        Monthly
                      </td>
                      <td className="py-1.5">{cursorInvoiceData.lastUpdate ? formatRelativeTime(cursorInvoiceData.lastUpdate) : 'N/A'}</td>
                      <td className="py-1.5">
                        <div className="flex items-center space-x-1">
                          <ProgressBar
                            compact
                            max={cursorHardLimitData.hardLimit * 100}
                            value={cursorInvoiceData.totalCents}
                          />
                          <span className="text-xs text-slate-500">
                            {Math.round((cursorInvoiceData.totalCents / (cursorHardLimitData.hardLimit * 100)) * 100)}
                            %
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                }

                if (service.name === 'Same.new' && sameNewData) {
                  return (
                    <tr className="border-b border-slate-100" key={service.name}>
                      <td className="py-1.5 pl-1">
                        <div className="flex items-center">
                          <span className="text-slate-700">{service.name}</span>
                          {isDataStale(sameNewData.lastUpdate) && <span className="ml-1 text-[10px] text-amber-300/70">stale</span>}
                        </div>
                      </td>
                      <td className="py-1.5">
                        {sameNewData.tokenUsed.toLocaleString()}
                        /
                        {sameNewData.tokenQuota.toLocaleString()}
                      </td>
                      <td className="py-1.5" title={new Date(sameNewData.nextReset).toLocaleString()}>
                        Reset:
                        {' '}
                        {new Date(sameNewData.nextReset).toLocaleDateString()}
                      </td>
                      <td className="py-1.5">{sameNewData.lastUpdate ? formatRelativeTime(sameNewData.lastUpdate) : 'N/A'}</td>
                      <td className="py-1.5">
                        <div className="flex items-center space-x-1">
                          <ProgressBar
                            compact
                            max={sameNewData.tokenQuota}
                            value={sameNewData.tokenUsed}
                          />
                          <span className="text-xs text-slate-500">
                            {Math.round((sameNewData.tokenUsed / sameNewData.tokenQuota) * 100)}
                            %
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                }

                // Default fallback row
                return (
                  <tr className="border-b border-slate-100" key={service.name}>
                    <td className="py-1.5 pl-1">
                      <div className="flex items-center">
                        <span className="text-slate-700">{service.name}</span>
                        {isDataStale(service.lastUpdate) && <span className="ml-1 text-[10px] text-amber-300/70">stale</span>}
                      </div>
                    </td>
                    <td className="py-1.5">
                      {service.usagePercentage}
                      %
                    </td>
                    <td className="py-1.5">-</td>
                    <td className="py-1.5">{formatRelativeTime(service.lastUpdate)}</td>
                    <td className="py-1.5">
                      <div className="flex items-center space-x-1">
                        <ProgressBar compact max={100} value={service.usagePercentage} />
                        <span className="text-xs text-slate-500">
                          {service.usagePercentage}
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

      {/* Cursor Section - display if it exists in sorted services */}
      {sortedServices.some(service => service.name === 'Cursor') && cursorInvoiceData && cursorHardLimitData && (
        <div className="mb-4">
          <div className="mb-1 flex items-center">
            <span className="text-sm font-medium text-slate-600">Cursor</span>
            <span className="ml-1.5 rounded-sm bg-blue-50 px-1 py-0.5 text-xs text-blue-600">
              {isDataStale(cursorInvoiceData?.lastUpdate || 0) ? 'Stale' : 'Active'}
            </span>
            <a className="ml-auto text-xs text-slate-400 hover:text-slate-600" href={SERVICE_URLS.Cursor} target="_blank">Visit →</a>
          </div>

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
                  value={cursorInvoiceData.totalCents}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Same.new Section - detailed view */}
      {sortedServices.some(service => service.name === 'Same.new') && sameNewData && (
        <div className="mb-4">
          <div className="mb-1 flex items-center">
            <span className="text-sm font-medium text-slate-600">Same.new</span>
            <span className="ml-1.5 rounded-sm bg-blue-50 px-1 py-0.5 text-xs text-blue-600">
              {isDataStale(sameNewData.lastUpdate) ? 'Stale' : 'Active'}
            </span>
            <a className="ml-auto text-xs text-slate-400 hover:text-slate-600" href={SERVICE_URLS['Same.new']} target="_blank">Visit →</a>
          </div>

          <div className="rounded border border-slate-200 bg-white p-2">
            <div className="mb-1.5 text-xs font-medium text-slate-600">Token Usage</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Used Tokens</span>
                  <span>{sameNewData.tokenUsed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Quota</span>
                  <span>{sameNewData.tokenQuota.toLocaleString()}</span>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Reset</span>
                  <span>{new Date(sameNewData.lastReset).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Next Reset</span>
                  <span>{new Date(sameNewData.nextReset).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Subscription</span>
                  <span>{sameNewData.isSubscription ? 'Yes' : 'No'}</span>
                </div>
              </div>
              <div className="col-span-2 mt-1">
                <ProgressBar
                  max={sameNewData.tokenQuota}
                  value={sameNewData.tokenUsed}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!grokData && !v0Data && !boltData && !recraftData && !elevenLabsData && !customAIData && !cursorInvoiceData && !sameNewData && (
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
