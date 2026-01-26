import { getPendingChanges, markAsSynced, markAsFailed, getLastSyncCheckpoint, updateLastSyncCheckpoint, getPendingChangesCount } from './queue'
import { pushChanges, pullChanges } from './api'
import { applyRemoteChanges } from './conflict'
import { registerWebUser, isWebUserRegistered } from '../web-auth'
import type { SyncResult, SyncOptions } from './types'

let syncInProgress = false
let syncInterval: NodeJS.Timeout | null = null
let lastError: string | null = null

/**
 * Perform a sync operation (push + pull)
 * @param _options - Sync options
 * @returns Sync result
 */
export async function performSync(_options: SyncOptions = {}): Promise<SyncResult> {
  if (syncInProgress) {
    console.log('[SYNC] Sync already in progress, skipping')
    return {
      success: false,
      pushed: 0,
      pulled: 0,
      failed: 0,
      conflicts: 0,
      duration: 0,
      error: 'Sync already in progress'
    }
  }

  const startTime = Date.now()
  syncInProgress = true
  lastError = null

  console.log('[SYNC] Starting sync...')

  try {
    // Check if we have internet connection
    const hasConnection = await checkInternetConnection()
    if (!hasConnection) {
      throw new Error('No internet connection')
    }

    // 1. Get pending local changes
    const pendingChanges = await getPendingChanges()
    console.log(`[SYNC] Found ${pendingChanges.length} pending changes to push`)

    let pushed = 0
    let failed = 0
    let pulled = 0
    let conflicts = 0

    // 2. Push local changes to cloud
    if (pendingChanges.length > 0) {
      try {
        const pushResult = await pushChanges(pendingChanges)
        console.log(`[SYNC] Pushed ${pushResult.processed} changes successfully`)

        pushed = pushResult.processed
        failed = pushResult.failed

        // Mark successfully synced items
        if (pushed > 0) {
          const syncedIds = pendingChanges.slice(0, pushed).map((c) => c.id!)
          await markAsSynced(syncedIds)
        }

        // Mark failed items
        if (failed > 0) {
          const failedItems = pendingChanges.slice(pushed)
          for (const item of failedItems) {
            await markAsFailed(item.id!, 'Server rejected change')
          }
        }

        // 3. Apply remote changes (if any returned from push)
        if (pushResult.remote_changes && pushResult.remote_changes.length > 0) {
          console.log(`[SYNC] Applying ${pushResult.remote_changes.length} remote changes`)
          conflicts = await applyRemoteChanges(pushResult.remote_changes)
          pulled = pushResult.remote_changes.length
        }

        // Update checkpoint
        if (pushResult.new_checkpoint) {
          await updateLastSyncCheckpoint(pushResult.new_checkpoint)
        }

      } catch (pushError: any) {
        console.error('[SYNC] Push failed:', pushError)
        throw pushError
      }
    } else {
      console.log('[SYNC] No local changes to push, checking for remote changes...')
    }

    // 4. Pull any additional remote changes
    const lastCheckpoint = await getLastSyncCheckpoint()
    const pullResponse = await pullChanges(lastCheckpoint)

    if (pullResponse.changes && pullResponse.changes.length > 0) {
      console.log(`[SYNC] Pulled ${pullResponse.changes.length} additional changes`)
      const pullConflicts = await applyRemoteChanges(pullResponse.changes)
      conflicts += pullConflicts
      pulled += pullResponse.changes.length

      // Update checkpoint
      if (pullResponse.checkpoint) {
        await updateLastSyncCheckpoint(pullResponse.checkpoint)
      }
    }

    const duration = Date.now() - startTime
    console.log(`[SYNC] Sync completed successfully in ${duration}ms`)

    return {
      success: true,
      pushed,
      pulled,
      failed,
      conflicts,
      duration
    }

  } catch (error: any) {
    const duration = Date.now() - startTime
    lastError = error.message || 'Unknown error'
    console.error('[SYNC] Sync failed:', lastError)

    return {
      success: false,
      pushed: 0,
      pulled: 0,
      failed: await getPendingChangesCount(),
      conflicts: 0,
      duration,
      error: lastError || undefined
    }
  } finally {
    syncInProgress = false
  }
}

/**
 * Start automatic sync with specified interval
 * @param intervalMs - Sync interval in milliseconds (default: 30000 = 30 seconds)
 */
export function startAutoSync(intervalMs: number = 30000): void {
  if (syncInterval) {
    console.log('[SYNC] Stopping existing auto-sync')
    stopAutoSync()
  }

  console.log(`[SYNC] Starting auto-sync (interval: ${intervalMs}ms)`)

  // Perform initial sync
  performSync().catch((err) => {
    console.error('[SYNC] Initial sync failed:', err)
  })

  // Schedule recurring sync
  syncInterval = setInterval(() => {
    performSync().catch((err) => {
      console.error('[SYNC] Auto-sync error:', err)
    })
  }, intervalMs)
}

/**
 * Stop automatic sync
 */
export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
    console.log('[SYNC] Auto-sync stopped')
  }
}

/**
 * Check if sync is currently in progress
 */
export function isSyncInProgress(): boolean {
  return syncInProgress
}

/**
 * Get last sync error
 */
export function getLastError(): string | null {
  return lastError
}

/**
 * Check internet connection
 */
async function checkInternetConnection(): Promise<boolean> {
  try {
    // Try to reach a reliable endpoint
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    await fetch('https://www.google.com', {
      method: 'HEAD',
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Get sync status summary
 */
export async function getSyncStatus(): Promise<{
  enabled: boolean
  inProgress: boolean
  pendingChanges: number
  lastSync: number | null
  lastError: string | null
}> {
  return {
    enabled: syncInterval !== null,
    inProgress: syncInProgress,
    pendingChanges: await getPendingChangesCount(),
    lastSync: await getLastSyncCheckpoint(),
    lastError: getLastError()
  }
}

/**
 * Manually trigger a sync (useful for "Sync Now" button)
 */
export async function manualSync(): Promise<SyncResult> {
  console.log('[SYNC] Manual sync triggered')
  return await performSync()
}

/**
 * Enable sync with default settings
 * Also registers web user if not already registered
 */
export async function enableSync(webUserInfo?: { phone: string; password: string; full_name?: string; factory_name?: string }): Promise<void> {
  // Register web user if info provided and not already registered
  if (webUserInfo && !isWebUserRegistered()) {
    console.log('[SYNC] Registering web user...')
    const result = await registerWebUser(webUserInfo)
    if (result.success) {
      console.log('[SYNC] Web user registered successfully')
    } else {
      console.error('[SYNC] Failed to register web user:', result.error)
    }
  }

  startAutoSync(30000) // 30 second interval
}

/**
 * Disable sync
 */
export function disableSync(): void {
  stopAutoSync()
}
