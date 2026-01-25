import { NextRequest } from 'next/server'
import { withLicenseAuth } from '../lib/auth'
import { createNeonConnection, getChangesSince } from '../lib/neon'

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
export const config = {
  runtime: 'edge',
  maxDuration: 10
}

export default withLicenseAuth(async (request: NextRequest, factory) => {
  try {
    // Parse request body
    const body = await request.json()
    const { last_sync_checkpoint } = body

    if (typeof last_sync_checkpoint !== 'number') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid checkpoint format'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
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
    return new Response(
      JSON.stringify({
        success: true,
        changes,
        checkpoint
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    )
  } catch (error: any) {
    console.error('Pull error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        changes: [],
        checkpoint: 0
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
