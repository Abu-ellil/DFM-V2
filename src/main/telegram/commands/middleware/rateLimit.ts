import { RateLimiter } from '../../utils/validator'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime?: number
}

export function checkRateLimit(telegramId: number): RateLimitResult {
  const allowed = RateLimiter.check(telegramId)
  const remaining = RateLimiter.getRemaining(telegramId)

  return {
    allowed,
    remaining,
    resetTime: Date.now() + 60 * 1000 // 1 minute from now
  }
}

export function getRateLimitMessage(): string {
  return `⚠️ لقد تجاوزت الحد المسموح من الطلبات. يرجى المحاولة مرة أخرى بعد دقيقة واحدة.`
}
