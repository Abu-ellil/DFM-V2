import { useEffect, useState } from 'react'
import { useCrateStore } from '../store/useCrateStore'
import { useCustomerStore } from '../store/useCustomerStore'
import { useAppStore } from '../store/useAppStore'
import { Card } from './ui/Card'
import { Table } from './ui/Table'
import Search from 'lucide-react/dist/esm/icons/search'
import History from 'lucide-react/dist/esm/icons/history'
import PieChart from 'lucide-react/dist/esm/icons/pie-chart'
import Plus from 'lucide-react/dist/esm/icons/plus'
import X from 'lucide-react/dist/esm/icons/x'
import Edit2 from 'lucide-react/dist/esm/icons/edit-2'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import { toast } from 'react-toastify'
import { formatNumber } from '../utils/format'

export default function Crates() {
  const {
    transactions,
    summary,
    fetchCrates,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    isLoading
  } = useCrateStore()
  const { customers, fetchCustomers } = useCustomerStore()
  const { navigateToCustomer } = useAppStore()
  const [activeView, setActiveView] = useState<'summary' | 'history'>('summary')
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any>(null)
  const [crateTypes, setCrateTypes] = useState<any[]>([])
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    customer_id: '',
    crate_type_id: '',
    crates_out: 0,
    crates_returned: 0,
    handler: '',
    notes: ''
  })

  useEffect(() => {
    fetchCrates()
    fetchCustomers()
    window.api.crateTypes.getAll().then(setCrateTypes)
  }, [])

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTransaction.customer_id) {
      toast.error('يرجى اختيار العميل')
      return
    }

    const result = await addTransaction(newTransaction)
    if (result.success) {
      toast.success('تم إضافة العملية بنجاح')
      setIsModalOpen(false)
      setNewTransaction({
        date: new Date().toISOString().split('T')[0],
        customer_id: '',
        crate_type_id: '',
        crates_out: 0,
        crates_returned: 0,
        handler: '',
        notes: ''
      })
    } else {
      toast.error(result.message || 'حدث خطأ ما')
    }
  }

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await updateTransaction(editingTransaction.id, editingTransaction)
    if (result.success) {
      toast.success('تم تحديث العملية بنجاح')
      setIsEditModalOpen(false)
      setEditingTransaction(null)
    } else {
      toast.error(result.message || 'حدث خطأ ما')
    }
  }

  const handleDeleteTransaction = async (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذه العملية؟')) {
      const result = await deleteTransaction(id)
      if (result.success) {
        toast.success('تم حذف العملية بنجاح')
      } else {
        toast.error(result.message || 'حدث خطأ ما')
      }
    }
  }

  const filteredSummary = summary.filter((s) => s.customer_name.includes(searchTerm))
  const filteredHistory = transactions.filter((t) => t.customer_name.includes(searchTerm))

  const summaryColumns = [
    {
      header: 'العميل',
      accessor: (s: any) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigateToCustomer(s.customer_id)
          }}
          className="text-emerald-600 hover:underline font-medium text-right"
        >
          {s.customer_name}
        </button>
      )
    },
    { header: 'إجمالي الخارج', accessor: (s: any) => formatNumber(s.total_out) },
    { header: 'إجمالي العائد', accessor: (s: any) => formatNumber(s.total_returned) },
    {
      header: 'الرصيد المتبقي',
      accessor: (s: any) => (
        <span
          className={`font-bold ${
            s.total_out - s.total_returned > 0 ? 'text-rose-600' : 'text-emerald-600'
          }`}
        >
          {formatNumber(s.total_out - s.total_returned)}
        </span>
      )
    }
  ]

  const historyColumns = [
    { header: 'التاريخ', accessor: (t: any) => new Date(t.date).toLocaleDateString('ar-EG') },
    {
      header: 'العميل',
      accessor: (t: any) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigateToCustomer(t.customer_id)
          }}
          className="text-emerald-600 hover:underline font-medium text-right"
        >
          {t.customer_name}
        </button>
      )
    },
    { header: 'النوع', accessor: 'crate_type_name' as const },
    {
      header: 'خارج',
      accessor: (t: any) => formatNumber(t.crates_out),
      className: 'text-red-500 font-bold'
    },
    {
      header: 'عائد',
      accessor: (t: any) => formatNumber(t.crates_returned),
      className: 'text-emerald-500 font-bold'
    },
    { header: 'المستلم', accessor: 'handler' as const },
    {
      header: 'إجراءات',
      accessor: (t: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditingTransaction(t)
              setIsEditModalOpen(true)
            }}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDeleteTransaction(t.id)}
            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">إدارة الصناديق</h2>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveView('summary')}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
              activeView === 'summary'
                ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600'
                : 'text-slate-500'
            }`}
          >
            <PieChart size={18} />
            الملخص
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
              activeView === 'history'
                ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600'
                : 'text-slate-500'
            }`}
          >
            <History size={18} />
            السجل
          </button>
        </div>
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
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 font-bold"
          >
            <Plus size={20} />
            إضافة عملية
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-10">جاري التحميل...</div>
        ) : (
          <Table
            columns={activeView === 'summary' ? summaryColumns : historyColumns}
            data={activeView === 'summary' ? filteredSummary : filteredHistory}
          />
        )}
      </Card>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">إضافة عملية صناديق جديدة</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">التاريخ</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">العميل</label>
                  <select
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                    value={newTransaction.customer_id}
                    onChange={(e) =>
                      setNewTransaction({ ...newTransaction, customer_id: e.target.value })
                    }
                  >
                    <option value="">اختر العميل</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">نوع الصندوق</label>
                <select
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                  value={newTransaction.crate_type_id}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, crate_type_id: e.target.value })
                  }
                >
                  <option value="">اختر نوع الصندوق</option>
                  {crateTypes.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">
                    صناديق خارجة
                  </label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                    value={newTransaction.crates_out}
                    onChange={(e) =>
                      setNewTransaction({
                        ...newTransaction,
                        crates_out: parseInt(e.target.value) || 0
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">
                    صناديق عائدة
                  </label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                    value={newTransaction.crates_returned}
                    onChange={(e) =>
                      setNewTransaction({
                        ...newTransaction,
                        crates_returned: parseInt(e.target.value) || 0
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">المستلم</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                  value={newTransaction.handler}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, handler: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">ملاحظات</label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 h-20"
                  value={newTransaction.notes}
                  onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
              >
                حفظ العملية
              </button>
            </form>
          </Card>
        </div>
      )}
      {/* Edit Transaction Modal */}
      {isEditModalOpen && editingTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">تعديل عملية صناديق</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">التاريخ</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                    value={editingTransaction.date}
                    onChange={(e) =>
                      setEditingTransaction({ ...editingTransaction, date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">العميل</label>
                  <select
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                    value={editingTransaction.customer_id}
                    onChange={(e) =>
                      setEditingTransaction({ ...editingTransaction, customer_id: e.target.value })
                    }
                  >
                    <option value="">اختر العميل</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">نوع الصندوق</label>
                <select
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                  value={editingTransaction.crate_type_id}
                  onChange={(e) =>
                    setEditingTransaction({ ...editingTransaction, crate_type_id: e.target.value })
                  }
                >
                  <option value="">اختر نوع الصندوق</option>
                  {crateTypes.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">
                    صناديق خارجة
                  </label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                    value={editingTransaction.crates_out}
                    onChange={(e) =>
                      setEditingTransaction({
                        ...editingTransaction,
                        crates_out: parseInt(e.target.value) || 0
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">
                    صناديق عائدة
                  </label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                    value={editingTransaction.crates_returned}
                    onChange={(e) =>
                      setEditingTransaction({
                        ...editingTransaction,
                        crates_returned: parseInt(e.target.value) || 0
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">المستلم</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                  value={editingTransaction.handler}
                  onChange={(e) =>
                    setEditingTransaction({ ...editingTransaction, handler: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">ملاحظات</label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 h-20"
                  value={editingTransaction.notes}
                  onChange={(e) =>
                    setEditingTransaction({ ...editingTransaction, notes: e.target.value })
                  }
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                تحديث العملية
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
