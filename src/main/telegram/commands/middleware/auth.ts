/* eslint-disable @typescript-eslint/no-explicit-any */
import { TelegramUser } from '../../types'
import { getDb } from '../../../db'

export async function getUserByTelegramId(telegramId: number): Promise<TelegramUser | null> {
  try {
    const db = getDb()
    const stmt = db.prepare(`
      SELECT tu.*, ur.role
      FROM telegram_users tu
      LEFT JOIN user_roles ur ON tu.user_id = ur.user_id
      WHERE tu.telegram_id = ?
    `)
    stmt.bind([telegramId])

    if (stmt.step()) {
      const user = stmt.getAsObject() as any
      stmt.free()
      return user as TelegramUser
    }

    stmt.free()
    return null
  } catch (error) {
    console.error('Error getting user by Telegram ID:', error)
    return null
  }
}

export async function updateUserLastInteraction(telegramId: number): Promise<void> {
  try {
    const db = getDb()
    const stmt = db.prepare(
      'UPDATE telegram_users SET last_interaction = CURRENT_TIMESTAMP WHERE telegram_id = ?'
    )
    stmt.bind([telegramId])
    stmt.run()
    stmt.free()
    const { saveDatabase } = await import('../../../db')
    await saveDatabase()
  } catch (error) {
    console.error('Error updating user last interaction:', error)
  }
}

export function isUserActive(user: TelegramUser | null): boolean {
  return user !== null && user.status === 'active'
}

export function isUserPending(user: TelegramUser | null): boolean {
  return user !== null && user.status === 'pending'
}

export function hasRole(user: TelegramUser | null, role: string): boolean {
  if (!user || !user.role) return false
  return user.role === role
}
