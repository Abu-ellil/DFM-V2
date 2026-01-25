/* eslint-disable @typescript-eslint/no-explicit-any */
import TelegramBot from 'node-telegram-bot-api'
import { Messages } from '../utils/messages'
import { Keyboards } from '../utils/keyboard'
import { Validator } from '../utils/validator'
import { getUserByTelegramId, updateUserLastInteraction } from './middleware/auth'
import { getDb, saveDatabase } from '../../db'
import { RegistrationSession, RegistrationRequest } from '../types'

// Store registration sessions in memory
const registrationSessions = new Map<number, RegistrationSession>()

export async function handleRegister(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id
  const telegramId = msg.from?.id

  if (!telegramId) {
    await bot.sendMessage(chatId, Messages.error('تعذر الحصول على معرف المستخدم'))
    return
  }

  await updateUserLastInteraction(telegramId)

  // Check if user already exists
  const existingUser = await getUserByTelegramId(telegramId)
  if (existingUser) {
    if (existingUser.status === 'pending') {
      await bot.sendMessage(chatId, Messages.registrationPending, { parse_mode: 'HTML' })
    } else if (existingUser.status === 'active') {
      await bot.sendMessage(chatId, Messages.error('لقد قمت بالتسجيل مسبقاً'), {
        parse_mode: 'HTML'
      })
    } else {
      await bot.sendMessage(chatId, Messages.error('حسابك غير نشط. يرجى التواصل مع المشرف.'), {
        parse_mode: 'HTML'
      })
    }
    return
  }

  // Check if there's already a pending registration
  const db = getDb()
  const stmt = db.prepare(
    'SELECT * FROM telegram_registrations WHERE telegram_id = ? AND status = ?'
  )
  stmt.bind([telegramId, 'pending'])

  if (stmt.step()) {
    stmt.free()
    await bot.sendMessage(
      chatId,
      Messages.error('لديك بالفعل طلب تسجيل قيد المراجعة. يرجى الانتظار حتى يتم مراجعته.'),
      { parse_mode: 'HTML' }
    )
    return
  }
  stmt.free()

  // Initialize registration session
  registrationSessions.set(telegramId, {
    step: 1,
    data: {}
  })

  await bot.sendMessage(chatId, Messages.registrationStarted, {
    parse_mode: 'HTML'
  })

  // Ask for full name
  await bot.sendMessage(chatId, Messages.registrationStep1, {
    parse_mode: 'HTML'
  })
}

export async function handleRegistrationText(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id
  const telegramId = msg.from?.id
  const text = msg.text

  if (!telegramId || !text) return

  const session = registrationSessions.get(telegramId)
  if (!session) return

  await updateUserLastInteraction(telegramId)

  switch (session.step) {
    case 1: // Full name
      await handleFullNameStep(bot, chatId, telegramId, text)
      break
    case 2: // Phone
      await handlePhoneStep(bot, chatId, telegramId, text)
      break
    case 4: // Reason
      await handleReasonStep(bot, chatId, telegramId, text)
      break
  }
}

async function handleFullNameStep(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  fullName: string
): Promise<void> {
  const validation = Validator.validateRegistrationData({ full_name: fullName })

  if (!validation.valid) {
    await bot.sendMessage(
      chatId,
      Messages.error(validation.errors.full_name || 'الاسم غير صالح') +
        '\n\n' +
        Messages.registrationStep1,
      { parse_mode: 'HTML' }
    )
    return
  }

  const session = registrationSessions.get(telegramId)!
  session.data.full_name = Validator.sanitize(fullName)
  session.step = 2

  await bot.sendMessage(chatId, Messages.registrationStep2, {
    parse_mode: 'HTML'
  })
}

async function handlePhoneStep(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  phone: string
): Promise<void> {
  const validation = Validator.validateRegistrationData({ phone })

  if (!validation.valid) {
    await bot.sendMessage(
      chatId,
      Messages.error(validation.errors.phone || 'رقم الهاتف غير صالح') +
        '\n\n' +
        Messages.registrationStep2,
      { parse_mode: 'HTML' }
    )
    return
  }

  const session = registrationSessions.get(telegramId)!
  session.data.phone = Validator.sanitize(phone)
  session.step = 3

  await bot.sendMessage(chatId, Messages.registrationStep3, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: Keyboards.roleSelection()
    }
  })
}

export async function handleRoleSelection(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery
): Promise<void> {
  const chatId = query.message?.chat.id
  const telegramId = query.from.id
  const data = query.data

  if (!chatId || !telegramId || !data) return

  const session = registrationSessions.get(telegramId)
  if (!session || session.step !== 3) return

  await updateUserLastInteraction(telegramId)

  const role = data.replace('role_', '')
  const validation = Validator.validateRegistrationData({ requested_role: role })

  if (!validation.valid) {
    await bot.answerCallbackQuery(query.id, { text: 'نوع الحساب غير صالح' })
    return
  }

  session.data.requested_role = role as any
  session.step = 4

  await bot.answerCallbackQuery(query.id)
  await bot.sendMessage(chatId, Messages.registrationStep4, {
    parse_mode: 'HTML'
  })
}

async function handleReasonStep(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  reason: string
): Promise<void> {
  const validation = Validator.validateRegistrationData({ reason })

  if (!validation.valid) {
    await bot.sendMessage(
      chatId,
      Messages.error(validation.errors.reason || 'سبب التسجيل يجب أن يكون بين 20 و 500 حرف') +
        '\n\n' +
        Messages.registrationStep4,
      { parse_mode: 'HTML' }
    )
    return
  }

  const session = registrationSessions.get(telegramId)!
  session.data.reason = Validator.sanitize(reason)
  session.step = 5

  // Show confirmation
  await bot.sendMessage(chatId, Messages.registrationConfirm(session.data), {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: Keyboards.confirmRegistration()
    }
  })
}

export async function handleRegistrationConfirm(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery
): Promise<void> {
  const chatId = query.message?.chat.id
  const telegramId = query.from.id

  if (!chatId || !telegramId) return

  const session = registrationSessions.get(telegramId)
  if (!session || session.step !== 5) return

  await updateUserLastInteraction(telegramId)

  try {
    const db = getDb()

    // Insert into telegram_registrations
    const stmt = db.prepare(`
      INSERT INTO telegram_registrations (telegram_id, requested_role, full_name, phone, reason)
      VALUES (?, ?, ?, ?, ?)
    `)
    stmt.bind([
      telegramId,
      session.data.requested_role || null,
      session.data.full_name || null,
      session.data.phone || null,
      session.data.reason || null
    ])
    stmt.run()
    stmt.free()

    await saveDatabase()

    // Clear session
    registrationSessions.delete(telegramId)

    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, Messages.registrationSuccess, {
      parse_mode: 'HTML'
    })

    // Notify admins
    await notifyAdminsAboutRegistration(bot, telegramId, session.data)
  } catch (error) {
    console.error('Error saving registration:', error)
    await bot.answerCallbackQuery(query.id, {
      text: 'حدث خطأ أثناء حفظ الطلب. يرجى المحاولة مرة أخرى.'
    })
  }
}

export async function handleRegistrationCancel(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery
): Promise<void> {
  const chatId = query.message?.chat.id
  const telegramId = query.from.id

  if (!chatId || !telegramId) return

  registrationSessions.delete(telegramId)
  await updateUserLastInteraction(telegramId)

  await bot.answerCallbackQuery(query.id)
  await bot.sendMessage(chatId, Messages.registrationCancelled, {
    parse_mode: 'HTML'
  })
}

async function notifyAdminsAboutRegistration(
  bot: TelegramBot,
  telegramId: number,
  data: Partial<RegistrationRequest>
): Promise<void> {
  try {
    const db = getDb()
    const stmt = db.prepare(`
      SELECT telegram_id FROM telegram_users
      WHERE status = 'active'
      AND telegram_id IN (
        SELECT telegram_id FROM telegram_users tu
        JOIN user_roles ur ON tu.user_id = ur.user_id
        WHERE ur.role IN ('owner', 'admin')
      )
    `)

    const adminTelegramIds: number[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject() as any
      adminTelegramIds.push(row.telegram_id)
    }
    stmt.free()

    if (adminTelegramIds.length === 0) return

    const message = `
🆕 <b>طلب تسجيل جديد</b>

<b>الاسم:</b> ${data.full_name}
<b>الهاتف:</b> ${data.phone}
<b>نوع الحساب المطلوب:</b> ${data.requested_role}
<b>السبب:</b> ${data.reason}

<b>معرف تليجرام:</b> ${telegramId}

يرجى مراجعة الطلب من خلال التطبيق أو استخدام الأمر /registrations
    `

    for (const adminId of adminTelegramIds) {
      try {
        await bot.sendMessage(adminId, message, { parse_mode: 'HTML' })
      } catch (error) {
        console.error(`Failed to notify admin ${adminId}:`, error)
      }
    }
  } catch (error) {
    console.error('Error notifying admins:', error)
  }
}

export function getRegistrationSession(telegramId: number): RegistrationSession | undefined {
  return registrationSessions.get(telegramId)
}

export function hasRegistrationSession(telegramId: number): boolean {
  return registrationSessions.has(telegramId)
}
