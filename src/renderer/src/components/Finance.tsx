import { useEffect, useState } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useCustomerStore } from '../store/useCustomerStore'
import { Card } from './ui/Card'
import { Table } from './ui/Table'
import {
  Wallet,
  Search,
  History,
  PieChart,
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  Edit2,
  Trash2
} from 'lucide-react'
import { toast } from 'react-toastify'
import { formatCurrency } from '../utils/format'

export default function Finance() {
  const {
    transactions,
    summary,
    fetchFinance,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    isLoading
  } = useFinanceStore()
  const { customers, fetchCustomers } = useCustomerStore()
  const [activeView, setActiveView] = useState<'summary' | 'history'>('summary')
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any>(null)
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    customer_id: '',
    transaction_type: 'مقبوض',
    amount_paid: 0,
    amount_received: 0,
    notes: ''
  })

  useEffect(() => {
    fetchFinance()
    fetchCustomers()
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
        transaction_type: 'مقبوض',
        amount_paid: 0,
        amount_received: 0,
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
    if (confirm('هل أنت متأكد من حذف هذه العملية المالية؟')) {
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
    { header: 'العميل', accessor: 'customer_name' as const },
    {
      header: 'إجمالي المقبوض',
      accessor: (s: any) => formatCurrency(s.total_received),
      className: 'text-emerald-500 font-bold'
    },
    {
      header: 'إجمالي المدفوع',
      accessor: (s: any) => formatCurrency(s.total_paid),
      className: 'text-red-500 font-bold'
    },
    {
      header: 'الرصيد',
      accessor: (s: any) => (
        <span className={`font-bold ${s.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {formatCurrency(s.balance)}
        </span>
      )
    }
  ]

  const historyColumns = [
    { header: 'التاريخ', accessor: (t: any) => new Date(t.date).toLocaleDateString('ar-EG') },
    { header: 'العميل', accessor: 'customer_name' as const },
    { header: 'النوع', accessor: 'transaction_type' as const },
    {
      header: 'مقبوض',
      accessor: (t: any) => (t.amount_received > 0 ? formatCurrency(t.amount_received) : '-'),
      className: 'text-emerald-500 font-bold'
    },
    {
      header: 'مدفوع',
      accessor: (t: any) => (t.amount_paid > 0 ? formatCurrency(t.amount_paid) : '-'),
      className: 'text-red-500 font-bold'
    },
    { header: 'ملاحظات', accessor: 'notes' as const },
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
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">الإدارة المالية</h2>
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
            كشف حساب
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
            سجل العمليات
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold mb-1">
                إجمالي المقبوضات
              </p>
              <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                {formatCurrency(summary.reduce((acc, curr) => acc + curr.total_received, 0))}
              </h3>
            </div>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg text-emerald-600">
              <TrendingUp size={24} />
            </div>
          </div>
        </Card>

        <Card className="bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-red-600 dark:text-red-400 text-sm font-bold mb-1">
                إجمالي المدفوعات
              </p>
              <h3 className="text-2xl font-black text-red-700 dark:text-red-300">
                {formatCurrency(summary.reduce((acc, curr) => acc + curr.total_paid, 0))}
              </h3>
            </div>
            <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg text-red-600">
              <TrendingDown size={24} />
            </div>
          </div>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-600 dark:text-blue-400 text-sm font-bold mb-1">صافي الرصيد</p>
              <h3 className="text-2xl font-black text-blue-700 dark:text-blue-300">
                {formatCurrency(summary.reduce((acc, curr) => acc + curr.balance, 0))}
              </h3>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600">
              <Wallet size={24} />
            </div>
          </div>
        </Card>
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
              <h3 className="text-xl font-bold">إضافة عملية مالية جديدة</h3>
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
                <label className="block text-sm font-bold text-slate-600 mb-1">نوع العملية</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      checked={newTransaction.transaction_type === 'مقبوض'}
                      onChange={() =>
                        setNewTransaction({
                          ...newTransaction,
                          transaction_type: 'مقبوض',
                          amount_paid: 0
                        })
                      }
                    />
                    <span className="text-sm font-bold text-emerald-600">مقبوض (إيراد)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      checked={newTransaction.transaction_type === 'مدفوع'}
                      onChange={() =>
                        setNewTransaction({
                          ...newTransaction,
                          transaction_type: 'مدفوع',
                          amount_received: 0
                        })
                      }
                    />
                    <span className="text-sm font-bold text-red-600">مدفوع (مصروف)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">المبلغ</label>
                <input
                  type="number"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xl font-bold"
                  value={
                    newTransaction.transaction_type === 'مقبوض'
                      ? newTransaction.amount_received
                      : newTransaction.amount_paid
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    if (newTransaction.transaction_type === 'مقبوض') {
                      setNewTransaction({ ...newTransaction, amount_received: val })
                    } else {
                      setNewTransaction({ ...newTransaction, amount_paid: val })
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">ملاحظات</label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 h-24"
                  value={newTransaction.notes}
                  onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                <Wallet size={20} />
                حفظ العملية المالية
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
              <h3 className="text-xl font-bold">تعديل عملية مالية</h3>
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
                <label className="block text-sm font-bold text-slate-600 mb-1">نوع العملية</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit-type"
                      checked={editingTransaction.transaction_type === 'مقبوض'}
                      onChange={() =>
                        setEditingTransaction({
                          ...editingTransaction,
                          transaction_type: 'مقبوض',
                          amount_paid: 0
                        })
                      }
                    />
                    <span className="text-sm font-bold text-emerald-600">مقبوض (إيراد)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit-type"
                      checked={editingTransaction.transaction_type === 'مدفوع'}
                      onChange={() =>
                        setEditingTransaction({
                          ...editingTransaction,
                          transaction_type: 'مدفوع',
                          amount_received: 0
                        })
                      }
                    />
                    <span className="text-sm font-bold text-red-600">مدفوع (مصروف)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">المبلغ</label>
                <input
                  type="number"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xl font-bold"
                  value={
                    editingTransaction.transaction_type === 'مقبوض'
                      ? editingTransaction.amount_received
                      : editingTransaction.amount_paid
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    if (editingTransaction.transaction_type === 'مقبوض') {
                      setEditingTransaction({ ...editingTransaction, amount_received: val })
                    } else {
                      setEditingTransaction({ ...editingTransaction, amount_paid: val })
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">ملاحظات</label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 h-24"
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
                تحديث العملية المالية
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
