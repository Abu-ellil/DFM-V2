/* eslint-disable @typescript-eslint/no-explicit-any */
import TelegramBot from 'node-telegram-bot-api'
import { Messages } from '../utils/messages'
import { getUserByTelegramId, updateUserLastInteraction } from './middleware/auth'
import { getDb } from '../../db'

export async function handleStatus(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id
  const telegramId = msg.from?.id

  if (!telegramId) {
    await bot.sendMessage(chatId, Messages.error('تعذر الحصول على معرف المستخدم'))
    return
  }

  await updateUserLastInteraction(telegramId)

  const user = await getUserByTelegramId(telegramId)

  if (!user || user.status !== 'active') {
    await bot.sendMessage(chatId, Messages.error('يجب أن تكون مسجلاً ونشطاً لعرض حالة النظام'), {
      parse_mode: 'HTML'
    })
    return
  }

  try {
    const db = getDb()

    // Get user statistics
    const activeUsersStmt = db.prepare(
      "SELECT COUNT(*) as count FROM telegram_users WHERE status = 'active'"
    )
    activeUsersStmt.step()
    const activeUsers = (activeUsersStmt.getAsObject() as any).count
    activeUsersStmt.free()

    const pendingUsersStmt = db.prepare(
      "SELECT COUNT(*) as count FROM telegram_users WHERE status = 'pending'"
    )
    pendingUsersStmt.step()
    const pendingUsers = (pendingUsersStmt.getAsObject() as any).count
    pendingUsersStmt.free()

    // Get registration statistics
    const pendingRegStmt = db.prepare(
      "SELECT COUNT(*) as count FROM telegram_registrations WHERE status = 'pending'"
    )
    pendingRegStmt.step()
    const pendingRegistrations = (pendingRegStmt.getAsObject() as any).count
    pendingRegStmt.free()

    const approvedRegStmt = db.prepare(
      "SELECT COUNT(*) as count FROM telegram_registrations WHERE status = 'approved'"
    )
    approvedRegStmt.step()
    const approvedRegistrations = (approvedRegStmt.getAsObject() as any).count
    approvedRegStmt.free()

    const rejectedRegStmt = db.prepare(
      "SELECT COUNT(*) as count FROM telegram_registrations WHERE status = 'rejected'"
    )
    rejectedRegStmt.step()
    const rejectedRegistrations = (rejectedRegStmt.getAsObject() as any).count
    rejectedRegStmt.free()

    // Get notification statistics
    const pendingNotifStmt = db.prepare(
      'SELECT COUNT(*) as count FROM notification_queue WHERE sent = 0'
    )
    pendingNotifStmt.step()
    const pendingNotifications = (pendingNotifStmt.getAsObject() as any).count
    pendingNotifStmt.free()

    const sentNotifStmt = db.prepare(
      'SELECT COUNT(*) as count FROM notification_queue WHERE sent = 1'
    )
    sentNotifStmt.step()
    const sentNotifications = (sentNotifStmt.getAsObject() as any).count
    sentNotifStmt.free()

    const failedNotifStmt = db.prepare(
      'SELECT COUNT(*) as count FROM notification_queue WHERE sent = 0 AND error_message IS NOT NULL'
    )
    failedNotifStmt.step()
    const failedNotifications = (failedNotifStmt.getAsObject() as any).count
    failedNotifStmt.free()

    const stats = {
      active_users: activeUsers,
      pending_users: pendingUsers,
      pending_registrations: pendingRegistrations,
      approved_registrations: approvedRegistrations,
      rejected_registrations: rejectedRegistrations,
      pending_notifications: pendingNotifications,
      sent_notifications: sentNotifications,
      failed_notifications: failedNotifications
    }

    await bot.sendMessage(chatId, Messages.systemStatus(stats), {
      parse_mode: 'HTML'
    })
  } catch (error) {
    console.error('Error getting system status:', error)
    await bot.sendMessage(chatId, Messages.error('حدث خطأ أثناء جلب حالة النظام'), {
      parse_mode: 'HTML'
    })
  }
}
