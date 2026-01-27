import { getLicenseInfo } from '../license'
import type {
  SyncQueueItem,
  PushRequest,
  SyncResponse,
  PullRequest,
  PullResponse,
  FullSyncRequest,
  FullSyncResponse
} from './types'

const API_BASE = 'https://dates-factory-manager-cloud.vercel.app/api/sync'

/**
 * Push local changes to the cloud
 * @param changes - Array of sync queue items to push
 * @returns Sync response from server
 */
export async function pushChanges(changes: SyncQueueItem[]): Promise<SyncResponse> {
  const license = getLicenseInfo()

  if (!license.licenseKey) {
    throw new Error('No license key found')
  }

  const requestBody: PushRequest = {
    licenseKey: license.licenseKey,
    changes,
    last_sync_checkpoint: await getLastSyncCheckpoint()
  }

  const response = await fetch(`${API_BASE}/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${license.licenseKey}`
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Push failed (${response.status}): ${errorText}`)
  }

  const data: SyncResponse = await response.json()
  return data
}

/**
 * Pull remote changes from the cloud
 * @param lastCheckpoint - Last sync checkpoint timestamp
 * @returns Pull response with remote changes
 */
export async function pullChanges(lastCheckpoint: number): Promise<PullResponse> {
  const license = getLicenseInfo()

  if (!license.licenseKey) {
    throw new Error('No license key found')
  }

  const requestBody: PullRequest = {
    licenseKey: license.licenseKey,
    last_sync_checkpoint: lastCheckpoint
  }

  const response = await fetch(`${API_BASE}/pull`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${license.licenseKey}`
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Pull failed (${response.status}): ${errorText}`)
  }

  const data: PullResponse = await response.json()
  return data
}

/**
 * Perform full sync (push + pull in one request)
 * @param changes - Local changes to push
 * @param lastCheckpoint - Last sync checkpoint timestamp
 * @returns Full sync response
 */
export async function fullSync(
  changes: SyncQueueItem[],
  lastCheckpoint: number
): Promise<FullSyncResponse> {
  const license = getLicenseInfo()

  if (!license.licenseKey) {
    throw new Error('No license key found')
  }

  const requestBody: FullSyncRequest = {
    licenseKey: license.licenseKey,
    changes,
    last_sync_checkpoint: lastCheckpoint
  }

  const response = await fetch(`${API_BASE}/full`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${license.licenseKey}`
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Full sync failed (${response.status}): ${errorText}`)
  }

  const data: FullSyncResponse = await response.json()
  return data
}

/**
 * Get factory database information
 * @returns Factory database info
 */
export async function getFactoryDatabaseInfo(): Promise<{
  machineId: string
  databaseName: string
  lastSync: string | null
  syncStatus: string
}> {
  const license = getLicenseInfo()

  if (!license.licenseKey) {
    throw new Error('No license key found')
  }

  const response = await fetch(`${API_BASE}/database-info`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${license.licenseKey}`
    },
    body: JSON.stringify({
      licenseKey: license.licenseKey
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Database info request failed (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  return {
    machineId: data.machineId || license.machineId,
    databaseName: data.databaseName,
    lastSync: data.lastSync || null,
    syncStatus: data.syncStatus || 'unknown'
  }
}

/**
 * Check sync API health
 * @returns true if API is accessible
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    return response.ok
  } catch (error) {
    console.error('API health check failed:', error)
    return false
  }
}

/**
 * Helper: Get last sync checkpoint from local metadata
 */
async function getLastSyncCheckpoint(): Promise<number> {
  // This will be imported from queue.ts to avoid circular dependency
  // For now, return 0 (will be implemented in index.ts)
  return 0
}
