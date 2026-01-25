import TelegramBot from 'node-telegram-bot-api'
import { Messages } from '../utils/messages'
import { Keyboards } from '../utils/keyboard'
import { getUserByTelegramId, updateUserLastInteraction } from './middleware/auth'

export async function handleProfile(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id
  const telegramId = msg.from?.id

  if (!telegramId) {
    await bot.sendMessage(chatId, Messages.error('تعذر الحصول على معرف المستخدم'))
    return
  }

  await updateUserLastInteraction(telegramId)

  const user = await getUserByTelegramId(telegramId)

  if (!user) {
    await bot.sendMessage(chatId, Messages.notRegistered, {
      parse_mode: 'HTML'
    })
    return
  }

  await bot.sendMessage(chatId, Messages.profile(user), {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: Keyboards.mainMenu(true)
    }
  })
}
