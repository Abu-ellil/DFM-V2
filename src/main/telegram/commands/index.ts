/* eslint-disable @typescript-eslint/no-explicit-any */
import TelegramBot from 'node-telegram-bot-api'
import { handleStart } from './start'
import {
  handleRegister,
  handleRegistrationText,
  handleRoleSelection,
  handleRegistrationConfirm,
  handleRegistrationCancel
} from './register'
import { handleHelp } from './help'
import { handleStatus } from './status'
import { handleProfile } from './profile'
import { getUserByTelegramId } from './middleware/auth'
import { checkRateLimit, getRateLimitMessage } from './middleware/rateLimit'
import { isAdmin } from './middleware/roleCheck'

export function registerCommands(bot: TelegramBot): void {
  // /start command
  bot.onText(/\/start/, async (msg) => {
    const telegramId = msg.from?.id
    if (!telegramId) return

    // Check rate limit
    const rateLimit = checkRateLimit(telegramId)
    if (!rateLimit.allowed) {
      await bot.sendMessage(msg.chat.id, getRateLimitMessage())
      return
    }

    await handleStart(bot, msg)
  })

  // /register command
  bot.onText(/\/register/, async (msg) => {
    const telegramId = msg.from?.id
    if (!telegramId) return

    // Check rate limit
    const rateLimit = checkRateLimit(telegramId)
    if (!rateLimit.allowed) {
      await bot.sendMessage(msg.chat.id, getRateLimitMessage())
      return
    }

    await handleRegister(bot, msg)
  })

  // /help command
  bot.onText(/\/help/, async (msg) => {
    const telegramId = msg.from?.id
    if (!telegramId) return

    // Check rate limit
    const rateLimit = checkRateLimit(telegramId)
    if (!rateLimit.allowed) {
      await bot.sendMessage(msg.chat.id, getRateLimitMessage())
      return
    }

    await handleHelp(bot, msg)
  })

  // /status command
  bot.onText(/\/status/, async (msg) => {
    const telegramId = msg.from?.id
    if (!telegramId) return

    // Check rate limit
    const rateLimit = checkRateLimit(telegramId)
    if (!rateLimit.allowed) {
      await bot.sendMessage(msg.chat.id, getRateLimitMessage())
      return
    }

    await handleStatus(bot, msg)
  })

  // /myprofile command
  bot.onText(/\/myprofile/, async (msg) => {
    const telegramId = msg.from?.id
    if (!telegramId) return

    // Check rate limit
    const rateLimit = checkRateLimit(telegramId)
    if (!rateLimit.allowed) {
      await bot.sendMessage(msg.chat.id, getRateLimitMessage())
      return
    }

    await handleProfile(bot, msg)
  })

  // Handle text messages for registration flow
  bot.on('message', async (msg) => {
    const telegramId = msg.from?.id
    if (!telegramId || !msg.text) return

    // Skip commands
    if (msg.text.startsWith('/')) return

    // Check if user is in registration flow
    const { hasRegistrationSession } = await import('./register')
    if (!hasRegistrationSession(telegramId)) return

    // Check rate limit
    const rateLimit = checkRateLimit(telegramId)
    if (!rateLimit.allowed) {
      await bot.sendMessage(msg.chat.id, getRateLimitMessage())
      return
    }

    await handleRegistrationText(bot, msg)
  })

  // Handle callback queries (inline keyboard buttons)
  bot.on('callback_query', async (query) => {
    const telegramId = query.from.id
    const data = query.data

    if (!telegramId || !data) return

    // Check rate limit
    const rateLimit = checkRateLimit(telegramId)
    if (!rateLimit.allowed) {
      await bot.answerCallbackQuery(query.id, {
        text: getRateLimitMessage()
      })
      return
    }

    // Registration flow callbacks
    if (data.startsWith('role_')) {
      await handleRoleSelection(bot, query)
    } else if (data === 'register_confirm') {
      await handleRegistrationConfirm(bot, query)
    } else if (data === 'register_cancel') {
      await handleRegistrationCancel(bot, query)
    }
    // Profile and main menu callbacks
    else if (data === 'profile') {
      await handleProfile(bot, query.message as any)
    } else if (data === 'help') {
      await handleHelp(bot, query.message as any)
    } else if (data === 'status') {
      await handleStatus(bot, query.message as any)
    } else if (data === 'main_menu') {
      await handleStart(bot, query.message as any)
    }
    // Add more callback handlers here as needed
    else {
      await bot.answerCallbackQuery(query.id, {
        text: 'هذا الإجراء غير متوفر حالياً'
      })
    }
  })

  // Handle errors
  bot.on('polling_error', (error) => {
    console.error('Telegram polling error:', error)
  })

  console.log('Telegram bot commands registered successfully')
}

// Admin commands
export function registerAdminCommands(bot: TelegramBot): void {
  // /approve command - Approve registration
  bot.onText(/\/approve (.+)/, async (msg, match) => {
    const telegramId = msg.from?.id
    if (!telegramId || !match) return

    const user = await getUserByTelegramId(telegramId)
    if (!isAdmin(user)) {
      await bot.sendMessage(msg.chat.id, '⛔ ليس لديك صلاحية لهذا الأمر')
      return
    }

    const args = match[1].split(' ')
    const registrationId = parseInt(args[0])
    const role = args[1] || 'worker'

    if (isNaN(registrationId)) {
      await bot.sendMessage(msg.chat.id, '❌ معرف الطلب غير صالح')
      return
    }

    // Handle approval (to be implemented in handlers)
    await bot.sendMessage(msg.chat.id, `سيتم قبول الطلب #${registrationId} بدور ${role}`)
  })

  // /reject command - Reject registration
  bot.onText(/\/reject (.+)/, async (msg, match) => {
    const telegramId = msg.from?.id
    if (!telegramId || !match) return

    const user = await getUserByTelegramId(telegramId)
    if (!isAdmin(user)) {
      await bot.sendMessage(msg.chat.id, '⛔ ليس لديك صلاحية لهذا الأمر')
      return
    }

    const registrationId = parseInt(match[1])

    if (isNaN(registrationId)) {
      await bot.sendMessage(msg.chat.id, '❌ معرف الطلب غير صالح')
      return
    }

    // Handle rejection (to be implemented in handlers)
    await bot.sendMessage(msg.chat.id, `سيتم رفض الطلب #${registrationId}`)
  })

  console.log('Telegram admin commands registered successfully')
}
