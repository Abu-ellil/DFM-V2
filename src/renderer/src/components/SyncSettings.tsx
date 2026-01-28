import { useEffect, useState } from 'react'
import { useSyncStore } from '../store/useSyncStore'
import { Card } from './ui/Card'
import { Switch } from '@headlessui/react'
import Cloud from 'lucide-react/dist/esm/icons/cloud'
import CloudOff from 'lucide-react/dist/esm/icons/cloud-off'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import XCircle from 'lucide-react/dist/esm/icons/x-circle'
import Clock from 'lucide-react/dist/esm/icons/clock'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import { clsx } from 'clsx'

export function SyncSettings() {
  const {
    enabled,
    inProgress,
    pendingChanges,
    lastSync,
    lastError,
    status,
    fetchStatus,
    manualSync,
    enableSync,
    disableSync
  } = useSyncStore()

  const [showConflicts, setShowConflicts] = useState(false)
  const [conflicts, setConflicts] = useState<any[]>([])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const formatLastSync = () => {
    if (!lastSync) return 'Never synced'
    const date = new Date(lastSync)
    return date.toLocaleString('ar-SA')
  }

  const handleToggleSync = async () => {
    if (enabled) {
      await disableSync()
    } else {
      await enableSync()
    }
    await fetchStatus()
  }

  const handleManualSync = async () => {
    await manualSync()
    await fetchStatus()
  }

  const handleViewConflicts = async () => {
    try {
      const result = await window.api.sync.getConflicts(20)
      if (result.success) {
        setConflicts(result.data)
        setShowConflicts(true)
      }
    } catch (error) {
      console.error('Failed to fetch conflicts:', error)
    }
  }

  return (
    <Card className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cloud Sync Settings
          </h3>
        </div>
        <div
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
            enabled
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          )}
        >
          {enabled ? <CheckCircle className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
          {enabled ? 'Enabled' : 'Disabled'}
        </div>
      </div>

      {/* Sync Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Automatic Synchronization
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Automatically sync your data to the cloud every 30 seconds
            </p>
          </div>
          <Switch
            checked={enabled}
            onChange={handleToggleSync}
            className={clsx(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            )}
          >
            <span
              className={clsx(
                'inline-block h-4 w-4 transform rounded-full bg-white transition',
                enabled ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </Switch>
        </div>
      </div>

      {/* Sync Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Sync Status</h4>
        <div className="space-y-3">
          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {inProgress || status === 'syncing' ? (
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              ) : status === 'error' ? (
                <XCircle className="w-4 h-4 text-red-600" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-600" />
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {inProgress || status === 'syncing'
                  ? 'Syncing...'
                  : status === 'error'
                  ? 'Sync failed'
                  : 'Up to date'}
              </span>
            </div>
            <span
              className={clsx(
                'text-xs px-2 py-1 rounded-full',
                pendingChanges > 0
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              )}
            >
              {pendingChanges} pending
            </span>
          </div>

          {/* Last Sync */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Last sync</span>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">{formatLastSync()}</span>
          </div>

          {/* Error */}
          {lastError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">Sync Error</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 break-words">{lastError}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Sync */}
      <button
        onClick={handleManualSync}
        disabled={inProgress || !enabled}
        className={clsx(
          'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors',
          enabled && !inProgress
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800'
        )}
      >
        <RefreshCw className={clsx('w-4 h-4', inProgress && 'animate-spin')} />
        {inProgress ? 'Syncing...' : 'Sync Now'}
      </button>

      {/* Conflicts Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <button
          onClick={handleViewConflicts}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Conflicts Log</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              View recent data conflicts
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300">
              About Cloud Sync
            </h4>
            <ul className="text-xs text-blue-700 dark:text-blue-400 mt-2 space-y-1">
              <li>• Your data is automatically backed up to the cloud</li>
              <li>• Sync works offline - changes queue until connection is restored</li>
              <li>• Each factory has complete data isolation</li>
              <li>• Conflicts are resolved automatically (last-write-wins)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Conflicts Modal */}
      {showConflicts && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowConflicts(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Conflicts
                </h3>
                <button
                  onClick={() => setShowConflicts(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {conflicts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No conflicts found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conflicts.map((conflict) => (
                    <div
                      key={conflict.id}
                      className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {conflict.table_name} #{conflict.record_id}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {new Date(conflict.created_at).toLocaleString('ar-SA')}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                          {conflict.resolution || 'auto-resolved'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowConflicts(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
