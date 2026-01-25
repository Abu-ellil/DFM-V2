/* eslint-disable @typescript-eslint/no-explicit-any */
import TelegramBot from 'node-telegram-bot-api'
import { Notification, NotificationPreference, NotificationType, UserRole } from '../types'
import { getDb, saveDatabase } from '../../db'
import { Validator } from '../utils/validator'

export class NotificationHandler {
  private bot: TelegramBot | null = null
  private processingInterval: NodeJS.Timeout | null = null

  constructor(bot?: TelegramBot) {
    if (bot) {
      this.bot = bot
    }
  }

  setBot(bot: TelegramBot): void {
    this.bot = bot
  }

  /**
   * Add a notification to the queue
   */
  async queueNotification(data: {
    telegram_id: number
    notification_type: NotificationType
    title?: string
    message: string
    priority?: 'low' | 'normal' | 'high' | 'urgent'
  }): Promise<number | null> {
    try {
      const db = getDb()
      const stmt = db.prepare(`
        INSERT INTO notification_queue
        (telegram_id, notification_type, title, message, priority)
        VALUES (?, ?, ?, ?, ?)
      `)
      stmt.bind([
        data.telegram_id,
        data.notification_type,
        data.title || null,
        data.message,
        data.priority || 'normal'
      ])
      stmt.run()
      stmt.free()

      await saveDatabase()

      const idStmt = db.prepare('SELECT last_insert_rowid() as id')
      idStmt.step()
      const result = idStmt.getAsObject() as any
      idStmt.free()

      return result.id
    } catch (error) {
      console.error('Error queuing notification:', error)
      return null
    }
  }

  /**
   * Queue notification to all users with a specific role
   */
  async queueNotificationByRole(data: {
    notification_type: NotificationType
    title?: string
    message: string
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    role?: UserRole
  }): Promise<number[]> {
    try {
      const db = getDb()

      let query = `
        SELECT tu.telegram_id
        FROM telegram_users tu
        WHERE tu.status = 'active'
      `

      const params: any[] = []

      if (data.role) {
        query += `
          AND tu.user_id IN (
            SELECT user_id FROM user_roles WHERE role = ?
          )
        `
        params.push(data.role)
      }

      const stmt = db.prepare(query)
      params.forEach((param) => stmt.bind([param]))

      const telegramIds: number[] = []
      while (stmt.step()) {
        const row = stmt.getAsObject() as any
        telegramIds.push(row.telegram_id)
      }
      stmt.free()

      const notificationIds: number[] = []

      for (const telegramId of telegramIds) {
        // Check user preferences
        const canSend = await this.checkNotificationPreferences(telegramId, data.notification_type)
        if (!canSend) continue

        const id = await this.queueNotification({
          telegram_id: telegramId,
          notification_type: data.notification_type,
          title: data.title,
          message: data.message,
          priority: data.priority
        })

        if (id) notificationIds.push(id)
      }

      return notificationIds
    } catch (error) {
      console.error('Error queuing notification by role:', error)
      return []
    }
  }

  /**
   * Check if user should receive this type of notification
   */
  async checkNotificationPreferences(
    telegramId: number,
    notificationType: NotificationType
  ): Promise<boolean> {
    try {
      const db = getDb()
      const stmt = db.prepare('SELECT * FROM notification_preferences WHERE telegram_id = ?')
      stmt.bind([telegramId])

      let preferences: NotificationPreference | null = null

      if (stmt.step()) {
        preferences = stmt.getAsObject() as any
      }
      stmt.free()

      // If no preferences set, allow all notifications
      if (!preferences) return true

      // Check quiet hours
      const now = new Date()
      if (
        Validator.isWithinQuietHours(
          now,
          preferences.quiet_hours_start || undefined,
          preferences.quiet_hours_end || undefined
        )
      ) {
        return false
      }

      // Check notification type preferences
      switch (notificationType) {
        case 'report':
          return preferences.receive_reports === 1
        case 'alert':
          return preferences.receive_alerts === 1
        case 'task':
          return preferences.receive_tasks === 1
        default:
          return true
      }
    } catch (error) {
      console.error('Error checking notification preferences:', error)
      return true
    }
  }

  /**
   * Process notification queue - send pending notifications
   */
  async processQueue(): Promise<void> {
    if (!this.bot) {
      console.warn('Bot not initialized, cannot process notifications')
      return
    }

    try {
      const db = getDb()
      const stmt = db.prepare(`
        SELECT * FROM notification_queue
        WHERE sent = 0
        ORDER BY priority DESC, created_at ASC
        LIMIT 50
      `)

      const notifications: Notification[] = []
      while (stmt.step()) {
        notifications.push(stmt.getAsObject() as any)
      }
      stmt.free()

      for (const notification of notifications) {
        await this.sendNotification(notification)
      }

      if (notifications.length > 0) {
        await saveDatabase()
      }
    } catch (error) {
      console.error('Error processing notification queue:', error)
    }
  }

  /**
   * Send a single notification
   */
  private async sendNotification(notification: Notification): Promise<void> {
    if (!this.bot) return

    try {
      const message = notification.title
        ? `🔔 <b>${notification.title}</b>\n\n${notification.message}`
        : notification.message

      await this.bot.sendMessage(notification.telegram_id, message, {
        parse_mode: 'HTML'
      })

      // Mark as sent
      const db = getDb()
      const updateStmt = db.prepare(`
        UPDATE notification_queue
        SET sent = 1, sent_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      updateStmt.bind([notification.id])
      updateStmt.run()
      updateStmt.free()

      console.log(`Notification ${notification.id} sent to ${notification.telegram_id}`)
    } catch (error: any) {
      console.error(`Error sending notification ${notification.id}:`, error)

      // Mark error
      const db = getDb()
      const updateStmt = db.prepare(`
        UPDATE notification_queue
        SET error_message = ?
        WHERE id = ?
      `)
      updateStmt.bind([error.message, notification.id])
      updateStmt.run()
      updateStmt.free()
    }
  }

  /**
   * Start processing notifications periodically
   */
  startProcessing(intervalMs: number = 30000): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
    }

    this.processingInterval = setInterval(() => {
      this.processQueue()
    }, intervalMs)

    console.log(`Notification processing started (interval: ${intervalMs}ms)`)
  }

  /**
   * Stop processing notifications
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
      console.log('Notification processing stopped')
    }
  }

  /**
   * Get notification statistics
   */
  async getStats(): Promise<{
    pending: number
    sent: number
    failed: number
    total: number
  }> {
    try {
      const db = getDb()

      const pendingStmt = db.prepare(
        'SELECT COUNT(*) as count FROM notification_queue WHERE sent = 0'
      )
      pendingStmt.step()
      const pending = (pendingStmt.getAsObject() as any).count
      pendingStmt.free()

      const sentStmt = db.prepare('SELECT COUNT(*) as count FROM notification_queue WHERE sent = 1')
      sentStmt.step()
      const sent = (sentStmt.getAsObject() as any).count
      sentStmt.free()

      const failedStmt = db.prepare(
        'SELECT COUNT(*) as count FROM notification_queue WHERE sent = 0 AND error_message IS NOT NULL'
      )
      failedStmt.step()
      const failed = (failedStmt.getAsObject() as any).count
      failedStmt.free()

      return {
        pending,
        sent,
        failed,
        total: pending + sent + failed
      }
    } catch (error) {
      console.error('Error getting notification stats:', error)
      return { pending: 0, sent: 0, failed: 0, total: 0 }
    }
  }
}

// Singleton instance
let notificationHandler: NotificationHandler | null = null

export function getNotificationHandler(): NotificationHandler {
  if (!notificationHandler) {
    notificationHandler = new NotificationHandler()
  }
  return notificationHandler
}

export function initNotificationHandler(bot: TelegramBot): NotificationHandler {
  if (!notificationHandler) {
    notificationHandler = new NotificationHandler(bot)
  } else {
    notificationHandler.setBot(bot)
  }
  return notificationHandler
}
