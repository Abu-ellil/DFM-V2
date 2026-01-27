import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withLicenseAuth } from '../../src/lib/auth.js'
import { createNeonConnection, getChangesSince } from '../../src/lib/neon.js'

/**
 * POST /api/sync/pull
 *
 * Sends changes from the cloud database to the desktop app
 *
 * Request body:
 * {
 *   licenseKey: string,
 *   last_sync_checkpoint: number
 * }
 *
 * Response:
 * {
 *   success: true,
 *   changes: Array<{
 *     operation: string,
 *     table: string,
 *     data: any,
 *     server_timestamp: number
 *   }>,
 *   checkpoint: number
 * }
 */
export default withLicenseAuth(async (request: VercelRequest, response: VercelResponse, factory) => {
  try {
    // Parse request body
    const body = request.body
    const { last_sync_checkpoint } = body

    if (typeof last_sync_checkpoint !== 'number') {
      return response.status(400).json({
        success: false,
        error: 'Invalid checkpoint format'
      })
    }

    // Connect to factory's Neon database
    const sql = createNeonConnection(factory.databaseUrl)

    // Tables to sync
    const tables = [
      'customers',
      'weighbridge',
      'crates',
      'finance',
      'users',
      'date_types',
      'crate_types',
      'daily_prices',
      'supervisors'
    ]

    // Get changes since checkpoint
    const changes = await getChangesSince(sql, tables, last_sync_checkpoint)

    // Calculate new checkpoint
    const checkpoint = Date.now()

    // Return success response
    return response.status(200)
      .setHeader('Cache-Control', 'no-store')
      .json({
        success: true,
        changes,
        checkpoint
      })
  } catch (error: any) {
    console.error('Pull error:', error)

    return response.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      changes: [],
      checkpoint: 0
    })
  }
})
