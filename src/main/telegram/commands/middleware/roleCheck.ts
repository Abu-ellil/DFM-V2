/* eslint-disable @typescript-eslint/no-explicit-any */
import { TelegramUser, UserRole, Permission } from '../../types'
import { getDb } from '../../../db'

export function hasPermission(user: TelegramUser | null, permission: Permission): boolean {
  if (!user || !user.role || user.status !== 'active') {
    return false
  }

  try {
    const db = getDb()
    const stmt = db.prepare(`
      SELECT granted FROM role_permissions
      WHERE role = ? AND permission = ?
    `)
    stmt.bind([user.role, permission])

    let granted = false
    if (stmt.step()) {
      const result = stmt.getAsObject() as any
      granted = result.granted === 1
    }

    stmt.free()
    return granted
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

export function requirePermission(permission: Permission) {
  return (user: TelegramUser | null): boolean => {
    return hasPermission(user, permission)
  }
}

export function requireRole(...roles: UserRole[]) {
  return (user: TelegramUser | null): boolean => {
    if (!user || !user.role || user.status !== 'active') {
      return false
    }
    return roles.includes(user.role as UserRole)
  }
}

export function isOwner(user: TelegramUser | null): boolean {
  return user?.role === 'owner'
}

export function isManager(user: TelegramUser | null): boolean {
  return user?.role === 'manager' || user?.role === 'owner'
}

export function isWorker(user: TelegramUser | null): boolean {
  return user?.role === 'worker'
}

export function isAdmin(user: TelegramUser | null): boolean {
  return user?.role === 'admin' || user?.role === 'owner'
}
