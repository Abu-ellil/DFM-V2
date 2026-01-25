import { getDb, saveDatabase } from '../db'
import { SyncQueueItem } from './types'
import { getLicenseInfo } from '../license'

/**
 * Enqueue a database change for synchronization
 * @param item - The sync queue item to add
 */
export async function enqueueChange(item: SyncQueueItem): Promise<void> {
  const db = getDb()

  // Get current record data for UPDATE/DELETE operations
  let recordData = item.data
  if (item.operation === 'UPDATE' || item.operation === 'DELETE') {
    try {
      const result = db.exec(`SELECT * FROM ${item.table} WHERE id = ${item.record_id}`)
      if (result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns
        const values = result[0].values[0]
        recordData = {}
        columns.forEach((col, index) => {
          recordData[col] = values[index]
        })
      }
    } catch (e) {
      console.error(`Error fetching record data for ${item.table}#${item.record_id}:`, e)
    }
  }

  const stmt = db.prepare(`
    INSERT INTO sync_queue (operation, table_name, record_id, data, client_timestamp, synced)
    VALUES (?, ?, ?, ?, ?, 0)
  `)

  stmt.bind([
    item.operation,
    item.table,
    item.record_id,
    JSON.stringify(recordData),
    item.client_timestamp || Date.now()
  ])

  stmt.run()
  stmt.free()
  await saveDatabase()
}

/**
 * Get pending changes from sync queue
 * @param limit - Maximum number of changes to retrieve
 * @returns Array of pending sync queue items
 */
export async function getPendingChanges(limit: number = 100): Promise<SyncQueueItem[]> {
  const db = getDb()
  const license = getLicenseInfo()

  const result = db.exec(`
    SELECT id, operation, table_name, record_id, data, client_timestamp, synced, sync_attempt_count, last_sync_error
    FROM sync_queue
    WHERE synced = 0
    ORDER BY created_at ASC
    LIMIT ${limit}
  `)

  if (result.length === 0) return []

  const columns = result[0].columns
  return result[0].values.map((row) => {
    const item: any = {}
    columns.forEach((col, index) => {
      let value = row[index]
      // Parse JSON fields
      if (col === 'data') {
        value = typeof value === 'string' ? JSON.parse(value) : value
      }
      // Map column names to interface
      if (col === 'table_name') col = 'table'
      item[col] = value
    })

    // Add client_id from license
    item.client_id = license.machineId

    return item as SyncQueueItem
  })
}

/**
 * Get count of pending changes
 * @returns Number of pending changes
 */
export async function getPendingChangesCount(): Promise<number> {
  const db = getDb()
  const result = db.exec('SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0')
  if (result.length === 0 || result[0].values.length === 0) return 0
  return result[0].values[0][0] as number
}

/**
 * Mark sync queue items as synced
 * @param queueIds - Array of sync queue IDs to mark as synced
 */
export async function markAsSynced(queueIds: number[]): Promise<void> {
  if (queueIds.length === 0) return

  const db = getDb()
  const stmt = db.prepare('UPDATE sync_queue SET synced = 1 WHERE id = ?')

  queueIds.forEach((id) => {
    stmt.bind([id])
    stmt.run()
    stmt.reset()
  })

  stmt.free()
  await saveDatabase()
}

/**
 * Mark sync queue item as failed
 * @param queueId - Sync queue ID
 * @param errorMessage - Error message to store
 */
export async function markAsFailed(queueId: number, errorMessage: string): Promise<void> {
  const db = getDb()
  const stmt = db.prepare(`
    UPDATE sync_queue
    SET sync_attempt_count = sync_attempt_count + 1,
        last_sync_error = ?
    WHERE id = ?
  `)

  stmt.bind([errorMessage, queueId])
  stmt.run()
  stmt.free()
  await saveDatabase()
}

/**
 * Clear synced items from sync queue (cleanup)
 * @param olderThanDays - Delete items synced more than this many days ago
 */
export async function clearSyncedItems(olderThanDays: number = 30): Promise<number> {
  const db = getDb()
  const stmt = db.prepare(`
    DELETE FROM sync_queue
    WHERE synced = 1
    AND datetime(created_at) < datetime('now', '-' || ? || ' days')
  `)

  stmt.bind([olderThanDays])
  stmt.run()
  const changes = db.getRowsModified()
  stmt.free()

  await saveDatabase()
  return changes
}

/**
 * Log a conflict resolution
 * @param tableName - Table name
 * @param recordId - Record ID
 * @param localData - Local data (JSON string)
 * @param remoteData - Remote data (JSON string)
 * @param resolution - How the conflict was resolved
 */
export async function logConflict(
  tableName: string,
  recordId: number,
  localData: any,
  remoteData: any,
  resolution: string
): Promise<void> {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO _conflict_log (table_name, record_id, local_data, remote_data, resolution)
    VALUES (?, ?, ?, ?, ?)
  `)

  stmt.bind([
    tableName,
    recordId,
    JSON.stringify(localData),
    JSON.stringify(remoteData),
    resolution
  ])

  stmt.run()
  stmt.free()
  await saveDatabase()
}

/**
 * Get sync metadata value
 * @param key - Metadata key
 * @returns Metadata value or null
 */
export async function getSyncMetadata(key: string): Promise<string | null> {
  const db = getDb()
  const result = db.exec(`SELECT value FROM _sync_metadata WHERE key = '${key}'`)

  if (result.length === 0 || result[0].values.length === 0) return null
  return result[0].values[0][0] as string
}

/**
 * Set sync metadata value
 * @param key - Metadata key
 * @param value - Metadata value
 */
export async function setSyncMetadata(key: string, value: string): Promise<void> {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO _sync_metadata (key, value)
    VALUES (?, ?)
  `)

  stmt.bind([key, value])
  stmt.run()
  stmt.free()
  await saveDatabase()
}

/**
 * Get last sync checkpoint timestamp
 * @returns Last sync checkpoint or 0 if never synced
 */
export async function getLastSyncCheckpoint(): Promise<number> {
  const checkpoint = await getSyncMetadata('last_sync_checkpoint')
  return checkpoint ? parseInt(checkpoint, 10) : 0
}

/**
 * Update last sync checkpoint
 * @param timestamp - Checkpoint timestamp
 */
export async function updateLastSyncCheckpoint(timestamp: number): Promise<void> {
  await setSyncMetadata('last_sync_checkpoint', timestamp.toString())
}
