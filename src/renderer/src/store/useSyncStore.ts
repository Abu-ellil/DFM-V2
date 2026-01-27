import { create } from 'zustand'
import { SyncStatus } from '../types/sync'

interface SyncState {
  // State
  enabled: boolean
  inProgress: boolean
  pendingChanges: number
  lastSync: number | null
  lastError: string | null
  status: SyncStatus

  // Actions
  fetchStatus: () => Promise<void>
  manualSync: () => Promise<void>
  enableSync: () => Promise<void>
  disableSync: () => Promise<void>
  setStatus: (status: SyncStatus) => void
}

export const useSyncStore = create<SyncState>((set) => ({
  // Initial state
  enabled: false,
  inProgress: false,
  pendingChanges: 0,
  lastSync: null,
  lastError: null,
  status: 'idle',

  // Fetch sync status from main process
  fetchStatus: async () => {
    try {
      const result = await window.api.sync.getStatus()
      if (result.success) {
        const data = result.data
        set({
          enabled: data.enabled,
          inProgress: data.inProgress,
          pendingChanges: data.pendingChanges,
          lastSync: data.lastSync,
          lastError: data.lastError,
          status: data.inProgress ? 'syncing' : data.lastError ? 'error' : 'idle'
        })
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error)
      set({ lastError: 'Failed to fetch sync status' })
    }
  },

  // Trigger manual sync
  manualSync: async () => {
    set({ status: 'syncing', inProgress: true, lastError: null })
    try {
      const result = await window.api.sync.manualSync()
      if (result.success) {
        const data = result.data
        set({
          status: 'success',
          inProgress: false,
          pendingChanges: data.failed,
          lastSync: Date.now(),
          lastError: data.error || null
        })

        // Reset status after 3 seconds
        setTimeout(() => {
          set({ status: 'idle' })
        }, 3000)
      } else {
        set({
          status: 'error',
          inProgress: false,
          lastError: 'Sync failed'
        })
      }
    } catch (error: any) {
      console.error('Manual sync failed:', error)
      set({
        status: 'error',
        inProgress: false,
        lastError: error.message || 'Sync failed'
      })
    }
  },

  // Enable auto-sync
  enableSync: async () => {
    try {
      const result = await window.api.sync.enable()
      if (result.success) {
        set({ enabled: true })
      }
    } catch (error) {
      console.error('Failed to enable sync:', error)
    }
  },

  // Disable auto-sync
  disableSync: async () => {
    try {
      const result = await window.api.sync.disable()
      if (result.success) {
        set({ enabled: false })
      }
    } catch (error) {
      console.error('Failed to disable sync:', error)
    }
  },

  // Manually set status
  setStatus: (status: SyncStatus) => {
    set({ status })
  }
}))
