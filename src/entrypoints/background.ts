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

interface V0PlanInfo {
  balance: { remaining: number, total: number }
  billingCycle: { end: number, start: number }
  onDemand: { balance: number }
  plan: string
  role: string
}

function adaptPlanInfo(p: V0PlanInfo, now: number): V0RateLimit {
  return {
    lastUpdate: now,
    limit: p.balance.total,
    remaining: p.balance.remaining,
    reset: p.billingCycle.end,
  }
}

export default defineBackground(() => {
  // Add permission toggle
  addPermissionToggle()

  browser.webRequest.onSendHeaders.addListener(
    throttle(async (details) => {
      const now = Date.now()

      if (details.url.includes('v0.dev/chat/api/plan-info')) {
        try {
          const response = await fetch(details.url)
          const plan: V0PlanInfo = await response.json()
          const data = adaptPlanInfo(plan, now)
          await storage.setItem('local:v0RateLimit', data)
          // scheduleReminder(data) // Commented out as scheduleReminder is not defined
        }
        catch (err) {
          console.error('Error fetching v0.dev plan-info:', err)
        }
      }
    }, 2000),
    {
      types: ['xmlhttprequest'],
      urls: [
        'https://v0.dev/chat/api/plan-info*',
      ],
    },
    [],
  )
})
