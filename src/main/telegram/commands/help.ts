import TelegramBot from 'node-telegram-bot-api'
import { Messages } from '../utils/messages'
import { getUserByTelegramId, updateUserLastInteraction } from './middleware/auth'

export async function handleHelp(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id
  const telegramId = msg.from?.id

  if (!telegramId) {
    await bot.sendMessage(chatId, Messages.error('تعذر الحصول على معرف المستخدم'))
    return
  }

  await updateUserLastInteraction(telegramId)

  const user = await getUserByTelegramId(telegramId)

  if (!user) {
    await bot.sendMessage(chatId, Messages.help())
    return
  }

  if (user.status === 'pending') {
    await bot.sendMessage(chatId, Messages.registrationPending + '\n\n' + Messages.help(), {
      parse_mode: 'HTML'
    })
    return
  }

  await bot.sendMessage(chatId, Messages.help(user.role || undefined), {
    parse_mode: 'HTML'
  })
}
