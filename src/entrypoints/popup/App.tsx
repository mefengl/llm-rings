import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

function useStorage<T>(key: string) {
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

function ProgressBar({ max, value }: { max: number, value: number }) {
  const usage = max - value
  const percentage = Math.min((usage / max) * 100, 100)
  const getBarColor = (percentage: number) => {
    if (percentage >= 90)
      return 'bg-green-600'
    if (percentage >= 70)
      return 'bg-green-500'
    if (percentage >= 40)
      return 'bg-green-400'
    return 'bg-green-300'
  }

  const getEncouragementMessage = (percentage: number) => {
    if (percentage >= 90)
      return 'Amazing usage! You\'re making the most of it! 🚀'
    if (percentage >= 70)
      return 'Great progress! Keep going! 💪'
    if (percentage >= 40)
      return 'You\'re doing well! More to explore! ✨'
    return 'Just getting started! Unleash the potential! 🌱'
  }

  return (
    <div className="space-y-2">
      <div className="w-full h-2 bg-gray-200 rounded-full">
        <div
          className={`h-full rounded-full transition-all ${getBarColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs italic text-center text-gray-600">
        {getEncouragementMessage(percentage)}
      </p>
    </div>
  )
}

function StatsCard({ stats, title }: { stats: Record<string, string>, title: string }) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <h3 className="mb-2 text-lg font-medium">{title}</h3>
      <div className="space-y-2">
        {Object.entries(stats).map(([key, value]) => (
          <div className="flex justify-between text-sm" key={key}>
            <span className="text-gray-500">{key}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function App() {
  const v0Data = useStorage<V0RateLimit>('local:v0RateLimit')
  const boltData = useStorage<BoltRateLimit>('local:boltRateLimit')
  const recraftData = useStorage<RecraftLimit>('local:recraftLimit')

  return (
    <div className="w-[300px] space-y-4 p-4">
      <div className="space-y-4">
        <div className="space-y-4">
          {v0Data
            ? (
                <>
                  <StatsCard
                    stats={{
                      'Last Update': v0Data.lastUpdate ? formatRelativeTime(v0Data.lastUpdate) : 'N/A',
                      'Reset': new Date(v0Data.reset).toLocaleString(),
                      'Used': `${v0Data.limit - v0Data.remaining}/${v0Data.limit}`,
                    }}
                    title="V0.dev"
                  />
                  <ProgressBar max={v0Data.limit} value={v0Data.remaining} />
                </>
              )
            : (
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">V0.dev</h3>
                  <p className="text-sm text-gray-500">No usage data available yet</p>
                  <Button asChild className="w-full" variant="outline">
                    <a href="https://v0.dev/chat" target="_blank">Try V0.dev</a>
                  </Button>
                </div>
              )}
        </div>

        <div className="space-y-4">
          {boltData
            ? (
                <>
                  <StatsCard
                    stats={{
                      'Last Update': boltData.lastUpdate ? formatRelativeTime(boltData.lastUpdate) : 'N/A',
                      'Month': `${boltData.totalThisMonth.toLocaleString()}/${boltData.maxPerMonth.toLocaleString()}`,
                      'Today': `${boltData.totalToday.toLocaleString()}/${boltData.maxPerDay.toLocaleString()}`,
                    }}
                    title="Bolt.new"
                  />
                  <ProgressBar max={boltData.maxPerDay} value={boltData.maxPerDay - boltData.totalToday} />
                </>
              )
            : (
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Bolt.new</h3>
                  <p className="text-sm text-gray-500">No usage data available yet</p>
                  <Button asChild className="w-full" variant="outline">
                    <a href="https://bolt.new" target="_blank">Try Bolt.new</a>
                  </Button>
                </div>
              )}
        </div>

        <div className="space-y-4">
          {recraftData
            ? (
                <>
                  <StatsCard
                    stats={{
                      'Last Update': recraftData.lastUpdate ? formatRelativeTime(recraftData.lastUpdate) : 'N/A',
                      'Period': recraftData.period,
                      'Reset': new Date(recraftData.resetTime).toLocaleString(),
                      'Used': `${recraftData.total - recraftData.remaining}/${recraftData.total}`,
                    }}
                    title="Recraft.ai"
                  />
                  <ProgressBar max={recraftData.total} value={recraftData.remaining} />
                </>
              )
            : (
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Recraft.ai</h3>
                  <p className="text-sm text-gray-500">No usage data available yet</p>
                  <Button asChild className="w-full" variant="outline">
                    <a href="https://recraft.ai" target="_blank">Try Recraft.ai</a>
                  </Button>
                </div>
              )}
        </div>
      </div>
    </div>
  )
}

export default App
