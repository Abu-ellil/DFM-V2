import { useEffect, useState } from 'react'
import { useWeighbridgeStore } from '../store/useWeighbridgeStore'
import { useCustomerStore } from '../store/useCustomerStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useAppStore } from '../store/useAppStore'
import { Card } from './ui/Card'
import { Table } from './ui/Table'
import Scale from 'lucide-react/dist/esm/icons/scale'
import Search from 'lucide-react/dist/esm/icons/search'
import Plus from 'lucide-react/dist/esm/icons/plus'
import X from 'lucide-react/dist/esm/icons/x'
import Calculator from 'lucide-react/dist/esm/icons/calculator'
import { toast } from 'react-toastify'
import { formatCurrency, formatNumber } from '../utils/format'

export default function Weighbridge() {
  const { transactions, fetchTransactions, addTransaction, isLoading } = useWeighbridgeStore()
  const { customers, fetchCustomers } = useCustomerStore()
  const { settings, fetchSettings } = useSettingsStore()
  const { navigateToCustomer } = useAppStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [dateTypes, setDateTypes] = useState<any[]>([])
  const [sortColumn, setSortColumn] = useState<string>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc')

  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    customer_id: '',
    date_type_id: '',
    gross_weight: 0,
    net_weight: 0,
    price_per_qantar: 0,
    total: 0,
    crates_count: 0,
    commission: 0,
    notes: ''
  })

  useEffect(() => {
    fetchTransactions()
    fetchCustomers()
    fetchSettings()
    window.api.dateTypes.getAll().then(setDateTypes)
  }, [])

  const filteredTransactions = transactions.filter(
    (t) => t.customer_name.includes(searchTerm) || (t.notes && t.notes.includes(searchTerm))
  )

  const handleSort = (column: string, direction: 'asc' | 'desc' | null) => {
    setSortColumn(column)
    setSortDirection(direction)
  }

  const sortedAndFilteredTransactions = [...filteredTransactions].sort((a, b) => {
    if (!sortDirection) return 0

    let aValue: any
    let bValue: any

    switch (sortColumn) {
      case 'date':
        aValue = new Date(a.date).getTime()
        bValue = new Date(b.date).getTime()
        break
      case 'customer_name':
        aValue = a.customer_name || ''
        bValue = b.customer_name || ''
        break
      case 'date_type_name':
        aValue = a.date_type_name || ''
        bValue = b.date_type_name || ''
        break
      case 'gross_weight':
        aValue = Number(a.gross_weight) || 0
        bValue = Number(b.gross_weight) || 0
        break
      case 'net_weight':
        aValue = Number(a.net_weight) || 0
        bValue = Number(b.net_weight) || 0
        break
      case 'price_per_qantar':
        aValue = Number(a.price_per_qantar) || 0
        bValue = Number(b.price_per_qantar) || 0
        break
      case 'total':
        aValue = Number(a.total) || 0
        bValue = Number(b.total) || 0
        break
      default:
        return 0
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
    }
  })

  // Auto calculate net weight and total
  useEffect(() => {
    const qantarWeight = parseFloat(settings.qantar_weight) || 45
    const crateWeight = parseFloat(settings.crate_weight) || 2

    const calculatedNetWeight = Math.max(
      0,
      newTransaction.gross_weight - newTransaction.crates_count * crateWeight
    )
    const calculatedTotal = (calculatedNetWeight / qantarWeight) * newTransaction.price_per_qantar

    setNewTransaction((prev) => ({
      ...prev,
      net_weight: Number(calculatedNetWeight.toFixed(2)),
      total: Number(calculatedTotal.toFixed(2))
    }))
  }, [
    newTransaction.gross_weight,
    newTransaction.crates_count,
    newTransaction.price_per_qantar,
    settings
  ])

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTransaction.customer_id) {
      toast.error('يرجى اختيار العميل')
      return
    }

    const result = await addTransaction(newTransaction)
    if (result.success) {
      toast.success('تم إضافة عملية الميزان بنجاح')
      setIsModalOpen(false)
      setNewTransaction({
        date: new Date().toISOString().split('T')[0],
        customer_id: '',
        date_type_id: '',
        gross_weight: 0,
        net_weight: 0,
        price_per_qantar: 0,
        total: 0,
        crates_count: 0,
        commission: 0,
        notes: ''
      })
    } else {
      toast.error(result.message || 'حدث خطأ ما')
    }
  }

  const columns = [
    {
      header: 'التاريخ',
      accessor: (t: any) => new Date(t.date).toLocaleDateString('ar-EG'),
      sortable: true,
      sortKey: 'date'
    },
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
      ),
      sortable: true,
      sortKey: 'customer_name'
    },
    {
      header: 'النوع',
      accessor: 'date_type_name' as const,
      sortable: true,
      sortKey: 'date_type_name'
    },
    {
      header: 'الوزن القائم',
      accessor: (t: any) => formatNumber(t.gross_weight),
      sortable: true,
      sortKey: 'gross_weight'
    },
    {
      header: 'الوزن الصافي',
      accessor: (t: any) => formatNumber(t.net_weight),
      sortable: true,
      sortKey: 'net_weight'
    },
    {
      header: 'السعر',
      accessor: (t: any) => formatCurrency(t.price_per_qantar),
      sortable: true,
      sortKey: 'price_per_qantar'
    },
    {
      header: 'الإجمالي',
      accessor: (t: any) => formatCurrency(t.total),
      sortable: true,
      sortKey: 'total'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">الميزان (البسكول)</h2>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Scale size={20} />
          وزنة جديدة
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
              placeholder="بحث في العمليات..."
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
            إضافة توريد
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-10">جاري التحميل...</div>
        ) : (
          <Table
            columns={columns}
            data={sortedAndFilteredTransactions}
            sortable={true}
            onSort={handleSort}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
          />
        )}
      </Card>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">إضافة عملية توريد ميزان</h3>
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
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">نوع البلح</label>
                  <select
                    required
                    className="w-full min-w-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                    value={newTransaction.date_type_id}
                    onChange={(e) =>
                      setNewTransaction({ ...newTransaction, date_type_id: e.target.value })
                    }
                  >
                    <option value="">اختر النوع</option>
                    {dateTypes.map((dt) => (
                      <option key={dt.id} value={dt.id}>
                        {dt.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">سعر القنطار</label>
                  <input
                    type="number"
                    required
                    className="w-full min-w-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                    value={newTransaction.price_per_qantar}
                    onChange={(e) =>
                      setNewTransaction({
                        ...newTransaction,
                        price_per_qantar: parseFloat(e.target.value) || 0
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">
                    الوزن القائم (كجم)
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-bold"
                    value={newTransaction.gross_weight}
                    onChange={(e) =>
                      setNewTransaction({
                        ...newTransaction,
                        gross_weight: parseFloat(e.target.value) || 0
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">
                    عدد الصناديق
                  </label>
                  <input
                    type="number"
                    className="w-full min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-bold"
                    value={newTransaction.crates_count}
                    onChange={(e) =>
                      setNewTransaction({
                        ...newTransaction,
                        crates_count: parseInt(e.target.value) || 0
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">
                    الوزن الصافي (كجم)
                  </label>
                  <div className="w-full min-w-0 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 font-black text-emerald-600">
                    {newTransaction.net_weight}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/20 gap-2">
                <div className="flex items-center gap-2">
                  <Calculator size={24} className="shrink-0" />
                  <span className="font-bold text-lg">إجمالي المبلغ:</span>
                </div>
                <div className="text-2xl font-black break-all">{formatCurrency(newTransaction.total)}</div>
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
                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                <Scale size={20} />
                حفظ عملية الميزان
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
