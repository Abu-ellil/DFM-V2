/**
 * Sync operation types
 */
export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE'

/**
 * Sync queue item representation
 */
export interface SyncQueueItem {
  id?: number
  operation: SyncOperation
  table: string
  record_id: number
  data: Record<string, any>
  client_timestamp: number
  synced?: number
  sync_attempt_count?: number
  last_sync_error?: string
}

/**
 * Remote change from server
 */
export interface RemoteChange {
  operation: SyncOperation
  table: string
  data: Record<string, any>
  server_timestamp: number
}

/**
 * Sync request to push changes
 */
export interface PushRequest {
  licenseKey: string
  changes: SyncQueueItem[]
  last_sync_checkpoint?: number
}

/**
 * Sync response from server
 */
export interface SyncResponse {
  success: boolean
  processed: number
  failed: number
  remote_changes: RemoteChange[]
  new_checkpoint: number
  error?: string
}

/**
 * Pull request to get remote changes
 */
export interface PullRequest {
  licenseKey: string
  last_sync_checkpoint: number
}

/**
 * Pull response from server
 */
export interface PullResponse {
  success: boolean
  changes: RemoteChange[]
  checkpoint: number
  error?: string
}

/**
 * Full sync request (push + pull)
 */
export interface FullSyncRequest {
  licenseKey: string
  changes: SyncQueueItem[]
  last_sync_checkpoint: number
}

/**
 * Full sync response
 */
export interface FullSyncResponse extends SyncResponse {}

/**
 * Sync status
 */
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

/**
 * Sync metadata
 */
export interface SyncMetadata {
  lastSync: number | null
  lastSyncStatus: SyncStatus
  pendingChanges: number
  lastError?: string
  syncEnabled: boolean
}

/**
 * Conflict log entry
 */
export interface ConflictLog {
  id?: number
  table_name: string
  record_id: number
  local_data: string
  remote_data: string
  resolution: string | null
  created_at: string
}

/**
 * Sync options
 */
export interface SyncOptions {
  intervalMs?: number // Auto-sync interval (default: 30000ms)
  retryAttempts?: number // Number of retry attempts (default: 3)
  retryDelayMs?: number // Delay between retries (default: 5000ms)
  forceFullSync?: boolean // Force full sync
}

/**
 * Sync result
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
 * Factory database info
 */
export interface FactoryDatabaseInfo {
  machineId: string
  databaseName: string
  databaseUrl: string
  lastSync?: string
  syncStatus: 'connected' | 'disconnected' | 'error'
}
