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
  limit: number
  remaining: number
  reset: number
}

interface BoltRateLimit {
  maxPerDay: number
  maxPerMonth: number
  totalThisMonth: number
  totalToday: number
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
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all ${getBarColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-center text-xs italic text-gray-600">
        {getEncouragementMessage(percentage)}
      </p>
    </div>
  )
}

function StatsCard({ stats, title }: { stats: Record<string, string>, title: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
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

  if (!v0Data || !boltData) {
    return (
      <div className="flex w-[300px] flex-col gap-4 p-4">
        <Button asChild variant="outline">
          <a href="https://v0.dev/chat" target="_blank">Try V0.dev</a>
        </Button>
        <Button asChild variant="outline">
          <a href="https://bolt.new" target="_blank">Try Bolt.new</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="w-[300px] space-y-4 p-4">
      <div className="space-y-4">
        <StatsCard
          stats={{
            Reset: new Date(v0Data.reset).toLocaleString(),
            Used: `${v0Data.limit - v0Data.remaining}/${v0Data.limit}`,
          }}
          title="V0.dev"
        />
        <ProgressBar max={v0Data.limit} value={v0Data.remaining} />
      </div>

      <div className="space-y-4">
        <StatsCard
          stats={{
            Month: `${boltData.totalThisMonth.toLocaleString()}/${boltData.maxPerMonth.toLocaleString()}`,
            Today: `${boltData.totalToday.toLocaleString()}/${boltData.maxPerDay.toLocaleString()}`,
          }}
          title="Bolt.new"
        />
        <ProgressBar max={boltData.maxPerDay} value={boltData.maxPerDay - boltData.totalToday} />
      </div>
    </div>
  )
}

export default App
