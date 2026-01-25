/* eslint-disable @typescript-eslint/no-explicit-any */
import TelegramBot from 'node-telegram-bot-api'
import { TelegramUser, RegistrationRequest, UserRole } from '../types'
import { getDb, saveDatabase } from '../../db'

export class RegistrationHandler {
  private bot: TelegramBot | null = null

  constructor(bot?: TelegramBot) {
    if (bot) {
      this.bot = bot
    }
  }

  setBot(bot: TelegramBot): void {
    this.bot = bot
  }

  /**
   * Get all registration requests with optional filtering
   */
  async getRegistrations(filters?: {
    status?: 'pending' | 'approved' | 'rejected'
    limit?: number
    offset?: number
  }): Promise<RegistrationRequest[]> {
    try {
      const db = getDb()

      let query = 'SELECT * FROM telegram_registrations'
      const params: any[] = []

      if (filters?.status) {
        query += ' WHERE status = ?'
        params.push(filters.status)
      }

      query += ' ORDER BY requested_at DESC'

      if (filters?.limit) {
        query += ' LIMIT ?'
        params.push(filters.limit)

        if (filters?.offset) {
          query += ' OFFSET ?'
          params.push(filters.offset)
        }
      }

      const stmt = db.prepare(query)
      params.forEach((param) => stmt.bind([param]))

      const registrations: RegistrationRequest[] = []
      while (stmt.step()) {
        registrations.push(stmt.getAsObject() as any)
      }
      stmt.free()

      return registrations
    } catch (error) {
      console.error('Error getting registrations:', error)
      return []
    }
  }

  /**
   * Get a single registration by ID
   */
  async getRegistration(id: number): Promise<RegistrationRequest | null> {
    try {
      const db = getDb()
      const stmt = db.prepare('SELECT * FROM telegram_registrations WHERE id = ?')
      stmt.bind([id])

      let registration: RegistrationRequest | null = null

      if (stmt.step()) {
        registration = stmt.getAsObject() as any
      }

      stmt.free()
      return registration
    } catch (error) {
      console.error('Error getting registration:', error)
      return null
    }
  }

  /**
   * Approve a registration request
   */
  async approveRegistration(
    registrationId: number,
    role: UserRole,
    reviewerUserId: number
  ): Promise<{ success: boolean; message?: string; user?: TelegramUser }> {
    try {
      const db = getDb()

      // Get registration
      const registration = await this.getRegistration(registrationId)
      if (!registration) {
        return { success: false, message: 'طلب التسجيل غير موجود' }
      }

      if (registration.status !== 'pending') {
        return { success: false, message: 'هذا الطلب تمت معالجته مسبقاً' }
      }

      // Check if user already exists
      const checkStmt = db.prepare('SELECT * FROM telegram_users WHERE telegram_id = ?')
      checkStmt.bind([registration.telegram_id])

      let existingUser: any = null
      if (checkStmt.step()) {
        existingUser = checkStmt.getAsObject()
      }
      checkStmt.free()

      if (existingUser) {
        // Update existing user
        const updateStmt = db.prepare('UPDATE telegram_users SET status = ? WHERE telegram_id = ?')
        updateStmt.bind(['active', registration.telegram_id])
        updateStmt.run()
        updateStmt.free()

        // Update role if different
        if (existingUser.user_id) {
          const roleCheckStmt = db.prepare('SELECT * FROM user_roles WHERE user_id = ?')
          roleCheckStmt.bind([existingUser.user_id])
          const hasRole = roleCheckStmt.step()
          roleCheckStmt.free()

          if (!hasRole) {
            const insertRoleStmt = db.prepare(
              'INSERT INTO user_roles (user_id, role, assigned_by) VALUES (?, ?, ?)'
            )
            insertRoleStmt.bind([existingUser.user_id, role, reviewerUserId])
            insertRoleStmt.run()
            insertRoleStmt.free()
          }
        }
      } else {
        // Create new user
        const insertUserStmt = db.prepare(`
          INSERT INTO telegram_users
          (telegram_id, username, first_name, last_name, phone, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `)

        // Parse full name
        const nameParts = (registration.full_name || '').split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        insertUserStmt.bind([
          registration.telegram_id,
          null, // username will be set by Telegram
          firstName,
          lastName,
          registration.phone || null,
          'active'
        ])
        insertUserStmt.run()
        insertUserStmt.free()

        // Get new user ID
        const userIdStmt = db.prepare('SELECT last_insert_rowid() as id')
        userIdStmt.step()
        const userIdResult = userIdStmt.getAsObject() as any
        userIdStmt.free()

        // Assign role
        const roleStmt = db.prepare(
          'INSERT INTO user_roles (user_id, role, assigned_by) VALUES (?, ?, ?)'
        )
        roleStmt.bind([userIdResult.id, role, reviewerUserId])
        roleStmt.run()
        roleStmt.free()
      }

      // Update registration status
      const updateRegStmt = db.prepare(`
        UPDATE telegram_registrations
        SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      updateRegStmt.bind([reviewerUserId, registrationId])
      updateRegStmt.run()
      updateRegStmt.free()

      await saveDatabase()

      // Notify user
      if (this.bot) {
        await this.notifyUserApproved(registration.telegram_id, role)
      }

      // Get updated user
      const userStmt = db.prepare(`
        SELECT tu.*, ur.role
        FROM telegram_users tu
        LEFT JOIN user_roles ur ON tu.user_id = ur.user_id
        WHERE tu.telegram_id = ?
      `)
      userStmt.bind([registration.telegram_id])

      let user: TelegramUser | null = null
      if (userStmt.step()) {
        user = userStmt.getAsObject() as any
      }
      userStmt.free()

      return { success: true, user: user || undefined }
    } catch (error) {
      console.error('Error approving registration:', error)
      return { success: false, message: 'حدث خطأ أثناء قبول الطلب' }
    }
  }

  /**
   * Reject a registration request
   */
  async rejectRegistration(
    registrationId: number,
    reason?: string,
    reviewerUserId?: number
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const db = getDb()

      // Get registration
      const registration = await this.getRegistration(registrationId)
      if (!registration) {
        return { success: false, message: 'طلب التسجيل غير موجود' }
      }

      if (registration.status !== 'pending') {
        return { success: false, message: 'هذا الطلب تمت معالجته مسبقاً' }
      }

      // Update registration status
      const updateStmt = db.prepare(`
        UPDATE telegram_registrations
        SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      updateStmt.bind([reviewerUserId || null, registrationId])
      updateStmt.run()
      updateStmt.free()

      await saveDatabase()

      // Notify user
      if (this.bot) {
        await this.notifyUserRejected(registration.telegram_id, reason)
      }

      return { success: true }
    } catch (error) {
      console.error('Error rejecting registration:', error)
      return { success: false, message: 'حدث خطأ أثناء رفض الطلب' }
    }
  }

  /**
   * Notify user about approval
   */
  private async notifyUserApproved(telegramId: number, role: UserRole): Promise<void> {
    if (!this.bot) return

    try {
      const roleNames: Record<UserRole, string> = {
        owner: 'مالك',
        manager: 'مدير',
        worker: 'عامل'
      }

      const message = `
🎉 <b>مبارك! تم قبول طلب تسجيلك</b>

<i>تم تفعيل حسابك بنجاح</i>
<b>الدور:</b> ${roleNames[role]}

يمكنك الآن استخدام جميع الأوامر المتاحة لدورك.
ابدأ باستخدام الأمر /help لمعرفة المزيد.
      `

      await this.bot.sendMessage(telegramId, message, { parse_mode: 'HTML' })
    } catch (error) {
      console.error('Error notifying user about approval:', error)
    }
  }

  /**
   * Notify user about rejection
   */
  private async notifyUserRejected(telegramId: number, reason?: string): Promise<void> {
    if (!this.bot) return

    try {
      const message = `
❌ <b>تم رفض طلب التسجيل</b>

${reason ? `<b>السبب:</b> ${reason}` : 'يرجى التواصل مع المشرف للحصول على مزيد من المعلومات.'}

يمكنك المحاولة مرة أخرى لاحقاً باستخدام الأمر /register
      `

      await this.bot.sendMessage(telegramId, message, { parse_mode: 'HTML' })
    } catch (error) {
      console.error('Error notifying user about rejection:', error)
    }
  }

  /**
   * Get registration statistics
   */
  async getStats(): Promise<{
    pending: number
    approved: number
    rejected: number
    total: number
  }> {
    try {
      const db = getDb()

      const pendingStmt = db.prepare(
        "SELECT COUNT(*) as count FROM telegram_registrations WHERE status = 'pending'"
      )
      pendingStmt.step()
      const pending = (pendingStmt.getAsObject() as any).count
      pendingStmt.free()

      const approvedStmt = db.prepare(
        "SELECT COUNT(*) as count FROM telegram_registrations WHERE status = 'approved'"
      )
      approvedStmt.step()
      const approved = (approvedStmt.getAsObject() as any).count
      approvedStmt.free()

      const rejectedStmt = db.prepare(
        "SELECT COUNT(*) as count FROM telegram_registrations WHERE status = 'rejected'"
      )
      rejectedStmt.step()
      const rejected = (rejectedStmt.getAsObject() as any).count
      rejectedStmt.free()

      return {
        pending,
        approved,
        rejected,
        total: pending + approved + rejected
      }
    } catch (error) {
      console.error('Error getting registration stats:', error)
      return { pending: 0, approved: 0, rejected: 0, total: 0 }
    }
  }
}

// Singleton instance
let registrationHandler: RegistrationHandler | null = null

export function getRegistrationHandler(): RegistrationHandler {
  if (!registrationHandler) {
    registrationHandler = new RegistrationHandler()
  }
  return registrationHandler
}

export function initRegistrationHandler(bot: TelegramBot): RegistrationHandler {
  if (!registrationHandler) {
    registrationHandler = new RegistrationHandler(bot)
  } else {
    registrationHandler.setBot(bot)
  }
  return registrationHandler
}
