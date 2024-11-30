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
  lastUpdate?: number
  limit: number
  remaining: number
  reset: number
}

interface BoltRateLimit {
  billingPeriod: null | string
  lastUpdate?: number
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

interface RecraftUser {
  credits: number
  plan: {
    credits_per_period: number
    refill_period: string
  }
  subscription: {
    credits_expire_time: string
  }
}

interface NotionRateLimit {
  isEligible: boolean
  lastUpdate?: number
  spaceLimit: number
  spaceUsage: number
  type: string
  userLimit: number
  userUsage: number
}

async function checkAndRemoveExpiredData(key: string, resetTime: number) {
  const now = Date.now()
  if (now > resetTime) {
    await storage.removeItem(key)
  }
}

// Listen for API requests
export default defineBackground(() => {
  browser.webRequest.onSendHeaders.addListener(
    throttle(async (details) => {
      const now = Date.now()

      if (details.url.includes('v0.dev/chat')) {
        const storedData = await storage.getItem('local:v0RateLimit')
        if (storedData) {
          await checkAndRemoveExpiredData('local:v0RateLimit', storedData.reset)
        }
        try {
          const response = await fetch(details.url)
          const data: V0RateLimit = await response.json()
          await storage.setItem('local:v0RateLimit', { ...data, lastUpdate: now })
        }
        catch (error) {
          console.error('Error fetching v0.dev rate limit:', error)
        }
      }

      if (details.url.includes('bolt.new')) {
        const storedData = await storage.getItem('local:boltRateLimit')
        if (storedData) {
          await checkAndRemoveExpiredData('local:boltRateLimit', storedData.nextTier.limits.perMonth)
        }
        try {
          const response = await fetch(details.url)
          const data: BoltRateLimit = await response.json()
          await storage.setItem('local:boltRateLimit', { ...data, lastUpdate: now })
        }
        catch (error) {
          console.error('Error fetching bolt.new rate limit:', error)
        }
      }

      const headers = details.requestHeaders || []
      const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value

      if (details.url.includes('recraft.ai')) {
        const storedData = await storage.getItem('local:recraftLimit')
        if (storedData) {
          await checkAndRemoveExpiredData('local:recraftLimit', storedData.resetTime)
        }
        try {
          const response = await fetch(details.url, {
            headers: {
              authorization: getHeader('authorization') || '',
            },
          })
          const data: RecraftUser = await response.json()
          await storage.setItem('local:recraftLimit', {
            lastUpdate: now,
            period: data.plan.refill_period,
            remaining: data.credits,
            resetTime: new Date(data.subscription.credits_expire_time).getTime(),
            total: data.plan.credits_per_period,
          })
        }
        catch (error) {
          console.error('Error fetching recraft.ai limit:', error)
        }
      }

      if (details.url.includes('notion.so/api/v3/getAIUsageEligibility')) {
        const storedData = await storage.getItem('local:notionRateLimit')
        if (storedData) {
          await checkAndRemoveExpiredData('local:notionRateLimit', storedData.reset)
        }
        try {
          const activeUser = getHeader('x-notion-active-user-header')
          const spaceId = getHeader('x-notion-space-id')
          const response = await fetch(details.url, {
            body: JSON.stringify({
              spaceId: spaceId || '',
            }),
            headers: {
              'content-type': 'application/json',
              'x-notion-active-user-header': activeUser || '',
              'x-notion-space-id': spaceId || '',
            },
            method: 'POST',
          })
          const data: NotionRateLimit = await response.json()
          await storage.setItem('local:notionRateLimit', { ...data, lastUpdate: now })
        }
        catch (error) {
          console.error('Error fetching notion rate limit:', error)
        }
      }
    }, 2000),
    {
      types: ['xmlhttprequest'],
      urls: [
        'https://v0.dev/chat/api/rate-limit*',
        'https://bolt.new/api/rate-limits*',
        'https://api.recraft.ai/users/me',
        'https://www.notion.so/api/v3/getAIUsageEligibility*',
      ],
    },
    ['requestHeaders', 'extraHeaders'],
  )
})
