import { useEffect } from 'react'
import { useSyncStore } from '../store/useSyncStore'
import Cloud from 'lucide-react/dist/esm/icons/cloud'
import CloudOff from 'lucide-react/dist/esm/icons/cloud-off'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import XCircle from 'lucide-react/dist/esm/icons/x-circle'
import Loader2 from 'lucide-react/dist/esm/icons/loader-2'
import { clsx } from 'clsx'

export function SyncStatus() {
  const { enabled, inProgress, pendingChanges, lastSync, status, fetchStatus } = useSyncStore()

  // Fetch sync status on mount and every 10 seconds
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const getStatusIcon = () => {
    if (!enabled) return <CloudOff className="w-4 h-4" />
    if (inProgress || status === 'syncing') return <Loader2 className="w-4 h-4 animate-spin" />
    if (status === 'error') return <XCircle className="w-4 h-4 text-red-500" />
    if (status === 'success') return <CheckCircle className="w-4 h-4 text-green-500" />
    return <Cloud className={clsx('w-4 h-4', pendingChanges > 0 ? 'text-yellow-500' : 'text-gray-500')} />
  }

  const getStatusText = () => {
    if (!enabled) return 'Sync disabled'
    if (inProgress || status === 'syncing') return 'Syncing...'
    if (status === 'error') return 'Sync failed'
    if (status === 'success') return 'Synced'
    if (pendingChanges > 0) return `${pendingChanges} pending`
    return 'Synced'
  }

  const formatLastSync = () => {
    if (!lastSync) return 'Never'
    const seconds = Math.floor((Date.now() - lastSync) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const handleClick = async () => {
    if (!enabled) return
    const { manualSync } = useSyncStore.getState()
    await manualSync()
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer',
        !enabled && 'opacity-50 cursor-not-allowed',
        enabled && !inProgress && 'hover:bg-gray-100 dark:hover:bg-gray-800',
        status === 'error' && 'bg-red-50 dark:bg-red-900/20'
      )}
      onClick={handleClick}
      title={enabled ? `Click to sync now\nLast sync: ${formatLastSync()}` : 'Sync is disabled'}
    >
      {getStatusIcon()}
      <span className="text-sm font-medium">{getStatusText()}</span>
      {pendingChanges > 0 && enabled && !inProgress && (
        <span className="flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-yellow-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
        </span>
      )}
      {inProgress && <RefreshCw className="w-3 h-3 animate-spin" />}
    </div>
  )
}
