import { useEffect, useState } from 'react'
import { Card } from './ui/Card'
import Users from 'lucide-react/dist/esm/icons/users'
import Shield from 'lucide-react/dist/esm/icons/shield'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import { toast } from 'react-toastify'

interface TelegramUser {
  id: number
  telegram_id: number
  username?: string
  first_name?: string
  last_name?: string
  phone?: string
  status: string
  role?: string
  registration_date: string
  last_interaction: string
}

export default function TelegramUsers() {
  const [users, setUsers] = useState<TelegramUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all')

  useEffect(() => {
    fetchUsers()
  }, [filter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const result = await window.api.telegram.getUsers({
        status: filter === 'all' ? undefined : filter
      })
      if (result.success) {
        setUsers(result.data || [])
      } else {
        toast.error(result.message || 'فشل جلب المستخدمين')
      }
    } catch (error) {
      console.error('Fetch users error:', error)
      toast.error('حدث خطأ أثناء جلب المستخدمين')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (telegramId: number, status: string) => {
    try {
      const result = await window.api.telegram.updateUser(telegramId, { status })
      if (result.success) {
        toast.success('تم تحديث حالة المستخدم')
        fetchUsers()
      } else {
        toast.error(result.message || 'فشل تحديث الحالة')
      }
    } catch (error) {
      console.error('Update user error:', error)
      toast.error('حدث خطأ أثناء تحديث المستخدم')
    }
  }

  const handleDeleteUser = async (telegramId: number, userName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المستخدم "${userName}"؟`)) return

    try {
      const result = await window.api.telegram.deleteUser(telegramId)
      if (result.success) {
        toast.success('تم حذف المستخدم بنجاح')
        fetchUsers()
      } else {
        toast.error(result.message || 'فشل حذف المستخدم')
      }
    } catch (error) {
      console.error('Delete user error:', error)
      toast.error('حدث خطأ أثناء حذف المستخدم')
    }
  }

  const getRoleBadge = (role?: string) => {
    if (!role) return null
    const badges = {
      owner: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      worker: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
      admin: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
    }
    const names: Record<string, string> = {
      owner: 'مالك',
      manager: 'مدير',
      worker: 'عامل',
      admin: 'مشرف'
    }
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-bold ${badges[role as keyof typeof badges] || badges.worker}`}
      >
        {names[role] || role}
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      suspended: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      inactive: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    }
    const names: Record<string, string> = {
      active: 'نشط',
      pending: 'معلق',
      suspended: 'موقوف',
      inactive: 'غير نشط'
    }
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-bold ${badges[status as keyof typeof badges] || badges.inactive}`}
      >
        {names[status] || status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Users className="text-emerald-600" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">مستخدمو تيليجرام</h2>
            <p className="text-sm text-slate-500">إدارة المستخدمين المسجلين عبر البوت</p>
          </div>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          تحديث
        </button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              filter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            الكل ({users.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              filter === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            نشط
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              filter === 'pending'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            معلق
          </button>
          <button
            onClick={() => setFilter('suspended')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              filter === 'suspended'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            موقوف
          </button>
        </div>
      </Card>

      {/* Users List */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="mx-auto animate-spin text-emerald-600 mb-4" />
          <p className="text-slate-500">جاري تحميل المستخدمين...</p>
        </Card>
      ) : users.length === 0 ? (
        <Card className="p-8 text-center">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">لا يوجد مستخدمين</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                      {user.first_name} {user.last_name}
                    </h3>
                    {getRoleBadge(user.role)}
                    {getStatusBadge(user.status)}
                  </div>
                  <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                    {user.username && (
                      <div className="flex items-center gap-2">
                        <span className="font-mono">@{user.username}</span>
                      </div>
                    )}
                    {user.phone && <div>📱 {user.phone}</div>}
                    <div className="text-xs">معرف تيليجرام: {user.telegram_id}</div>
                    <div className="text-xs">
                      آخر تفاعل: {new Date(user.last_interaction).toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {user.status === 'pending' && (
                    <button
                      onClick={() => handleUpdateStatus(user.telegram_id, 'active')}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                      title="تفعيل"
                    >
                      <CheckCircle size={20} />
                    </button>
                  )}
                  {user.status === 'active' && (
                    <button
                      onClick={() => handleUpdateStatus(user.telegram_id, 'suspended')}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                      title="تعليق"
                    >
                      <Shield size={20} />
                    </button>
                  )}
                  {user.status === 'suspended' && (
                    <button
                      onClick={() => handleUpdateStatus(user.telegram_id, 'active')}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="إعادة تفعيل"
                    >
                      <RefreshCw size={20} />
                    </button>
                  )}
                  <button
                    onClick={() =>
                      handleDeleteUser(
                        user.telegram_id,
                        `${user.first_name || ''} ${user.last_name || ''}`
                      )
                    }
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
