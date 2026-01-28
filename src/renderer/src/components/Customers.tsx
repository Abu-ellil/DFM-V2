import { useEffect, useState } from 'react'
import { useCustomerStore } from '../store/useCustomerStore'
import { useCustomerAccountStore } from '../store/useCustomerAccountStore'
import { Card } from './ui/Card'
import { Table } from './ui/Table'
import Search from 'lucide-react/dist/esm/icons/search'
import UserPlus from 'lucide-react/dist/esm/icons/user-plus'
import Eye from 'lucide-react/dist/esm/icons/eye'
import Pencil from 'lucide-react/dist/esm/icons/pencil'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import Wallet from 'lucide-react/dist/esm/icons/wallet'
import Package from 'lucide-react/dist/esm/icons/package'
import { toast } from 'react-toastify'
import { formatCurrency } from '../utils/format'

interface Customer {
  id: number
  name: string
  type: string
  phone: string
  created_at: string
}

interface CustomersProps {
  onViewCustomer?: (id: number) => void
}

export default function Customers({ onViewCustomer }: CustomersProps) {
  const { customers, fetchCustomers, addCustomer, updateCustomer, deleteCustomer, isLoading } =
    useCustomerStore()
  const { summaries, fetchAllSummaries, isLoading: summariesLoading } = useCustomerAccountStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [newCustomer, setNewCustomer] = useState({ name: '', type: 'مورد', phone: '' })

  useEffect(() => {
    fetchCustomers()
    fetchAllSummaries()
  }, [])

  // Listen for real-time account updates
  useEffect(() => {
    const handleAccountUpdate = () => {
      fetchAllSummaries()
    }

    window.api?.on?.('customerAccounts:updated', handleAccountUpdate)
    window.api?.on?.('customerAccounts:bulkUpdate', handleAccountUpdate)

    return () => {
      window.api?.removeListener?.('customerAccounts:updated', handleAccountUpdate)
      window.api?.removeListener?.('customerAccounts:bulkUpdate', handleAccountUpdate)
    }
  }, [])

  // Create a map of customer_id -> account summary for quick lookup
  const summaryMap = summaries.reduce((acc, summary) => {
    acc[summary.customer_id] = summary
    return acc
  }, {} as Record<number, any>)

  const filteredCustomers = customers.filter(
    (c) => c.name.includes(searchTerm) || (c.phone && c.phone.includes(searchTerm))
  )

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustomer.name) {
      toast.error('يرجى إدخال اسم العميل')
      return
    }

    const result = await addCustomer(newCustomer)
    if (result.success) {
      toast.success('تم إضافة العميل بنجاح')
      setIsModalOpen(false)
      setNewCustomer({ name: '', type: 'مورد', phone: '' })
      fetchAllSummaries() // Refresh summaries to include new customer
    } else {
      toast.error(result.message || 'حدث خطأ ما')
    }
  }

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCustomer || !editingCustomer.name) {
      toast.error('يرجى إدخال اسم العميل')
      return
    }

    const result = await updateCustomer(editingCustomer.id, {
      name: editingCustomer.name,
      type: editingCustomer.type,
      phone: editingCustomer.phone
    })
    if (result.success) {
      toast.success('تم تعديل العميل بنجاح')
      setIsEditModalOpen(false)
      setEditingCustomer(null)
    } else {
      toast.error(result.message || 'حدث خطأ ما')
    }
  }

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) {
      return
    }

    const result = await deleteCustomer(id)
    if (result.success) {
      toast.success('تم حذف العميل بنجاح')
    } else {
      toast.error(result.message || 'حدث خطأ ما')
    }
  }

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer)
    setIsEditModalOpen(true)
  }

  const columns = [
    {
      header: 'الاسم',
      accessor: (c: any) => (
        <button
          onClick={() => onViewCustomer?.(c.id)}
          className="text-emerald-600 hover:underline font-medium text-right"
        >
          {c.name}
        </button>
      )
    },
    { header: 'النوع', accessor: 'type' as const },
    { header: 'الهاتف', accessor: 'phone' as const },
    {
      header: 'الرصيد المالي',
      accessor: (c: any) => {
        const summary = summaryMap[c.id]
        const balance = summary?.net_balance || 0
        const isPositive = balance >= 0
        return (
          <div className="flex items-center gap-1">
            <Wallet size={14} />
            <span
              className={`font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}
              dir="ltr"
            >
              {formatCurrency(Math.abs(balance))}
            </span>
          </div>
        )
      }
    },
    {
      header: 'الصناديق',
      accessor: (c: any) => {
        const summary = summaryMap[c.id]
        const crateBalance = summary?.crate_balance || 0
        return (
          <div className="flex items-center gap-1">
            <Package size={14} />
            <span className={`font-bold ${crateBalance > 0 ? 'text-orange-600' : 'text-slate-500'}`}>
              {crateBalance > 0 ? `${crateBalance} صندوق` : '-'}
            </span>
          </div>
        )
      }
    },
    {
      header: 'إجراءات',
      accessor: (c: any) => (
        <div className="flex gap-2 items-center">
          <button
            onClick={() => onViewCustomer?.(c.id)}
            className="text-emerald-600 hover:text-emerald-700 p-1 flex items-center gap-1 font-bold text-sm"
          >
            <Eye size={16} />
            التفاصيل
          </button>
          <button
            onClick={() => openEditModal(c)}
            className="text-blue-600 hover:text-blue-700 p-1 flex items-center gap-1 font-bold text-sm"
          >
            <Pencil size={16} />
            تعديل
          </button>
          <button
            onClick={() => handleDeleteCustomer(c.id)}
            className="text-red-600 hover:text-red-700 p-1 flex items-center gap-1 font-bold text-sm"
          >
            <Trash2 size={16} />
            حذف
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">إدارة العملاء</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <UserPlus size={20} />
          إضافة عميل جديد
        </button>
      </div>

      <Card>
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="بحث عن عميل..."
              className="w-full pr-10 pl-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading || summariesLoading ? (
          <div className="text-center py-10">جاري التحميل...</div>
        ) : (
          <Table columns={columns} data={filteredCustomers} />
        )}
      </Card>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">إضافة عميل جديد</h3>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">الاسم</label>
                <input
                  type="text"
                  className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-700"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">النوع</label>
                <select
                  className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-700"
                  value={newCustomer.type}
                  onChange={(e) => setNewCustomer({ ...newCustomer, type: e.target.value })}
                >
                  <option value="مورد">مورد</option>
                  <option value="تاجر">تاجر</option>
                  <option value="مصنع">مصنع</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الهاتف</label>
                <input
                  type="text"
                  className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-700"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-emerald-600 text-white py-2 rounded-lg">
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-200 dark:bg-slate-700 py-2 rounded-lg"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {isEditModalOpen && editingCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">تعديل بيانات العميل</h3>
            <form onSubmit={handleEditCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">الاسم</label>
                <input
                  type="text"
                  className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-700"
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">النوع</label>
                <select
                  className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-700"
                  value={editingCustomer.type}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, type: e.target.value })}
                >
                  <option value="مورد">مورد</option>
                  <option value="تاجر">تاجر</option>
                  <option value="مصنع">مصنع</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الهاتف</label>
                <input
                  type="text"
                  className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-700"
                  value={editingCustomer.phone}
                  onChange={(e) =>
                    setEditingCustomer({ ...editingCustomer, phone: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg">
                  تحديث
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false)
                    setEditingCustomer(null)
                  }}
                  className="flex-1 bg-slate-200 dark:bg-slate-700 py-2 rounded-lg"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
