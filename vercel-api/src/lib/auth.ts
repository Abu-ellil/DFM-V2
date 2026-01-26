import type { VercelRequest } from '@vercel/node'

/**
 * License validation result
 */
export interface FactoryInfo {
  machineId: string
  licenseKey: string
  databaseName: string
  databaseUrl: string
  factoryName?: string
}

/**
 * Validate license and return factory information
 * This middleware extracts the license key from the Authorization header
 * and maps it to the factory's Neon database
 */
export async function validateLicense(request: VercelRequest): Promise<FactoryInfo> {
  // Get license key from Authorization header
  const authHeader = request.headers['authorization']
  if (!authHeader) {
    throw new Error('Missing Authorization header')
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid Authorization format')
  }

  const licenseKey = authHeader.substring(7).trim()

  // Validate license key format
  const parts = licenseKey.split('-')
  if (parts.length !== 5) {
    throw new Error('Invalid license key format')
  }

  // Extract machine ID from license key
  // The license key format is: XXXX-XXXX-XXXX-XXXX-DD
  // The first 4 parts contain the machine ID (encoded)
  const machineId = extractMachineIdFromLicense(licenseKey)

  // Construct database name and URL
  const databaseName = `dfm-${machineId}`
  const databaseUrl = process.env[`NEON_DB_${machineId}`] || constructNeonUrl(machineId)

  return {
    machineId,
    licenseKey,
    databaseName,
    databaseUrl,
    // Factory name is extracted from license (optional)
    factoryName: extractFactoryName(licenseKey)
  }
}

/**
 * Extract machine ID from license key
 * This reverses the license generation process
 */
function extractMachineIdFromLicense(licenseKey: string): string {
  const parts = licenseKey.split('-')

  // The machine ID is encoded in the first 4 parts
  // For now, we'll use a simple approach: combine parts and decode
  // In production, this should match your license.js logic exactly

  // Simple hash approach (matches your current license system)
  const encoded = parts.slice(0, 4).join('')
  const machineId = Buffer.from(encoded, 'hex').toString('utf-8')

  // Validate machine ID format (should be alphanumeric, uppercase)
  if (!/^[A-Z0-9]+$/.test(machineId)) {
    throw new Error('Invalid machine ID in license key')
  }

  return machineId
}

/**
 * Extract factory name from license key (if present)
 */
function extractFactoryName(licenseKey: string): string | undefined {
  // Factory name might be encoded in the license
  // For now, return undefined
  // You can enhance this based on your license format
  return undefined
}

/**
 * Construct Neon database URL
 * Uses environment variables or default Neon project format
 */
function constructNeonUrl(machineId: string): string {
  // Check if there's a default Neon database URL
  const defaultUrl = process.env.NEON_DATABASE_URL
  if (defaultUrl) {
    // If using a single database with schemas, append schema name
    return `${defaultUrl}?options=project%3D${process.env.NEON_PROJECT_ID}`
  }

  // Otherwise, use machine-specific database
  // Format: postgresql://user:password@host/database?options=project%3Dproject-id
  const projectId = process.env.NEON_PROJECT_ID
  const dbName = `dfm-${machineId}`

  if (!projectId) {
    throw new Error('NEON_PROJECT_ID not configured')
  }

  // Neon's connection string format
  return `postgresql://neondb_owner:${process.env.NEON_DB_PASSWORD}@ep-${projectId}.us-east-2.aws.neon.tech/${dbName}?sslmode=require`
}

/**
 * Middleware function for Vercel serverless functions
 * Validates license and adds factory info to request context
 */
export function withLicenseAuth(
  handler: (request: VercelRequest, response: any, factory: FactoryInfo) => Promise<any>
) {
  return async (request: VercelRequest, response: any): Promise<any> => {
    try {
      // Validate license
      const factory = await validateLicense(request)

      // Call the actual handler with factory info
      return await handler(request, response, factory)
    } catch (error: any) {
      console.error('License validation error:', error)

      // Return appropriate error response
      if (error.message.includes('Missing') || error.message.includes('Invalid')) {
        return response.status(401).json({
          success: false,
          error: error.message
        })
      }

      return response.status(500).json({
        success: false,
        error: 'License validation failed'
      })
    }
  }
}

/**
 * Validate license key format only (for quick checks)
 */
export function validateLicenseFormat(licenseKey: string): boolean {
  const parts = licenseKey.split('-')
  return parts.length === 5 && parts.every((part) => part.length === 4)
}

/**
 * Extract machine ID from license key format only
 */
export function getMachineIdFromLicenseKey(licenseKey: string): string {
  if (!validateLicenseFormat(licenseKey)) {
    throw new Error('Invalid license key format')
  }

  const parts = licenseKey.split('-')
  const encoded = parts.slice(0, 4).join('')

  try {
    return Buffer.from(encoded, 'hex').toString('utf-8')
  } catch (error) {
    throw new Error('Failed to decode machine ID from license key')
  }
}
