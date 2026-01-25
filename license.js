/* eslint-disable @typescript-eslint/no-require-imports */
const { machineIdSync } = require('node-machine-id')
const { readFileSync, writeFileSync, existsSync, unlinkSync } = require('fs')
const { join } = require('path')
const crypto = require('crypto')

const LICENSE_FILE = join(__dirname, '.license')

// Must match the website's secret key
const SECRET_KEY = process.env.LICENSE_SECRET_KEY || 'DateFactory2024SecretKey#$%^&*()!@#'

function getMachineId() {
  try {
    const id = machineIdSync()
    // Shorten to 16 characters to match the trial request website requirement
    return id.substring(0, 16).toUpperCase()
  } catch (error) {
    console.error('Error getting machine ID:', error)
    throw error
  }
}

function getLicenseInfo() {
  try {
    if (!existsSync(LICENSE_FILE)) {
      return { licensed: false, machineId: getMachineId() }
    }

    const data = JSON.parse(readFileSync(LICENSE_FILE, 'utf-8'))

    // Calculate grace period remaining
    let gracePeriodRemaining = null
    let needsOnlineCheck = false

    if (data.lastOnlineCheck) {
      const lastCheck = new Date(data.lastOnlineCheck)
      const now = new Date()
      const daysSinceCheck = (now - lastCheck) / (1000 * 60 * 60 * 24)
      const GRACE_PERIOD_DAYS = 90

      gracePeriodRemaining = Math.max(0, GRACE_PERIOD_DAYS - daysSinceCheck)
      needsOnlineCheck = daysSinceCheck >= 7
    }

    return {
      licensed: true,
      machineId: data.machineId,
      licenseKey: data.licenseKey,
      factoryName: data.factoryName,
      activatedAt: data.activatedAt,
      expiryDate: data.expiryDate,
      lastOnlineCheck: data.lastOnlineCheck,
      gracePeriodRemaining,
      needsOnlineCheck
    }
  } catch (error) {
    console.error('Error getting license info:', error)
    return { licensed: false, machineId: getMachineId() }
  }
}

/**
 * Validate license key format and verify it matches the current machine
 * Format: XXXX-XXXX-XXXX-XXXX-DD (DD = duration code: 4D, 1Y, etc.)
 */
function validateLicense(licenseKey) {
  try {
    const currentMachineId = getMachineId()

    if (!licenseKey || licenseKey.trim().length === 0) {
      console.log('License validation failed: Empty key')
      return false
    }

    const parts = licenseKey.split('-')
    // Expected format: XXXX-XXXX-XXXX-XXXX-DD (5 parts)
    if (parts.length !== 5) {
      console.log('License validation failed: Invalid format, expected 5 parts, got', parts.length)
      return false
    }

    // Extract duration code (last part)
    const durationCode = parts[4]

    // Reconstruct the key part (first 4 parts)
    const keyPart = parts.slice(0, 4).join('')

    // Generate expected hash for this machine
    const data = currentMachineId + '|' + durationCode + '|' + SECRET_KEY
    const expectedHash = crypto
      .createHash('sha256')
      .update(data)
      .digest('hex')
      .substring(0, 16)
      .toUpperCase()

    // Verify the key matches
    if (keyPart !== expectedHash) {
      console.log('License validation failed: Key mismatch')
      console.log('Expected:', expectedHash)
      console.log('Got:', keyPart)
      return false
    }

    // Check if license has expired
    const licenseFile = existsSync(LICENSE_FILE)
      ? JSON.parse(readFileSync(LICENSE_FILE, 'utf-8'))
      : null
    if (licenseFile && licenseFile.expiryDate) {
      const expiryDate = new Date(licenseFile.expiryDate)
      const now = new Date()
      if (now > expiryDate) {
        console.log('License validation failed: License expired on', expiryDate)
        return false
      }
    }

    console.log('License validation successful')
    return true
  } catch (error) {
    console.error('Error validating license:', error)
    return false
  }
}

/**
 * Calculate expiry date based on duration code
 */
function calculateExpiryDate(durationCode) {
  const now = new Date()

  // Parse duration code (e.g., "4D" = 4 days, "1Y" = 1 year)
  const match = durationCode.match(/^(\d+)([DY])$/)
  if (!match) {
    // Default to 1 year if format is invalid
    return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
  }

  const value = parseInt(match[1])
  const unit = match[2]

  switch (unit) {
    case 'D': // Days
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000)
    case 'Y': // Years
      return new Date(now.getTime() + value * 365 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
  }
}

function saveLicense(licenseKey, factoryName) {
  try {
    if (!validateLicense(licenseKey)) {
      console.log('Failed to save license: Validation failed')
      return false
    }

    const parts = licenseKey.split('-')
    const durationCode = parts[4]
    const expiryDate = calculateExpiryDate(durationCode)
    const currentMachineId = getMachineId()

    const licenseData = {
      machineId: currentMachineId,
      licenseKey,
      factoryName,
      activatedAt: new Date().toISOString(),
      expiryDate: expiryDate.toISOString()
    }

    writeFileSync(LICENSE_FILE, JSON.stringify(licenseData, null, 2))
    console.log('License saved successfully, expires on:', expiryDate)
    return true
  } catch (error) {
    console.error('Error saving license:', error)
    return false
  }
}

/**
 * Verify license with the server (for blocking/revoking)
 */
async function verifyLicenseOnline(licenseKey, machineId) {
  try {
    const VERIFY_URL =
      process.env.LICENSE_VERIFY_URL ||
      'https://dates-factory-manager-cloud.vercel.app/api/license/verify'

    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey, machineId }),
      timeout: 10000 // 10 second timeout
    })

    const result = await response.json()
    console.log('Online verification result:', result)

    return result
  } catch (error) {
    console.error('Online verification error:', error)
    // If server is unreachable, allow offline operation
    // (you may want to change this behavior)
    return { valid: true, offline: true }
  }
}

/**
 * Check if online verification is needed (once every 7 days)
 */
function needsOnlineVerification() {
  try {
    if (!existsSync(LICENSE_FILE)) {
      return false
    }

    const data = JSON.parse(readFileSync(LICENSE_FILE, 'utf-8'))
    if (!data.lastOnlineCheck) {
      return true // Never checked online
    }

    const lastCheck = new Date(data.lastOnlineCheck)
    const now = new Date()
    const daysSinceLastCheck = (now - lastCheck) / (1000 * 60 * 60 * 24)

    return daysSinceLastCheck >= 7 // Check every 7 days
  } catch (error) {
    console.error('Error checking if online verification needed:', error)
    return false
  }
}

/**
 * Check if grace period has expired (allow 14 days offline)
 */
function isGracePeriodExpired() {
  try {
    if (!existsSync(LICENSE_FILE)) {
      return false
    }

    const data = JSON.parse(readFileSync(LICENSE_FILE, 'utf-8'))
    if (!data.lastOnlineCheck) {
      return false // Never checked online, allow grace period
    }

    const lastCheck = new Date(data.lastOnlineCheck)
    const now = new Date()
    const daysSinceLastCheck = (now - lastCheck) / (1000 * 60 * 60 * 24)

    // Allow 90 days offline before blocking
    const GRACE_PERIOD_DAYS = 90
    if (daysSinceLastCheck > GRACE_PERIOD_DAYS) {
      console.log(
        `Grace period expired: ${daysSinceLastCheck.toFixed(1)} days since last online check`
      )
      return true
    }

    return false
  } catch (error) {
    console.error('Error checking grace period:', error)
    return false
  }
}

/**
 * Update last online check timestamp
 */
function updateLastOnlineCheck() {
  try {
    if (!existsSync(LICENSE_FILE)) {
      return
    }

    const data = JSON.parse(readFileSync(LICENSE_FILE, 'utf-8'))
    data.lastOnlineCheck = new Date().toISOString()
    writeFileSync(LICENSE_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error updating last online check:', error)
  }
}

/**
 * Main license check with online verification
 */
async function isLicensed() {
  try {
    if (!existsSync(LICENSE_FILE)) {
      return false
    }

    const data = JSON.parse(readFileSync(LICENSE_FILE, 'utf-8'))

    // Check expiry first
    if (data.expiryDate) {
      const expiryDate = new Date(data.expiryDate)
      const now = new Date()
      if (now > expiryDate) {
        console.log('License has expired on', expiryDate)
        return false
      }
    }

    // Local validation first
    if (!validateLicense(data.licenseKey)) {
      console.log('Local license validation failed')
      return false
    }

    // Online verification (if needed)
    if (needsOnlineVerification()) {
      console.log('Performing online license verification...')
      const onlineResult = await verifyLicenseOnline(data.licenseKey, data.machineId)

      if (onlineResult.offline) {
        // No internet connection
        console.log('Offline: Checking grace period...')

        if (isGracePeriodExpired()) {
          console.log('Grace period expired - license blocked due to prolonged offline')
          return false
        }

        // Still in grace period, allow offline access
        const daysSinceCheck = (new Date() - new Date(data.lastOnlineCheck)) / (1000 * 60 * 60 * 24)
        console.log(
          `Offline access allowed: ${daysSinceCheck.toFixed(1)} days since last check (grace period: 90 days)`
        )

        // Don't update timestamp when offline!
        return true
      }

      if (!onlineResult.valid) {
        // License is blocked/suspended/cancelled on server
        console.log('License invalid on server:', onlineResult.status, onlineResult.message)

        // Delete the local license file to block access
        unlinkSync(LICENSE_FILE)
        console.log('Local license file deleted due to server block')

        return false
      }

      // Online verification successful - update timestamp
      updateLastOnlineCheck()
      console.log('Online verification successful')
    }

    return true
  } catch (error) {
    console.error('Error checking license status:', error)
    return false
  }
}

module.exports = {
  getMachineId,
  getLicenseInfo,
  validateLicense,
  saveLicense,
  isLicensed
}
