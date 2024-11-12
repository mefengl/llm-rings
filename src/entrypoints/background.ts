/* only run once during the period
 * run at the end of the period
 */
interface ThrottleFunction {
  (fn: (...args: any[]) => void, delay: number): (...args: any[]) => void
}
const throttle: ThrottleFunction = (fn, delay) => {
  let last = 0
  return (...args) => {
    const now = Date.now()
    if (now - last < delay)
      return
    last = now
    return fn(...args)
  }
}

// Define interfaces for API responses
interface V0RateLimit {
  limit: number
  remaining: number
  reset: number
}

interface BoltRateLimit {
  billingPeriod: null | string
  maxPerDay: number
  maxPerMonth: number
  nextTier: {
    level: number
    limits: {
      perDay: number
      perMonth: number
    }
    type: string
  }
  overflow: {
    available: number
    used: number
  }
  totalThisMonth: number
  totalToday: number
}

// Listen for API requests
export default defineBackground(() => {
  browser.webRequest.onCompleted.addListener(
    throttle(async (details) => {
      if (details.url.includes('v0.dev/chat')) {
        try {
          const response = await fetch(details.url)
          const data: V0RateLimit = await response.json()
          await storage.setItem('local:v0RateLimit', data)
        }
        catch (error) {
          console.error('Error fetching v0.dev rate limit:', error)
        }
      }

      if (details.url.includes('bolt.new')) {
        try {
          const response = await fetch(details.url)
          const data: BoltRateLimit = await response.json()
          await storage.setItem('local:boltRateLimit', data)
        }
        catch (error) {
          console.error('Error fetching bolt.new rate limit:', error)
        }
      }
    }, 2000),
    {
      urls: [
        'https://v0.dev/chat/api/rate-limit*',
        'https://bolt.new/api/rate-limits*',
      ],
    },
  )
})
