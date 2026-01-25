import { NextRequest } from 'next/server'
import { withLicenseAuth } from '../lib/auth'
import { createNeonConnection } from '../lib/neon'

/**
 * POST /api/sync/database-info
 *
 * Returns information about the factory's database
 *
 * Request body:
 * {
 *   licenseKey: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   machineId: string,
 *   databaseName: string,
 *   lastSync: string | null,
 *   syncStatus: 'connected' | 'disconnected' | 'error'
 * }
 */
export const config = {
  runtime: 'edge',
  maxDuration: 10
}

export default withLicenseAuth(async (request: NextRequest, factory) => {
  try {
    // Connect to factory's Neon database
    const sql = createNeonConnection(factory.databaseUrl)

    // Test connection and get database stats
    let lastSync: string | null = null
    let syncStatus: 'connected' | 'disconnected' | 'error' = 'connected'

    try {
      // Query to get the most recent sync timestamp
      const result = await sql`
        SELECT _synced_at
        FROM customers
        WHERE _synced_at IS NOT NULL
        ORDER BY _synced_at DESC
        LIMIT 1
      `

      if (result.length > 0) {
        lastSync = new Date(result[0]._synced_at).toISOString()
      }
    } catch (error: any) {
      console.error('Failed to get last sync:', error)
      syncStatus = 'error'
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        machineId: factory.machineId,
        databaseName: factory.databaseName,
        lastSync,
        syncStatus
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    )
  } catch (error: any) {
    console.error('Database info error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to get database info',
        machineId: factory.machineId,
        databaseName: factory.databaseName,
        lastSync: null,
        syncStatus: 'error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
