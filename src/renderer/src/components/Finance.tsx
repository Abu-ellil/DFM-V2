import { useEffect, useState } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useCustomerStore } from '../store/useCustomerStore'
import { useAppStore } from '../store/useAppStore'
import { Card } from './ui/Card'
import { Table } from './ui/Table'
import Wallet from 'lucide-react/dist/esm/icons/wallet'
import Search from 'lucide-react/dist/esm/icons/search'
import History from 'lucide-react/dist/esm/icons/history'
import PieChart from 'lucide-react/dist/esm/icons/pie-chart'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down'
import Plus from 'lucide-react/dist/esm/icons/plus'
import X from 'lucide-react/dist/esm/icons/x'
import Edit2 from 'lucide-react/dist/esm/icons/edit-2'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import Receipt from 'lucide-react/dist/esm/icons/receipt'
import FileImage from 'lucide-react/dist/esm/icons/file-image'
import FileText from 'lucide-react/dist/esm/icons/file-text'
import { toast } from 'react-toastify'
import { formatCurrency } from '../utils/format'

type PaymentMethod = 'نقدا' | 'تحويل بنكي' | 'مصروفات ومشتريات'

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
  const { navigateToCustomer } = useAppStore()
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
    payment_method: 'نقدا' as PaymentMethod,
    receipt_file: '',
    receipt_reference: '',
    notes: ''
  })

  // State for receipt file handling in Add modal
  const [addReceiptFile, setAddReceiptFile] = useState<string | null>(null)
  const [addReceiptReference, setAddReceiptReference] = useState('')
  const [showAddReceiptPreview, setShowAddReceiptPreview] = useState(false)

  // State for receipt file handling in Edit modal
  const [editReceiptFile, setEditReceiptFile] = useState<string | null>(null)
  const [editReceiptReference, setEditReceiptReference] = useState('')
  const [showEditReceiptPreview, setShowEditReceiptPreview] = useState(false)

  useEffect(() => {
    fetchFinance()
    fetchCustomers()
  }, [])

  // Reset edit receipt states when edit modal closes
  useEffect(() => {
    if (!isEditModalOpen) {
      setEditReceiptFile(null)
      setEditReceiptReference('')
      setShowEditReceiptPreview(false)
    }
  }, [isEditModalOpen])

  // Handle receipt file upload for Add modal
  const handleAddReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
      if (!validTypes.includes(file.type)) {
        toast.error('يرجى اختيار ملف صورة أو PDF فقط')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('حجم الملف يجب أن يكون أقل من 5 ميجابايت')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setAddReceiptFile(base64String)
        setShowAddReceiptPreview(true)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle removing receipt for Add modal
  const handleRemoveAddReceipt = () => {
    setAddReceiptFile(null)
    setAddReceiptReference('')
    setShowAddReceiptPreview(false)
  }

  // Handle receipt file upload for Edit modal
  const handleEditReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
      if (!validTypes.includes(file.type)) {
        toast.error('يرجى اختيار ملف صورة أو PDF فقط')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('حجم الملف يجب أن يكون أقل من 5 ميجابايت')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setEditReceiptFile(base64String)
        setShowEditReceiptPreview(true)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle removing receipt for Edit modal
  const handleRemoveEditReceipt = () => {
    setEditReceiptFile(null)
    setEditReceiptReference('')
    setEditingTransaction({ ...editingTransaction, receipt_file: null })
    setShowEditReceiptPreview(false)
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTransaction.customer_id) {
      toast.error('يرجى اختيار العميل')
      return
    }

    const transactionToSubmit = {
      ...newTransaction,
      receipt_file: addReceiptFile || null,
      receipt_reference: addReceiptReference || null
    }

    const result = await addTransaction(transactionToSubmit)
    if (result.success) {
      toast.success('تم إضافة العملية بنجاح')
      setIsModalOpen(false)
      setNewTransaction({
        date: new Date().toISOString().split('T')[0],
        customer_id: '',
        transaction_type: 'مقبوض',
        amount_paid: 0,
        amount_received: 0,
        payment_method: 'نقدا' as PaymentMethod,
        receipt_file: '',
        receipt_reference: '',
        notes: ''
      })
      // Reset receipt states
      handleRemoveAddReceipt()
    } else {
      toast.error(result.message || 'حدث خطأ ما')
    }
  }

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    const transactionToUpdate = {
      ...editingTransaction,
      receipt_file: editReceiptFile || editingTransaction.receipt_file,
      receipt_reference: editReceiptReference || editingTransaction.receipt_reference
    }
    const result = await updateTransaction(editingTransaction.id, transactionToUpdate)
    if (result.success) {
      toast.success('تم تحديث العملية بنجاح')
      setIsEditModalOpen(false)
      setEditingTransaction(null)
      // Reset edit receipt states
      setEditReceiptFile(null)
      setEditReceiptReference('')
      setShowEditReceiptPreview(false)
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
    { header: 'النوع', accessor: 'transaction_type' as const },
    {
      header: 'طريقة الدفع',
      accessor: (t: any) => (
        <div className="flex items-center gap-1">
          <span>{t.payment_method || 'نقدا'}</span>
          {t.receipt_file && (
            <span title="يوجد إيصال">
              <Receipt size={16} className="text-blue-500" />
            </span>
          )}
        </div>
      )
    },
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
              // Ensure payment_method has a default value for backward compatibility
              const transactionWithDefaults = {
                ...t,
                payment_method: t.payment_method || 'نقدا',
                receipt_file: t.receipt_file || null,
                receipt_reference: t.receipt_reference || null
              }
              setEditingTransaction(transactionWithDefaults)
              setEditReceiptReference(transactionWithDefaults.receipt_reference || '')
              setShowEditReceiptPreview(!!transactionWithDefaults.receipt_file)
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30">
          <div className="flex justify-between items-center gap-4">
            <div className="min-w-0">
              <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold mb-1 truncate">
                إجمالي المقبوضات
              </p>
              <h3 className="text-xl lg:text-2xl font-black text-emerald-700 dark:text-emerald-300 break-all">
                {formatCurrency(summary.reduce((acc, curr) => acc + curr.total_received, 0))}
              </h3>
            </div>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg text-emerald-600 shrink-0">
              <TrendingUp size={24} />
            </div>
          </div>
        </Card>

        <Card className="bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
          <div className="flex justify-between items-center gap-4">
            <div className="min-w-0">
              <p className="text-red-600 dark:text-red-400 text-sm font-bold mb-1 truncate">
                إجمالي المدفوعات
              </p>
              <h3 className="text-xl lg:text-2xl font-black text-red-700 dark:text-red-300 break-all">
                {formatCurrency(summary.reduce((acc, curr) => acc + curr.total_paid, 0))}
              </h3>
            </div>
            <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg text-red-600 shrink-0">
              <TrendingDown size={24} />
            </div>
          </div>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
          <div className="flex justify-between items-center gap-4">
            <div className="min-w-0">
              <p className="text-blue-600 dark:text-blue-400 text-sm font-bold mb-1 truncate">صافي الرصيد</p>
              <h3 className="text-xl lg:text-2xl font-black text-blue-700 dark:text-blue-300 break-all">
                {formatCurrency(summary.reduce((acc, curr) => acc + curr.balance, 0))}
              </h3>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 shrink-0">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">التاريخ</label>
                  <input
                    type="date"
                    required
                    className="w-full min-w-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">العميل</label>
                  <select
                    required
                    className="w-full min-w-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
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
                <label className="block text-sm font-bold text-slate-600 mb-1">طريقة الدفع</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment-method"
                      checked={newTransaction.payment_method === 'نقدا'}
                      onChange={() => setNewTransaction({ ...newTransaction, payment_method: 'نقدا' })}
                    />
                    <span className="text-sm font-bold">نقدا</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment-method"
                      checked={newTransaction.payment_method === 'تحويل بنكي'}
                      onChange={() => setNewTransaction({ ...newTransaction, payment_method: 'تحويل بنكي' })}
                    />
                    <span className="text-sm font-bold">تحويل بنكي</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment-method"
                      checked={newTransaction.payment_method === 'مصروفات ومشتريات'}
                      onChange={() =>
                        setNewTransaction({ ...newTransaction, payment_method: 'مصروفات ومشتريات' })
                      }
                    />
                    <span className="text-sm font-bold">مصروفات ومشتريات</span>
                  </label>
                </div>
              </div>

              {/* Receipt upload for bank transfer */}
              {newTransaction.payment_method === 'تحويل بنكي' && (
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-600">
                    إيصال التحويل (اختياري)
                  </label>

                  {!showAddReceiptPreview ? (
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        id="add-receipt-upload"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={handleAddReceiptUpload}
                      />
                      <label
                        htmlFor="add-receipt-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <FileImage size={32} className="text-slate-400" />
                        <p className="text-sm text-slate-500 font-bold">انقر لرفع إيصال التحويل</p>
                        <p className="text-xs text-slate-400">صور أو PDF حتى 5 ميجابايت</p>
                      </label>
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        {addReceiptFile?.startsWith('data:image') ? (
                          <img
                            src={addReceiptFile}
                            alt="إيصال"
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center">
                            <FileText size={24} className="text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            تم رفع الإيصال
                          </p>
                          <input
                            type="text"
                            placeholder="رقم مرجعي (اختياري)"
                            className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm"
                            value={addReceiptReference}
                            onChange={(e) => setAddReceiptReference(e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveAddReceipt}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">التاريخ</label>
                  <input
                    type="date"
                    required
                    className="w-full min-w-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
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
                    className="w-full min-w-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
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
                <label className="block text-sm font-bold text-slate-600 mb-1">طريقة الدفع</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit-payment-method"
                      checked={editingTransaction.payment_method === 'نقدا'}
                      onChange={() =>
                        setEditingTransaction({ ...editingTransaction, payment_method: 'نقدا' })
                      }
                    />
                    <span className="text-sm font-bold">نقدا</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit-payment-method"
                      checked={editingTransaction.payment_method === 'تحويل بنكي'}
                      onChange={() =>
                        setEditingTransaction({ ...editingTransaction, payment_method: 'تحويل بنكي' })
                      }
                    />
                    <span className="text-sm font-bold">تحويل بنكي</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit-payment-method"
                      checked={editingTransaction.payment_method === 'مصروفات ومشتريات'}
                      onChange={() =>
                        setEditingTransaction({
                          ...editingTransaction,
                          payment_method: 'مصروفات ومشتريات'
                        })
                      }
                    />
                    <span className="text-sm font-bold">مصروفات ومشتريات</span>
                  </label>
                </div>
              </div>

              {/* Receipt upload for bank transfer */}
              {editingTransaction.payment_method === 'تحويل بنكي' && (
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-600">
                    إيصال التحويل (اختياري)
                  </label>

                  {!showEditReceiptPreview && !editingTransaction.receipt_file ? (
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        id="edit-receipt-upload"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={handleEditReceiptUpload}
                      />
                      <label
                        htmlFor="edit-receipt-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <FileImage size={32} className="text-slate-400" />
                        <p className="text-sm text-slate-500 font-bold">انقر لرفع إيصال التحويل</p>
                        <p className="text-xs text-slate-400">صور أو PDF حتى 5 ميجابايت</p>
                      </label>
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        {(editReceiptFile || editingTransaction.receipt_file)?.startsWith('data:image') ===
                        true ? (
                          <img
                            src={editReceiptFile || editingTransaction.receipt_file}
                            alt="إيصال"
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center">
                            <FileText size={24} className="text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            {editReceiptFile ? 'إيصال جديد' : 'إيصال موجود'}
                          </p>
                          <input
                            type="text"
                            placeholder="رقم مرجعي (اختياري)"
                            className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm"
                            value={editReceiptReference || editingTransaction.receipt_reference || ''}
                            onChange={(e) => setEditReceiptReference(e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveEditReceipt}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
