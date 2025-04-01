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

interface CursorInvoice {
  items: {
    cents: number
    description: string
  }[]
  pricingDescription: {
    description: string
    id: string
  }
}

interface CursorUsage {
  'gpt-3.5-turbo': {
    maxRequestUsage: null | number
    maxTokenUsage: null | number
    numRequests: number
    numRequestsTotal: number
    numTokens: number
  }
  'gpt-4': {
    maxRequestUsage: number
    maxTokenUsage: null | number
    numRequests: number
    numRequestsTotal: number
    numTokens: number
  }
  'gpt-4-32k': {
    maxRequestUsage: number
    maxTokenUsage: null | number
    numRequests: number
    numRequestsTotal: number
    numTokens: number
  }
  'startOfMonth': string
}

interface CursorHardLimit {
  hardLimit: number
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
    character_count_reported: number
    character_limit: number
    last_character_limit_reset_unix: number
    next_character_limit_reset_unix: number
    tier: string
  }
}

interface CustomAIResponse {
  load: string
  show_quick_switch: boolean
  user_limit: number
  user_limit_duration: string
  user_usage: number
}

interface RequestHeader {
  name: string
  value: string
}

interface GrokRateLimitResponse {
  remainingQueries: number
  waitTimeSeconds?: number
  windowSizeSeconds: number
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

interface ChatGPTLimitResponse {
  banner_info: null
  blocked_features: any[]
  default_model_slug: string
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
  type: string
}

// We'll use this interface for actual storage
interface ChatGPTLimitStorage {
  default_model_slug: string
  lastUpdate: number
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

interface SameNewSubscription {
  canceledAt: null | string
  endedAt: null | string
  estimatedCost: number
  isActive: boolean
  isSubscription: boolean
  lastResetAt: string
  nextResetAt: number
  startedAt: null | string
  tokensQuota: number
  totalPurchasedTokens: number
  totalTokenUsed: number
  usedPurchasedTokens: number
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

      if (details.url.includes('api.us.elevenlabs.io/v1/workspace')) {
        try {
          const response = await fetch(details.url, {
            headers: {
              'xi-api-key': getHeader('xi-api-key') || '',
            },
          })
          const data: ElevenLabsResponse = await response.json()
          await storage.setItem('local:elevenLabsLimit', {
            characterCount: data.subscription.character_count + data.subscription.character_count_reported,
            characterLimit: data.subscription.character_limit,
            lastReset: data.subscription.last_character_limit_reset_unix * 1000,
            lastUpdate: now,
            nextReset: data.subscription.next_character_limit_reset_unix * 1000,
            tier: data.subscription.tier,
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

      if (details.url.includes('grok.com/rest/rate-limits')) {
        try {
          const requestBody = JSON.parse(details.requestBody?.raw?.[0]?.bytes || '{}')
          const type = requestBody.requestKind as keyof GrokRateLimit

          const response = await fetch(details.url, {
            body: JSON.stringify({
              modelName: 'grok-3',
              requestKind: type || 'DEFAULT',
            }),
            headers: {
              'accept': '*/*',
              'content-type': 'application/json',
              'origin': 'https://grok.com',
              'referer': details.referer || 'https://grok.com',
            },
            method: 'POST',
          })
          const data: GrokRateLimitResponse = await response.json()

          // Get existing limits
          const existingLimits = await storage.getItem<GrokRateLimit>('local:grokLimit') || {}

          // Update only the specific type
          await storage.setItem('local:grokLimit', {
            ...existingLimits,
            [type]: {
              ...data,
              lastUpdate: now,
            },
          })
        }
        catch (error) {
          console.error('Error fetching grok.com limit:', error)
        }
      }

      if (details.url.includes('cursor.com/api/dashboard/get-monthly-invoice')) {
        try {
          // Get current date to use for the request
          const date = new Date()
          const month = date.getMonth() + 1 // JavaScript months are 0-indexed
          const year = date.getFullYear()

          const response = await fetch(details.url, {
            body: JSON.stringify({
              includeUsageEvents: false,
              month,
              year,
            }),
            headers: {
              'accept': '*/*',
              'content-type': 'application/json',
              'origin': 'https://www.cursor.com',
              'referer': details.referer || 'https://www.cursor.com/settings',
            },
            method: 'POST',
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const data: CursorInvoice = await response.json()

          if (!data || !data.items) {
            throw new Error('Invalid response data from cursor.com')
          }

          // Calculate total usage in cents, excluding negative values (Mid-month usage paid)
          const totalCents = data.items
            .filter(item => item.cents > 0)
            .reduce((sum, item) => sum + item.cents, 0)

          await storage.setItem('local:cursorUsage', {
            items: data.items,
            lastUpdate: now,
            pricing: data.pricingDescription?.description || 'Unknown',
            totalCents,
          })
        }
        catch (error) {
          console.error('Error fetching cursor.com usage data:', error)
        }
      }

      if (details.url.includes('cursor.com/api/usage')) {
        try {
          const response = await fetch(details.url, {
            headers: {
              'accept': '*/*',
              'content-type': 'application/json',
              'origin': 'https://www.cursor.com',
              'referer': details.referer || 'https://www.cursor.com/settings',
            },
            method: 'GET',
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const data: CursorUsage = await response.json()

          if (!data) {
            throw new Error('Invalid response data from cursor.com/api/usage')
          }

          // Store model usage statistics
          await storage.setItem('local:cursorModelUsage', {
            lastUpdate: now,
            models: {
              'gpt-3.5-turbo': {
                tokens: data['gpt-3.5-turbo']?.numTokens || 0,
                total: data['gpt-3.5-turbo']?.maxRequestUsage || 0,
                used: data['gpt-3.5-turbo']?.numRequests || 0,
              },
              'gpt-4': {
                tokens: data['gpt-4']?.numTokens || 0,
                total: data['gpt-4']?.maxRequestUsage || 0,
                used: data['gpt-4']?.numRequests || 0,
              },
              'gpt-4-32k': {
                tokens: data['gpt-4-32k']?.numTokens || 0,
                total: data['gpt-4-32k']?.maxRequestUsage || 0,
                used: data['gpt-4-32k']?.numRequests || 0,
              },
            },
            startOfMonth: data.startOfMonth || new Date().toISOString(),
          })
        }
        catch (error) {
          console.error('Error fetching cursor.com model usage data:', error)
        }
      }

      if (details.url.includes('cursor.com/api/dashboard/get-hard-limit')) {
        try {
          const response = await fetch(details.url, {
            body: JSON.stringify({}),
            headers: {
              'accept': '*/*',
              'content-type': 'application/json',
              'origin': 'https://www.cursor.com',
              'referer': details.referer || 'https://www.cursor.com/settings',
            },
            method: 'POST',
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const data: CursorHardLimit = await response.json()

          if (!data || typeof data.hardLimit !== 'number') {
            throw new Error('Invalid hard limit data from cursor.com')
          }

          await storage.setItem('local:cursorHardLimit', {
            hardLimit: data.hardLimit,
            lastUpdate: now,
          })
        }
        catch (error) {
          console.error('Error fetching cursor.com hard limit data:', error)
        }
      }

      if (details.url.includes('chatgpt.com/backend-api/conversation/init')
        || details.url.includes('chat.openai.com/backend-api/conversation/init')) {
        try {
          const response = await fetch(details.url, {
            body: details.requestBody?.raw?.[0]?.bytes
              ? JSON.stringify(JSON.parse(new TextDecoder().decode(details.requestBody.raw[0].bytes)))
              : JSON.stringify({ requested_default_model: 'gpt-4o' }),
            headers: {
              'accept': '*/*',
              'authorization': getHeader('authorization') || '',
              'content-type': 'application/json',
              'origin': new URL(details.url).origin,
              'referer': details.referer || new URL(details.url).origin,
            },
            method: 'POST',
          })

          const data: ChatGPTLimitResponse = await response.json()

          await storage.setItem('local:chatGPTLimit', {
            default_model_slug: data.default_model_slug,
            lastUpdate: now,
            limits_progress: data.limits_progress,
            model_limits: data.model_limits,
          } as ChatGPTLimitStorage)
        }
        catch (error) {
          console.error('Error fetching ChatGPT limit:', error)
        }
      }

      if (details.url.includes('same.new/api/payment/subscriptions')) {
        try {
          const response = await fetch(details.url, {
            headers: {
              'accept': '*/*',
              'content-type': 'application/json',
              'origin': 'https://same.new',
              'referer': details.referer || 'https://same.new',
            },
            method: 'GET',
          })
          const data: SameNewSubscription = await response.json()

          await storage.setItem('local:sameNewLimit', {
            isActive: data.isActive,
            isSubscription: data.isSubscription,
            lastReset: new Date(data.lastResetAt).getTime(),
            lastUpdate: now,
            nextReset: data.nextResetAt,
            tokenQuota: data.tokensQuota,
            tokenUsed: data.totalTokenUsed,
          })
        }
        catch (error) {
          console.error('Error fetching same.new subscription data:', error)
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
        'https://grok.com/rest/rate-limits*',
        '*://*/backend-api/usage*',
        'https://www.cursor.com/api/dashboard/get-monthly-invoice*',
        'https://www.cursor.com/api/usage*',
        'https://www.cursor.com/api/dashboard/get-hard-limit*',
        'https://chatgpt.com/backend-api/conversation/init*',
        'https://chat.openai.com/backend-api/conversation/init*',
        'https://same.new/api/payment/subscriptions*',
      ],
    },
    ['requestHeaders', 'extraHeaders'],
  )
})
