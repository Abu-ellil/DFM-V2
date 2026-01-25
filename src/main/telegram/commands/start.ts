import TelegramBot from 'node-telegram-bot-api'
import { Messages } from '../utils/messages'
import { Keyboards } from '../utils/keyboard'
import { getUserByTelegramId, updateUserLastInteraction } from './middleware/auth'

export async function handleStart(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id
  const telegramId = msg.from?.id

  if (!telegramId) {
    await bot.sendMessage(chatId, Messages.error('تعذر الحصول على معرف المستخدم'))
    return
  }

  // Update last interaction
  await updateUserLastInteraction(telegramId)

  // Get user
  const user = await getUserByTelegramId(telegramId)
  const firstName = msg.from?.first_name || ''

  // Check if user exists
  if (!user) {
    await bot.sendMessage(chatId, Messages.welcome(firstName) + '\n\n' + Messages.notRegistered, {
      parse_mode: 'HTML'
    })
    return
  }

  // Check if user is pending
  if (user.status === 'pending') {
    await bot.sendMessage(
      chatId,
      Messages.welcome(firstName) + '\n\n' + Messages.registrationPending,
      {
        parse_mode: 'HTML'
      }
    )
    return
  }

  // Check if user is inactive or suspended
  if (user.status === 'inactive' || user.status === 'suspended') {
    await bot.sendMessage(
      chatId,
      Messages.error(
        `حسابك ${user.status === 'suspended' ? 'موقوف' : 'غير نشط'}. يرجى التواصل مع المشرف.`
      )
    )
    return
  }

  // User is active, show main menu
  await bot.sendMessage(chatId, Messages.welcome(firstName), {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: Keyboards.mainMenu(true)
    }
  })
}
