import bcrypt from 'bcryptjs'
import { getMachineId } from './license'
import { getDb } from './db'

const WEB_AUTH_API_URL = process.env.WEB_AUTH_API_URL || 'https://dates-factory-manager-cloud.vercel.app/api'

/**
 * Register web user with central auth database
 * Called when user enables cloud sync
 */
export async function registerWebUser(params: {
  phone: string
  password: string
  full_name?: string
  factory_name?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const machineId = getMachineId()

    // Hash password before sending
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(params.password, salt)

    // Store web_password in local database
    const db = getDb()

    // Check if user exists
    const existingUsers = db.exec(`SELECT id FROM users WHERE username = 'admin' OR role = 'owner' LIMIT 1`)

    if (existingUsers.length > 0 && existingUsers[0].values.length > 0) {
      const userId = existingUsers[0].values[0][0] as number

      // Update user with machine_id and web_password
      db.run(`UPDATE users SET machine_id = ?, web_password = ? WHERE id = ?`, [
        machineId,
        hashedPassword,
        userId
      ])
    } else {
      // Create new owner user
      db.run(
        `INSERT INTO users (username, password, role, phone, full_name, machine_id, web_password) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['owner', hashedPassword, 'owner', params.phone, params.full_name || null, machineId, hashedPassword]
      )
    }

    // Register with central auth API
    const response = await fetch(`${WEB_AUTH_API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: params.phone,
        password: hashedPassword, // Send already hashed password
        machine_id: machineId,
        full_name: params.full_name,
        factory_name: params.factory_name
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[WEB_AUTH] Registration failed:', errorText)
      return { success: false, error: errorText }
    }

    await response.json()
    console.log('[WEB_AUTH] Web user registered successfully')

    return { success: true }
  } catch (error: any) {
    console.error('[WEB_AUTH] Registration error:', error)
    return { success: false, error: error.message || 'Registration failed' }
  }
}

/**
 * Update web user password
 */
export async function updateWebPassword(params: {
  phone: string
  newPassword: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(params.newPassword, salt)

    // Update in local database
    const db = getDb()
    db.run(`UPDATE users SET web_password = ? WHERE phone = ?`, [hashedPassword, params.phone])

    // Update in central auth database
    const response = await fetch(`${WEB_AUTH_API_URL}/auth/update-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: params.phone,
        password_hash: hashedPassword
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[WEB_AUTH] Password update failed:', errorText)
      return { success: false, error: errorText }
    }

    console.log('[WEB_AUTH] Password updated successfully')
    return { success: true }
  } catch (error: any) {
    console.error('[WEB_AUTH] Password update error:', error)
    return { success: false, error: error.message || 'Password update failed' }
  }
}

/**
 * Get web user info from local database
 */
export function getWebUser(): { phone?: string; machine_id?: string; full_name?: string; factory_name?: string } | null {
  try {
    const db = getDb()
    const result = db.exec(`SELECT phone, machine_id, full_name FROM users WHERE role = 'owner' OR role = 'admin' LIMIT 1`)

    if (result.length === 0 || result[0].values.length === 0) {
      return null
    }

    const [phone, machineId, fullName] = result[0].values[0] as [string | null, string | null, string | null]

    return {
      phone: phone || undefined,
      machine_id: machineId || undefined,
      full_name: fullName || undefined
    }
  } catch (error) {
    console.error('[WEB_AUTH] Error getting web user:', error)
    return null
  }
}

/**
 * Check if web user is registered
 */
export function isWebUserRegistered(): boolean {
  const user = getWebUser()
  return user !== null && user.phone !== undefined && user.machine_id !== undefined
}

/**
 * Login web user with phone and password
 * Validates credentials against cloud API
 */
export async function loginWebUser(params: {
  phone: string
  password: string
}): Promise<{ success: boolean; error?: string; user?: { phone: string; factory_name?: string; machine_id?: string } }> {
  try {
    console.log('[WEB_AUTH] Attempting login for:', params.phone)

    // Hash password before sending (API expects hashed password)
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(params.password, salt)

    // Login with central auth API
    const response = await fetch(`${WEB_AUTH_API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: params.phone,
        password: params.password // Send plain password, server will verify
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Login failed' }))
      console.error('[WEB_AUTH] Login failed:', errorData)
      return { success: false, error: errorData.message || 'رقم الهاتف أو كلمة المرور غير صحيحة' }
    }

    const userData = await response.json()
    console.log('[WEB_AUTH] Login successful')

    // Store credentials locally
    const db = getDb()
    const machineId = getMachineId()

    // Check if user exists locally
    const existingUsers = db.exec(`SELECT id FROM users WHERE username = 'admin' OR role = 'owner' LIMIT 1`)

    if (existingUsers.length > 0 && existingUsers[0].values.length > 0) {
      const userId = existingUsers[0].values[0][0] as number
      db.run(`UPDATE users SET phone = ?, web_password = ?, machine_id = ? WHERE id = ?`, [
        params.phone,
        hashedPassword,
        machineId,
        userId
      ])
    } else {
      db.run(
        `INSERT INTO users (username, password, role, phone, machine_id, web_password) VALUES (?, ?, ?, ?, ?, ?)`,
        ['owner', hashedPassword, 'owner', params.phone, machineId, hashedPassword]
      )
    }

    return {
      success: true,
      user: {
        phone: params.phone,
        factory_name: userData.factory_name,
        machine_id: userData.machine_id
      }
    }
  } catch (error: any) {
    console.error('[WEB_AUTH] Login error:', error)
    return { success: false, error: error.message || 'فشل تسجيل الدخول' }
  }
}

/**
 * Restore user data from cloud
 * Downloads and replaces local database with cloud data
 */
export async function restoreUserData(params: {
  phone: string
  password: string
}): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    console.log('[WEB_AUTH] Attempting data restore for:', params.phone)

    // First login to verify credentials
    const loginResult = await loginWebUser(params)
    if (!loginResult.success) {
      return { success: false, error: loginResult.error }
    }

    // Request data restore from cloud API
    const response = await fetch(`${WEB_AUTH_API_URL}/sync/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: params.phone,
        password: params.password
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Restore failed' }))
      console.error('[WEB_AUTH] Restore failed:', errorData)
      return { success: false, error: errorData.message || 'فشل استعادة البيانات' }
    }

    const restoreData = await response.json()

    // If we got data, import it
    if (restoreData.data) {
      console.log('[WEB_AUTH] Received restore data, applying...')
      // The sync system will handle importing the data
      // For now, we'll trigger a full sync pull
      const { performSync } = require('./sync')
      await performSync({ forceFullSync: true })
    }

    console.log('[WEB_AUTH] Data restore completed')
    return { success: true, message: 'تم استعادة البيانات بنجاح' }
  } catch (error: any) {
    console.error('[WEB_AUTH] Restore error:', error)
    return { success: false, error: error.message || 'فشل استعادة البيانات' }
  }
}

/**
 * Get cloud account status
 */
export function getCloudAccountStatus(): {
  isRegistered: boolean
  phone?: string
  factoryName?: string
} {
  const user = getWebUser()
  return {
    isRegistered: isWebUserRegistered(),
    phone: user?.phone,
    factoryName: user?.factory_name
  }
}
