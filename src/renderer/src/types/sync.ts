/**
 * Sync status states
 */
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

/**
 * Sync metadata from backend
 */
export interface SyncMetadata {
  enabled: boolean
  inProgress: boolean
  pendingChanges: number
  lastSync: number | null
  lastError: string | null
}

/**
 * Sync result from manual sync operation
 */
export interface SyncResult {
  success: boolean
  pushed: number
  pulled: number
  failed: number
  conflicts: number
  duration: number
  error?: string
}

/**
 * Conflict log entry
 */
export interface ConflictLog {
  id: number
  table_name: string
  record_id: number
  local_data: any
  remote_data: any
  resolution: string | null
  created_at: string
}
