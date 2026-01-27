import { getDb, saveDatabase } from '../db'
import { RemoteChange } from './types'
import { logConflict } from './queue'

/**
 * Apply remote changes to local database
 * @param changes - Array of remote changes from server
 * @returns Number of conflicts detected
 */
export async function applyRemoteChanges(changes: RemoteChange[]): Promise<number> {
  if (changes.length === 0) return 0

  const db = getDb()
  let conflictCount = 0

  for (const change of changes) {
    try {
      const conflict = await applyRemoteChange(db, change)
      if (conflict) {
        conflictCount++
      }
    } catch (error) {
      console.error(`Error applying remote change for ${change.table}:`, error)
    }
  }

  await saveDatabase()
  return conflictCount
}

/**
 * Apply a single remote change
 * @param db - Database instance
 * @param change - Remote change to apply
 * @returns true if conflict was detected
 */
async function applyRemoteChange(
  db: any,
  change: RemoteChange
): Promise<boolean> {
  const { operation, table, data, server_timestamp } = change

  // Check if record exists locally
  const localRecord = await getLocalRecord(db, table, data.id)

  switch (operation) {
    case 'INSERT':
      if (localRecord) {
        // Record already exists locally - potential conflict
        return await handleInsertConflict(db, table, data, localRecord, server_timestamp)
      } else {
        // Safe to insert
        await insertRecord(db, table, { ...data, _synced_at: server_timestamp })
        return false
      }

    case 'UPDATE':
      if (!localRecord) {
        // Record doesn't exist locally, insert it
        await insertRecord(db, table, { ...data, _synced_at: server_timestamp })
        return false
      } else {
        // Check for conflict
        return await handleUpdateConflict(db, table, data, localRecord, server_timestamp)
      }

    case 'DELETE':
      if (localRecord) {
        await deleteRecord(db, table, data.id)
      }
      return false

    default:
      console.warn(`Unknown operation: ${operation}`)
      return false
  }
}

/**
 * Get local record by ID
 */
async function getLocalRecord(db: any, table: string, id: number): Promise<any> {
  try {
    const result = db.exec(`SELECT * FROM ${table} WHERE id = ${id}`)
    if (result.length === 0 || result[0].values.length === 0) return null

    const columns = result[0].columns
    const values = result[0].values[0]
    const record: any = {}

    columns.forEach((col: string, index: number) => {
      record[col] = values[index]
    })

    return record
  } catch (error) {
    console.error(`Error fetching local record from ${table}:`, error)
    return null
  }
}

/**
 * Handle INSERT conflict (record already exists)
 * Conflict resolution: Last-write-wins based on timestamps
 */
async function handleInsertConflict(
  db: any,
  table: string,
  remoteData: any,
  localData: any,
  serverTimestamp: number
): Promise<boolean> {
  const localSyncedAt = localData._synced_at || 0

  if (serverTimestamp > localSyncedAt) {
    // Remote is newer, update local record
    await updateRecord(db, table, remoteData.id, {
      ...remoteData,
      _synced_at: serverTimestamp
    })

    await logConflict(
      table,
      remoteData.id,
      localData,
      remoteData,
      `remote_wins (remote_ts: ${serverTimestamp} > local_ts: ${localSyncedAt})`
    )

    return true
  } else {
    // Local is newer or same, keep local
    await logConflict(
      table,
      remoteData.id,
      localData,
      remoteData,
      `local_wins (local_ts: ${localSyncedAt} >= remote_ts: ${serverTimestamp})`
    )

    return true
  }
}

/**
 * Handle UPDATE conflict
 * Conflict resolution: Last-write-wins based on timestamps
 */
async function handleUpdateConflict(
  db: any,
  table: string,
  remoteData: any,
  localData: any,
  serverTimestamp: number
): Promise<boolean> {
  const localSyncedAt = localData._synced_at || 0
  const localVersion = localData._version || 1
  const remoteVersion = remoteData._version || 1

  // If timestamps are equal, use version number as tiebreaker
  if (serverTimestamp === localSyncedAt) {
    if (remoteVersion > localVersion) {
      // Remote version is higher
      await updateRecord(db, table, remoteData.id, {
        ...remoteData,
        _synced_at: serverTimestamp,
        _version: remoteVersion
      })

      await logConflict(
        table,
        remoteData.id,
        localData,
        remoteData,
        `remote_wins (version ${remoteVersion} > ${localVersion})`
      )

      return true
    } else {
      // Local version is higher or equal, keep local
      await logConflict(
        table,
        remoteData.id,
        localData,
        remoteData,
        `local_wins (version ${localVersion} >= ${remoteVersion})`
      )

      return true
    }
  }

  // Use timestamp as primary comparison
  if (serverTimestamp > localSyncedAt) {
    // Remote is newer
    await updateRecord(db, table, remoteData.id, {
      ...remoteData,
      _synced_at: serverTimestamp,
      _version: remoteVersion
    })

    await logConflict(
      table,
      remoteData.id,
      localData,
      remoteData,
      `remote_wins (timestamp: ${serverTimestamp} > ${localSyncedAt})`
    )

    return true
  } else {
    // Local is newer, keep local
    await logConflict(
      table,
      remoteData.id,
      localData,
      remoteData,
      `local_wins (timestamp: ${localSyncedAt} > ${serverTimestamp})`
    )

    return true
  }
}

/**
 * Insert a record into the database
 */
async function insertRecord(db: any, table: string, data: any): Promise<void> {
  const columns = Object.keys(data).filter((k) => !k.startsWith('_'))
  const values = columns.map((k) => data[k])

  const placeholders = columns.map(() => '?').join(', ')
  const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`)

  stmt.bind(values)
  stmt.run()
  stmt.free()
}

/**
 * Update a record in the database
 */
async function updateRecord(db: any, table: string, id: number, data: any): Promise<void> {
  const columns = Object.keys(data).filter((k) => k !== 'id')
  const values = columns.map((k) => data[k])

  const setClause = columns.map((k) => `${k} = ?`).join(', ')
  const stmt = db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`)

  stmt.bind([...values, id])
  stmt.run()
  stmt.free()
}

/**
 * Delete a record from the database
 */
async function deleteRecord(db: any, table: string, id: number): Promise<void> {
  const stmt = db.prepare(`DELETE FROM ${table} WHERE id = ?`)
  stmt.bind([id])
  stmt.run()
  stmt.free()
}

/**
 * Get recent conflict log entries
 * @param limit - Maximum number of conflicts to retrieve
 * @returns Array of conflict log entries
 */
export async function getRecentConflicts(limit: number = 50) {
  const db = getDb()
  const result = db.exec(`
    SELECT * FROM _conflict_log
    ORDER BY created_at DESC
    LIMIT ${limit}
  `)

  if (result.length === 0) return []

  const columns = result[0].columns
  return result[0].values.map((row) => {
    const conflict: any = {}
    columns.forEach((col: string, index: number) => {
      let value = row[index]
      // Parse JSON fields
      if (col === 'local_data' || col === 'remote_data') {
        if (typeof value === 'string') {
          try {
            value = JSON.parse(value)
          } catch (e) {
            // Keep as string if not valid JSON
          }
        }
      }
      conflict[col] = value
    })
    return conflict
  })
}

/**
 * Clear old conflict log entries
 * @param olderThanDays - Delete entries older than this many days
 */
export async function clearOldConflicts(olderThanDays: number = 90): Promise<number> {
  const db = getDb()
  const stmt = db.prepare(`
    DELETE FROM _conflict_log
    WHERE datetime(created_at) < datetime('now', '-' || ? || ' days')
  `)

  stmt.bind([olderThanDays])
  stmt.run()
  const changes = db.getRowsModified()
  stmt.free()

  await saveDatabase()
  return changes
}
