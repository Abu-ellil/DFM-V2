import { useEffect, useState } from 'react'
import { Card } from './ui/Card'
import UserCheck from 'lucide-react/dist/esm/icons/user-check'
import UserX from 'lucide-react/dist/esm/icons/user-x'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import Clock from 'lucide-react/dist/esm/icons/clock'
import FileText from 'lucide-react/dist/esm/icons/file-text'
import { toast } from 'react-toastify'

interface RegistrationRequest {
  id: number
  telegram_id: number
  requested_role?: string
  full_name?: string
  phone?: string
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  reviewed_at?: string
}

export default function TelegramRegistrations() {
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [processing, setProcessing] = useState<number | null>(null)
  const [rejectionReasons, setRejectionReasons] = useState<Record<number, string>>({})
  const [showRejectionInput, setShowRejectionInput] = useState<number | null>(null)

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    fetchRegistrations()
  }, [filter])

  const fetchRegistrations = async () => {
    try {
      setLoading(true)
      const result = await window.api.telegram.getRegistrations({
        status: filter === 'all' ? undefined : filter
      })
      if (result.success) {
        setRegistrations(result.data || [])
      } else {
        toast.error(result.message || 'فشل جلب طلبات التسجيل')
      }
    } catch (error) {
      console.error('Fetch registrations error:', error)
      toast.error('حدث خطأ أثناء جلب الطلبات')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (registrationId: number, requestedRole?: string) => {
    const role = requestedRole || 'worker'
    try {
      setProcessing(registrationId)
      const result = await window.api.telegram.approveRegistration(
        registrationId,
        role,
        currentUser.id || 1
      )
      if (result.success) {
        toast.success('تم قبول طلب التسجيل بنجاح')
        fetchRegistrations()
      } else {
        toast.error(result.message || 'فشل قبول الطلب')
      }
    } catch (error) {
      console.error('Approve registration error:', error)
      toast.error('حدث خطأ أثناء قبول الطلب')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (registrationId: number) => {
    const reason = rejectionReasons[registrationId]
    try {
      setProcessing(registrationId)
      const result = await window.api.telegram.rejectRegistration(
        registrationId,
        reason,
        currentUser.id || 1
      )
      if (result.success) {
        toast.success('تم رفض طلب التسجيل')
        fetchRegistrations()
        setShowRejectionInput(null)
        setRejectionReasons((prev) => {
          const newReasons = { ...prev }
          delete newReasons[registrationId]
          return newReasons
        })
      } else {
        toast.error(result.message || 'فشل رفض الطلب')
      }
    } catch (error) {
      console.error('Reject registration error:', error)
      toast.error('حدث خطأ أثناء رفض الطلب')
    } finally {
      setProcessing(null)
    }
  }

  const getRoleBadge = (role?: string) => {
    if (!role) return null
    const badges = {
      owner: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      worker: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
    }
    const names: Record<string, string> = {
      owner: 'مالك',
      manager: 'مدير',
      worker: 'عامل'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${badges[role as keyof typeof badges] || badges.worker}`}>
        {names[role] || role}
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
    }
    const names: Record<string, string> = {
      pending: 'قيد المراجعة',
      approved: 'مقبول',
      rejected: 'مرفوض'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${badges[status as keyof typeof badges]}`}>
        {names[status] || status}
      </span>
    )
  }

  const stats = {
    pending: registrations.filter((r) => r.status === 'pending').length,
    approved: registrations.filter((r) => r.status === 'approved').length,
    rejected: registrations.filter((r) => r.status === 'rejected').length
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <FileText className="text-blue-600" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">طلبات التسجيل</h2>
            <p className="text-sm text-slate-500">إدارة طلبات تسجيل المستخدمين الجدد</p>
          </div>
        </div>
        <button
          onClick={fetchRegistrations}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-slate-500">قيد المراجعة</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-emerald-600">{stats.approved}</div>
          <div className="text-sm text-slate-500">مقبول</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-sm text-slate-500">مرفوض</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            قيد المراجعة ({stats.pending})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              filter === 'approved'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            مقبول ({stats.approved})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              filter === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            مرفوض ({stats.rejected})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              filter === 'all'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            الكل
          </button>
        </div>
      </Card>

      {/* Registrations List */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="mx-auto animate-spin text-blue-600 mb-4" />
          <p className="text-slate-500">جاري تحميل الطلبات...</p>
        </Card>
      ) : registrations.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">لا توجد طلبات تسجيل</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {registrations.map((reg) => (
            <Card key={reg.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">{reg.full_name}</h3>
                    {getRoleBadge(reg.requested_role)}
                    {getStatusBadge(reg.status)}
                  </div>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    {reg.phone && <div>📱 {reg.phone}</div>}
                    <div>معرف تيليجرام: {reg.telegram_id}</div>
                    {reg.reason && (
                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                        <div className="font-bold mb-1">سبب التسجيل:</div>
                        <div>{reg.reason}</div>
                      </div>
                    )}
                    <div className="text-xs">
                      <Clock size={12} className="inline ml-1" />
                      تاريخ الطلب: {new Date(reg.requested_at).toLocaleDateString('ar-SA')}
                    </div>
                    {reg.reviewed_at && (
                      <div className="text-xs">
                        تاريخ المراجعة: {new Date(reg.reviewed_at).toLocaleDateString('ar-SA')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {reg.status === 'pending' && (
                  <div className="flex flex-col gap-2">
                    {showRejectionInput === reg.id ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <textarea
                          placeholder="سبب الرفض (اختياري)"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                          value={rejectionReasons[reg.id] || ''}
                          onChange={(e) =>
                            setRejectionReasons((prev) => ({ ...prev, [reg.id]: e.target.value }))
                          }
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReject(reg.id)}
                            disabled={processing === reg.id}
                            className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            <UserX size={16} />
                            {processing === reg.id ? 'جاري...' : 'تأكيد الرفض'}
                          </button>
                          <button
                            onClick={() => {
                              setShowRejectionInput(null)
                              setRejectionReasons((prev) => {
                                const newReasons = { ...prev }
                                delete newReasons[reg.id]
                                return newReasons
                              })
                            }}
                            className="px-3 py-2 rounded-lg text-sm font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprove(reg.id, reg.requested_role)}
                          disabled={processing === reg.id}
                          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          <UserCheck size={16} />
                          {processing === reg.id ? 'جاري...' : 'قبول'}
                        </button>
                        <button
                          onClick={() => setShowRejectionInput(reg.id)}
                          disabled={processing === reg.id}
                          className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          <UserX size={16} />
                          رفض
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
