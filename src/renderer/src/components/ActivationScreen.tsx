import React, { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import Shield from 'lucide-react/dist/esm/icons/shield'
import Key from 'lucide-react/dist/esm/icons/key'
import Copy from 'lucide-react/dist/esm/icons/copy'
import ExternalLink from 'lucide-react/dist/esm/icons/external-link'
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2'
import Clock from 'lucide-react/dist/esm/icons/clock'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'

interface ActivationScreenProps {
  onActivationSuccess: () => void
}

export const ActivationScreen: React.FC<ActivationScreenProps> = ({ onActivationSuccess }) => {
  const [licenseKey, setLicenseKey] = useState('')
  const [machineId, setMachineId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingLicense, setIsCheckingLicense] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadMachineId()
  }, [])

  const loadMachineId = async () => {
    try {
      console.log('ActivationScreen: Loading machine ID...')
      const result = await window.api.license.getMachineId()
      console.log('ActivationScreen: Machine ID result:', result)
      if (result.success) {
        setMachineId(result.machineId)
      } else {
        toast.error('فشل في الحصول على معرف الجهاز')
      }
    } catch (error) {
      console.error('ActivationScreen: Error loading machine ID:', error)
      toast.error('حدث خطأ أثناء تحميل معرف الجهاز')
    } finally {
      setIsCheckingLicense(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('تم نسخ معرف الجهاز')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!licenseKey.trim()) {
      toast.error('يرجى إدخال مفتاح التفعيل')
      return
    }

    setIsLoading(true)
    try {
      const result = await window.api.license.activate({
        licenseKey: licenseKey.trim().toUpperCase()
      })
      if (result.success) {
        toast.success('تم تفعيل الترخيص بنجاح')
        onActivationSuccess()
      } else {
        toast.error(result.message || 'فشل في تفعيل الترخيص')
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تفعيل الترخيص')
    } finally {
      setIsLoading(false)
    }
  }

  const openTrialRequest = () => {
    window.api.license.openTrialRequest()
  }

  if (isCheckingLicense) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">جاري التحقق من الترخيص...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center mb-6">
          <div className="mx-auto h-20 w-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg">
            <Shield size={40} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">تفعيل التطبيق</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">مدير مصنع التمور - الإصدار الثاني</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  معرف جهازك (Machine ID)
                </h3>
                <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                  استخدم هذا المعرف لطلب مفتاح التفعيل
                </p>
                <div className="flex items-center gap-2 min-w-0">
                  <code className="flex-1 text-sm font-mono bg-blue-100 dark:bg-blue-900/40 px-3 py-2 rounded-lg text-blue-900 dark:text-blue-100 select-all break-all overflow-hidden">
                    {machineId || 'جاري التحميل...'}
                  </code>
                  <button
                    onClick={() => copyToClipboard(machineId)}
                    className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                    title="نسخ المعرف"
                  >
                    {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                مفتاح التفعيل
              </label>
              <input
                type="text"
                required
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-center font-mono text-lg tracking-wider"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                أدخل المفتاح الذي حصلت عليه من موقع التطبيق أو من المطور
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  جاري التفعيل...
                </span>
              ) : (
                'تفعيل التطبيق'
              )}
            </button>
          </form>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <button
              onClick={openTrialRequest}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <Clock className="w-5 h-5" />
                طلب ترخيص تجريبي مجاني (4 أيام)
              </span>
            </button>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
              تجربة مجانية بدون دفع - جهاز واحد فقط
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <ExternalLink className="w-4 h-4" />
            <button
              onClick={openTrialRequest}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              فتح موقع طلب الترخيص
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          <p className="mb-2">للمساعدة والدعم الفني، تواصل معنا عبر الموقع الرسمي</p>
          <a
            href="https://wa.me/201221089249"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors font-bold"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            تواصل مع المطور عبر واتساب
          </a>
        </div>
      </div>
    </div>
  )
}
