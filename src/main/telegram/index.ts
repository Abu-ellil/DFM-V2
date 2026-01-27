/* eslint-disable @typescript-eslint/no-explicit-any */
import TelegramBot from 'node-telegram-bot-api'
import { registerCommands, registerAdminCommands } from './commands'
import { initNotificationHandler } from './handlers/notifications'
import { initRegistrationHandler } from './handlers/registration'
import { getDb } from '../db'

let bot: TelegramBot | null = null
let isBotRunning = false

/**
 * Initialize and start the Telegram bot
 */
export async function startTelegramBot(): Promise<{ success: boolean; message?: string }> {
  try {
    if (isBotRunning && bot) {
      return { success: true, message: 'Bot is already running' }
    }

    const db = getDb()

    // Get bot token from settings
    const tokenStmt = db.prepare("SELECT value FROM settings WHERE key = 'telegram_token'")
    tokenStmt.step()
    const tokenResult = tokenStmt.getAsObject() as any
    tokenStmt.free()

    const token = tokenResult?.value

    if (!token) {
      return { success: false, message: 'Telegram bot token not configured' }
    }

    // Check if bot is enabled
    const enabledStmt = db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_enabled'")
    enabledStmt.step()
    const enabledResult = enabledStmt.getAsObject() as any
    enabledStmt.free()

    const isEnabled = enabledResult?.value === '1'

    if (!isEnabled) {
      return { success: false, message: 'Telegram bot is disabled in settings' }
    }

    // Create bot instance
    bot = new TelegramBot(token, { polling: true })

    // Register commands
    registerCommands(bot)
    registerAdminCommands(bot)

    // Initialize handlers
    initNotificationHandler(bot)
    initRegistrationHandler(bot)

    // Start processing notifications
    const notificationHandler = initNotificationHandler(bot)
    notificationHandler.startProcessing(30000) // Process every 30 seconds

    isBotRunning = true

    console.log('Telegram bot started successfully')
    return { success: true, message: 'Telegram bot started successfully' }
  } catch (error: any) {
    console.error('Failed to start Telegram bot:', error)
    return { success: false, message: error.message || 'Failed to start bot' }
  }
}

/**
 * Stop the Telegram bot
 */
export async function stopTelegramBot(): Promise<{ success: boolean; message?: string }> {
  try {
    if (!bot || !isBotRunning) {
      return { success: true, message: 'Bot is not running' }
    }

    // Stop polling
    await bot.stopPolling()

    // Stop notification processing
    const notificationHandler = initNotificationHandler(bot)
    notificationHandler.stopProcessing()

    bot = null
    isBotRunning = false

    console.log('Telegram bot stopped successfully')
    return { success: true, message: 'Telegram bot stopped successfully' }
  } catch (error: any) {
    console.error('Failed to stop Telegram bot:', error)
    return { success: false, message: error.message || 'Failed to stop bot' }
  }
}

/**
 * Restart the Telegram bot
 */
export async function restartTelegramBot(): Promise<{ success: boolean; message?: string }> {
  await stopTelegramBot()
  await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second
  return startTelegramBot()
}

/**
 * Get bot instance
 */
export function getBot(): TelegramBot | null {
  return bot
}

/**
 * Check if bot is running
 */
export function isBotRunningStatus(): boolean {
  return isBotRunning
}

/**
 * Update bot token and restart
 */
export async function updateBotToken(
  newToken: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const db = getDb()

    // Update token in database
    const stmt = db.prepare("UPDATE settings SET value = ? WHERE key = 'telegram_token'")
    stmt.bind([newToken])
    stmt.run()
    stmt.free()

    const { saveDatabase } = await import('../db')
    await saveDatabase()

    // Restart bot if it was running
    if (isBotRunning) {
      await restartTelegramBot()
    }

    return { success: true, message: 'Bot token updated successfully' }
  } catch (error: any) {
    console.error('Failed to update bot token:', error)
    return { success: false, message: error.message || 'Failed to update token' }
  }
}

/**
 * Test bot connection
 */
export async function testBotConnection(token?: string): Promise<{
  success: boolean
  message?: string
  botInfo?: any
}> {
  try {
    const testToken =
      token ||
      (() => {
        const db = getDb()
        const stmt = db.prepare("SELECT value FROM settings WHERE key = 'telegram_token'")
        stmt.step()
        const result = stmt.getAsObject() as any
        stmt.free()
        return result?.value
      })()

    if (!testToken) {
      return { success: false, message: 'No bot token provided' }
    }

    // Test connection by getting bot info
    const response = await fetch(`https://api.telegram.org/bot${testToken}/getMe`)

    if (!response.ok) {
      return { success: false, message: 'Invalid bot token or API error' }
    }

    const data = await response.json()

    if (!data.ok) {
      return { success: false, message: data.description || 'Invalid bot token' }
    }

    return {
      success: true,
      message: 'Bot connection successful',
      botInfo: data.result
    }
  } catch (error: any) {
    console.error('Failed to test bot connection:', error)
    return { success: false, message: error.message || 'Connection test failed' }
  }
}

/**
 * Get bot statistics
 */
export async function getBotStats(): Promise<{
  isRunning: boolean
  uptime?: number
  notificationStats?: any
  registrationStats?: any
}> {
  try {
    const stats: any = {
      isRunning: isBotRunning
    }

    if (isBotRunning) {
      // Get notification stats
      const notificationHandler = initNotificationHandler(bot!)
      stats.notificationStats = await notificationHandler.getStats()

      // Get registration stats
      const registrationHandler = initRegistrationHandler(bot!)
      stats.registrationStats = await registrationHandler.getStats()
    }

    return stats
  } catch (error) {
    console.error('Failed to get bot stats:', error)
    return { isRunning: false }
  }
}
