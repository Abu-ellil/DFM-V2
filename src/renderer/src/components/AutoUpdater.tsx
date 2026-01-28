import { useEffect, useState } from 'react'
import Download from 'lucide-react/dist/esm/icons/download'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import X from 'lucide-react/dist/esm/icons/x'
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle'
import Info from 'lucide-react/dist/esm/icons/info'
import { toast } from 'react-toastify'

interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  releaseDate?: string
  percent?: number
  transferred?: number
  total?: number
  speed?: number
  message?: string
  restartNow?: boolean
}

export default function AutoUpdater() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [currentVersion, setCurrentVersion] = useState('')

  useEffect(() => {
    // Get current version
    window.api.autoUpdater.getVersion().then((info) => {
      setCurrentVersion(info.current)
    })

    // Listen for update events
    const unsubscribe = () => {
      if (window.api.removeListener) {
        window.api.removeListener('autoUpdater:event', () => {})
      }
    }

    if (window.api.on) {
      window.api.on('autoUpdater:event', (_event, data) => {
        console.log('Auto-updater event:', data)
        setUpdateStatus(data)

        // Show notification for important events
        if (data.status === 'available' || data.status === 'downloaded') {
          setIsVisible(true)
        }
      })
    }

    return unsubscribe
  }, [])

  const handleCheckForUpdates = async () => {
    setUpdateStatus({ status: 'checking', message: 'جاري التحقق من التحديثات...' })
    const result = await window.api.autoUpdater.check()
    if (!result.success) {
      toast.error(result.message || 'فشل التحقق من التحديثات')
      setUpdateStatus({ status: 'error', message: result.message })
    }
  }

  const handleDownloadUpdate = async () => {
    const result = await window.api.autoUpdater.download()
    if (!result.success) {
      toast.error(result.message || 'فشل تحميل التحديث')
    }
  }

  const handleInstallAndRestart = () => {
    window.api.autoUpdater.installAndRestart()
  }

  const handleDismiss = () => {
    setIsVisible(false)
  }

  // Don't render if no update status or not visible
  if (!updateStatus || !isVisible) {
    return null
  }

  // Render different UI based on status
  const renderContent = () => {
    switch (updateStatus.status) {
      case 'checking':
        return (
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
            <div>
              <p className="text-sm font-bold">{updateStatus.message}</p>
            </div>
          </div>
        )

      case 'available':
        return (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold">يتوفر تحديث جديد!</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  الإصدار الحالي: {currentVersion} → الإصدار الجديد: {updateStatus.version}
                </p>
                {updateStatus.releaseDate && (
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    تاريخ الإصدار: {new Date(updateStatus.releaseDate).toLocaleDateString('ar-SA')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadUpdate}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Download size={16} />
                تحميل التحديث
              </button>
              <button
                onClick={handleDismiss}
                className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors"
                title="إخفاء"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )

      case 'downloading':
        return (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0 animate-bounce" />
              <div className="flex-1">
                <p className="text-sm font-bold">{updateStatus.message}</p>
                {updateStatus.percent !== undefined && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                      <span>
                        {updateStatus.transferred} MB / {updateStatus.total} MB
                      </span>
                      <span>{updateStatus.speed} MB/s</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${updateStatus.percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 'downloaded':
        return (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold">تم تحميل التحديث!</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {updateStatus.message}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleInstallAndRestart}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw size={16} />
                إعادة التشغيل والتحديث
              </button>
              <button
                onClick={handleDismiss}
                className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors"
                title="إخفاء"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold">خطأ في التحديث</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {updateStatus.message}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCheckForUpdates}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw size={16} />
                إعادة المحاولة
              </button>
              <button
                onClick={handleDismiss}
                className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors"
                title="إخفاء"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4 animate-slide-up">
        {renderContent()}
      </div>
    </div>
  )
}
