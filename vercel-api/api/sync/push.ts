import { NextRequest } from 'next/server'
import { withLicenseAuth } from '../lib/auth'
import { createNeonConnection, applyChange, getChangesSince } from '../lib/neon'

/**
 * POST /api/sync/push
 *
 * Receives changes from desktop app and applies them to the factory's Neon database
 *
 * Request body:
 * {
 *   licenseKey: string,
 *   changes: Array<{
 *     operation: 'INSERT' | 'UPDATE' | 'DELETE',
 *     table: string,
 *     record_id: number,
 *     data: Record<string, any>,
 *     client_timestamp: number
 *   }>,
 *   last_sync_checkpoint?: number
 * }
 *
 * Response:
 * {
 *   success: true,
 *   processed: number,
 *   failed: number,
 *   remote_changes: Array<{
 *     operation: string,
 *     table: string,
 *     data: any,
 *     server_timestamp: number
 *   }>,
 *   new_checkpoint: number
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
    const { changes, last_sync_checkpoint } = body

    if (!Array.isArray(changes)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid changes format'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Connect to factory's Neon database
    const sql = createNeonConnection(factory.databaseUrl)

    // Initialize schema if needed (creates tables if they don't exist)
    // Uncomment this line if you want auto-schema creation:
    // await initializeFactorySchema(sql)

    let processed = 0
    let failed = 0
    const errors: Array<{ change: any; error: string }> = []

    // Apply each change
    for (const change of changes) {
      try {
        await applyChange(sql, {
          operation: change.operation,
          table: change.table,
          record_id: change.record_id,
          data: change.data,
          client_id: factory.machineId,
          client_timestamp: change.client_timestamp || Date.now()
        })
        processed++
      } catch (error: any) {
        console.error(`Failed to apply change ${change.table}#${change.record_id}:`, error)
        failed++
        errors.push({
          change: { table: change.table, record_id: change.record_id },
          error: error.message
        })
      }
    }

    // Get remote changes since last checkpoint
    let remoteChanges: any[] = []
    if (last_sync_checkpoint) {
      try {
        remoteChanges = await getChangesSince(
          sql,
          ['customers', 'weighbridge', 'crates', 'finance', 'users'],
          last_sync_checkpoint
        )
      } catch (error: any) {
        console.error('Failed to get remote changes:', error)
      }
    }

    // Calculate new checkpoint
    const newCheckpoint = Date.now()

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        remote_changes: remoteChanges,
        new_checkpoint: newCheckpoint,
        errors: errors.length > 0 ? errors : undefined
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
    console.error('Push error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        processed: 0,
        failed: 0,
        remote_changes: [],
        new_checkpoint: 0
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
