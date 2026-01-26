import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withLicenseAuth } from '../../src/lib/auth.js'
import { createNeonConnection } from '../../src/lib/neon.js'

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
export default withLicenseAuth(async (request: VercelRequest, response: VercelResponse, factory) => {
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
    return response.status(200)
      .setHeader('Cache-Control', 'no-store, max-age=0')
      .json({
        success: true,
        machineId: factory.machineId,
        databaseName: factory.databaseName,
        lastSync,
        syncStatus
      })
  } catch (error: any) {
    console.error('Database info error:', error)

    return response.status(500).json({
      success: false,
      error: error.message || 'Failed to get database info',
      machineId: factory.machineId,
      databaseName: factory.databaseName,
      lastSync: null,
      syncStatus: 'error'
    })
  }
})
