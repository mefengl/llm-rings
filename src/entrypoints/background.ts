import addPermissionToggle from 'webext-permission-toggle'

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

interface ElevenLabsResponse {
  subscription: {
    character_count: number
    character_limit: number
  }
}

interface CustomAIResponse {
  load: string
  show_quick_switch: boolean
  user_limit: number
  user_limit_duration: string
  user_usage: number
}

interface SunoResponse {
  credits: number
  monthly_limit: number
  monthly_usage: number
  plans: Array<{
    features: string
    level: number
    name: string
  }>
  total_credits_left: number
}

interface RequestHeader {
  name: string
  value: string
}

export default defineBackground(() => {
  // Add permission toggle
  addPermissionToggle()

  browser.webRequest.onSendHeaders.addListener(
    throttle(async (details) => {
      const now = Date.now()

      if (details.url.includes('v0.dev/chat')) {
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
      const getHeader = (name: string) => headers.find((h: RequestHeader) => h.name.toLowerCase() === name.toLowerCase())?.value

      if (details.url.includes('recraft.ai')) {
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

      if (details.url.includes('elevenlabs.io/v1/workspace')) {
        try {
          const response = await fetch(details.url)
          const data: ElevenLabsResponse = await response.json()
          await storage.setItem('local:elevenLabsLimit', {
            characterCount: data.subscription.character_count,
            characterLimit: data.subscription.character_limit,
            lastUpdate: now,
          })
        }
        catch (error) {
          console.error('Error fetching elevenlabs.io limit:', error)
        }
      }

      if (details.url.includes('/backend-api/usage')) {
        try {
          const response = await fetch(details.url)
          const data: CustomAIResponse = await response.json()
          await storage.setItem('local:customAILimit', {
            characterCount: data.user_usage,
            characterLimit: data.user_limit,
            domainName: new URL(details.url).hostname,
            lastUpdate: now,
            period: data.user_limit_duration,
          })
        }
        catch (error) {
          console.error('Error fetching custom AI limit:', error)
        }
      }

      if (details.url.includes('suno.com/api/billing/info')) {
        try {
          const response = await fetch(details.url)
          const data: SunoResponse = await response.json()
          await storage.setItem('local:sunoLimit', {
            credits: data.total_credits_left,
            lastUpdate: now,
            monthlyLimit: data.monthly_limit,
            monthlyUsage: data.monthly_usage,
          })
        }
        catch (error) {
          console.error('Error fetching suno.com limit:', error)
        }
      }
    }, 2000),
    {
      types: ['xmlhttprequest'],
      urls: [
        'https://v0.dev/chat/api/rate-limit*',
        'https://bolt.new/api/rate-limits*',
        'https://api.recraft.ai/users/me',
        'https://api.us.elevenlabs.io/v1/workspace',
        '*://*/backend-api/usage*',
        'https://studio-api.prod.suno.com/api/billing/info*',
      ],
    },
    ['requestHeaders', 'extraHeaders'],
  )
})
