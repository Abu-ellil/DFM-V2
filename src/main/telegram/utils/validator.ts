/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserRole, RegistrationStep } from '../types'

export class Validator {
  // Validate phone number (supports various formats)
  static validatePhone(phone: string): boolean {
    // Remove spaces, dashes, and parentheses
    const cleaned = phone.replace(/[\s\-\(\)]/g, '')

    // Check if it matches common phone patterns
    // Supports: +966..., 05..., 5..., etc.
    const phoneRegex = /^(\+?966|0)?5\d{8}$/
    return phoneRegex.test(cleaned)
  }

  // Validate Arabic name (at least 3 words, Arabic letters only)
  static validateName(name: string): boolean {
    // Check if name has at least 3 words
    const words = name.trim().split(/\s+/)
    if (words.length < 3) return false

    // Check if all words contain Arabic letters
    const arabicNameRegex = /^[\u0600-\u06FF\s]+$/
    return arabicNameRegex.test(name.trim()) && name.trim().length >= 10
  }

  // Validate role
  static validateRole(role: string): role is UserRole {
    return ['owner', 'manager', 'worker'].includes(role)
  }

  // Validate registration step
  static validateStep(step: number): step is RegistrationStep {
    return step >= 1 && step <= 5
  }

  // Validate reason text
  static validateReason(reason: string): boolean {
    const trimmed = reason.trim()
    return trimmed.length >= 20 && trimmed.length <= 500
  }

  // Validate Telegram ID
  static validateTelegramId(telegramId: number): boolean {
    return telegramId > 0 && Number.isInteger(telegramId)
  }

  // Validate message text length
  static validateMessageLength(message: string, maxLength: number = 4096): boolean {
    return message.length > 0 && message.length <= maxLength
  }

  // Validate notification type
  static validateNotificationType(type: string): boolean {
    const validTypes = ['report', 'alert', 'task', 'registration', 'system']
    return validTypes.includes(type)
  }

  // Validate priority
  static validatePriority(priority: string): boolean {
    const validPriorities = ['low', 'normal', 'high', 'urgent']
    return validPriorities.includes(priority)
  }

  // Validate user status
  static validateUserStatus(status: string): boolean {
    const validStatuses = ['pending', 'active', 'inactive', 'suspended']
    return validStatuses.includes(status)
  }

  // Validate time format (HH:MM)
  static validateTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    return timeRegex.test(time)
  }

  // Sanitize user input to prevent XSS/injection
  static sanitize(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim()
  }

  // Validate and sanitize registration data
  static validateRegistrationData(data: {
    full_name?: string
    phone?: string
    requested_role?: string
    reason?: string
  }): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {}

    if (data.full_name !== undefined) {
      if (!data.full_name || data.full_name.trim() === '') {
        errors.full_name = 'الاسم مطلوب'
      } else if (!this.validateName(data.full_name)) {
        errors.full_name = 'الاسم يجب أن يكون ثلاثي كاملاً باللغة العربية'
      }
    }

    if (data.phone !== undefined) {
      if (!data.phone || data.phone.trim() === '') {
        errors.phone = 'رقم الهاتف مطلوب'
      } else if (!this.validatePhone(data.phone)) {
        errors.phone = 'رقم الهاتف غير صالح (يجب أن يبدأ بـ 05 أو 5)'
      }
    }

    if (data.requested_role !== undefined) {
      if (!data.requested_role || !this.validateRole(data.requested_role)) {
        errors.requested_role = 'نوع الحساب غير صالح'
      }
    }

    if (data.reason !== undefined) {
      if (!data.reason || data.reason.trim() === '') {
        errors.reason = 'سبب التسجيل مطلوب'
      } else if (!this.validateReason(data.reason)) {
        errors.reason = 'سبب التسجيل يجب أن يكون بين 20 و 500 حرف'
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    }
  }

  // Validate pagination parameters
  static validatePagination(page: number, limit: number): { valid: boolean; errors?: string } {
    if (page < 1) {
      return { valid: false, errors: 'رقم الصفحة يجب أن يكون أكبر من صفر' }
    }

    if (limit < 1 || limit > 100) {
      return { valid: false, errors: 'عدد النتائج يجب أن يكون بين 1 و 100' }
    }

    return { valid: true }
  }

  // Check if within quiet hours
  static isWithinQuietHours(currentTime: Date, quietStart?: string, quietEnd?: string): boolean {
    if (!quietStart || !quietEnd) return false

    const [startHour, startMinute] = quietStart.split(':').map(Number)
    const [endHour, endMinute] = quietEnd.split(':').map(Number)

    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()
    const startMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute

    // Handle case where quiet hours span midnight
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes
    }

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes
  }

  // Validate command permission
  static hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      owner: 3,
      manager: 2,
      worker: 1
    }

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
  }
}

// Rate limiting utility
export class RateLimiter {
  private static requests: Map<number, { count: number; resetTime: number }> = new Map()
  private static readonly MAX_REQUESTS = 20
  private static readonly WINDOW_MS = 60 * 1000 // 1 minute

  static check(telegramId: number): boolean {
    const now = Date.now()
    const userRequests = this.requests.get(telegramId)

    if (!userRequests || now > userRequests.resetTime) {
      this.requests.set(telegramId, { count: 1, resetTime: now + this.WINDOW_MS })
      return true
    }

    if (userRequests.count >= this.MAX_REQUESTS) {
      return false
    }

    userRequests.count++
    return true
  }

  static reset(telegramId: number): void {
    this.requests.delete(telegramId)
  }

  static getRemaining(telegramId: number): number {
    const userRequests = this.requests.get(telegramId)
    if (!userRequests || Date.now() > userRequests.resetTime) {
      return this.MAX_REQUESTS
    }
    return Math.max(0, this.MAX_REQUESTS - userRequests.count)
  }
}
