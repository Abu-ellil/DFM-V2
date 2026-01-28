import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Card } from './ui/Card'
import { Table } from './ui/Table'
import Copy from 'lucide-react/dist/esm/icons/copy'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import Scale from 'lucide-react/dist/esm/icons/scale'
import Wallet from 'lucide-react/dist/esm/icons/wallet'
import Package from 'lucide-react/dist/esm/icons/package'
import { formatCurrency, formatNumber } from '../utils/format'
import { useAppStore } from '../store/useAppStore'

type DuplicateData = {
  weighbridge: any[]
  crates: any[]
  finance: any[]
  summary: {
    total: number
    byTable: {
      weighbridge: number
      crates: number
      finance: number
    }
  }
}

export default function Duplicates() {
  const [data, setData] = useState<DuplicateData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'weighbridge' | 'crates' | 'finance'>('weighbridge')
  const { navigateToCustomer } = useAppStore()

  const fetchDuplicates = async () => {
    setIsLoading(true)
    try {
      const result = await window.api.duplicates.getAll()
      setData(result)
    } catch (error) {
      console.error('Error fetching duplicates:', error)
      toast.error('حدث خطأ أثناء تحميل البيانات المكررة')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDuplicates()
  }, [])

  const handleDelete = async (table: string, id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return

    try {
      const result = await window.api.duplicates.delete({ table, id })
      if (result.success) {
        toast.success('تم حذف السجل بنجاح')
        fetchDuplicates()
      } else {
        toast.error(result.message || 'فشل حذف السجل')
      }
    } catch (error) {
      console.error('Error deleting duplicate:', error)
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  const handleAutoClean = async () => {
    if (
      !confirm(
        'سيتم حذف جميع السجلات المكررة والإبقاء على نسخة واحدة فقط من كل عملية. هل تريد الاستمرار؟'
      )
    )
      return

    try {
      const result = await window.api.duplicates.autoClean()
      if (result.success) {
        toast.success(`تم تنظيف ${result.count} سجل مكرر بنجاح`)
        fetchDuplicates()
      } else {
        toast.error(result.message || 'فشل تنظيف البيانات')
      }
    } catch (error) {
      console.error('Error auto-cleaning duplicates:', error)
      toast.error('حدث خطأ أثناء التنظيف')
    }
  }

  const weighbridgeColumns = [
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
    { header: 'الوزن القائم', accessor: (t: any) => formatNumber(t.gross_weight) },
    {
      header: 'الوزن الصافي',
      accessor: (t: any) => formatNumber(t.net_weight),
      className: 'font-bold text-emerald-600'
    },
    {
      header: 'تكرار',
      accessor: (t: any) => (
        <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">
          {t.duplicate_count}
        </span>
      )
    },
    {
      header: 'إجراءات',
      accessor: (t: any) => (
        <button
          onClick={() => handleDelete('weighbridge', t.id)}
          className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
          title="حذف"
        >
          <Trash2 size={16} />
        </button>
      )
    }
  ]

  const cratesColumns = [
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
    { header: 'خارج', accessor: 'crates_out' as const, className: 'text-red-500 font-bold' },
    {
      header: 'عائد',
      accessor: 'crates_returned' as const,
      className: 'text-emerald-500 font-bold'
    },
    {
      header: 'تكرار',
      accessor: (t: any) => (
        <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">
          {t.duplicate_count}
        </span>
      )
    },
    {
      header: 'إجراءات',
      accessor: (t: any) => (
        <button
          onClick={() => handleDelete('crates', t.id)}
          className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
          title="حذف"
        >
          <Trash2 size={16} />
        </button>
      )
    }
  ]

  const financeColumns = [
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
      header: 'مقبوض',
      accessor: (t: any) => (t.amount_received > 0 ? formatCurrency(t.amount_received) : '-')
    },
    {
      header: 'مدفوع',
      accessor: (t: any) => (t.amount_paid > 0 ? formatCurrency(t.amount_paid) : '-')
    },
    {
      header: 'تكرار',
      accessor: (t: any) => (
        <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">
          {t.duplicate_count}
        </span>
      )
    },
    {
      header: 'إجراءات',
      accessor: (t: any) => (
        <button
          onClick={() => handleDelete('finance', t.id)}
          className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
          title="حذف"
        >
          <Trash2 size={16} />
        </button>
      )
    }
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">جاري تحميل البيانات المكررة...</div>
    )
  }

  const hasDuplicates = data && data.summary.total > 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Copy size={24} className="text-emerald-600" />
            التحقق من العمليات المكررة
          </h2>
          <p className="text-slate-500 mt-1">
            البحث عن العمليات التي قد تكون تم تسجيلها مرتين بالخطأ
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchDuplicates}
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            title="تحديث"
          >
            <RefreshCw size={20} />
          </button>
          {hasDuplicates && (
            <button
              onClick={handleAutoClean}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 font-bold shadow-lg shadow-emerald-600/20"
            >
              <CheckCircle2 size={20} />
              تنظيف تلقائي
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="الميزان المكرر"
          value={data?.summary.byTable.weighbridge || 0}
          icon={<Scale size={20} />}
          color="blue"
          active={activeTab === 'weighbridge'}
          onClick={() => setActiveTab('weighbridge')}
        />
        <StatCard
          label="الصناديق المكررة"
          value={data?.summary.byTable.crates || 0}
          icon={<Package size={20} />}
          color="orange"
          active={activeTab === 'crates'}
          onClick={() => setActiveTab('crates')}
        />
        <StatCard
          label="المالية المكررة"
          value={data?.summary.byTable.finance || 0}
          icon={<Wallet size={20} />}
          color="emerald"
          active={activeTab === 'finance'}
          onClick={() => setActiveTab('finance')}
        />
      </div>

      <Card>
        {!hasDuplicates ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <CheckCircle2 size={64} className="text-emerald-500 mb-4 opacity-20" />
            <p className="text-xl font-medium">لا توجد عمليات مكررة حالياً</p>
            <p className="text-sm mt-2">قاعدة البيانات تبدو نظيفة تماماً</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 rounded-xl border border-amber-100 dark:border-amber-900/30">
              <AlertTriangle size={20} />
              <p className="text-sm font-medium">
                تم العثور على {data.summary.total} عملية مكررة. يرجى مراجعتها بعناية قبل الحذف.
              </p>
            </div>

            <Table
              columns={
                activeTab === 'weighbridge'
                  ? weighbridgeColumns
                  : activeTab === 'crates'
                    ? cratesColumns
                    : financeColumns
              }
              data={data[activeTab]}
            />
          </div>
        )}
      </Card>
    </div>
  )
}

function StatCard({ label, value, icon, color, active, onClick }: any) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30',
    orange:
      'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/30',
    emerald:
      'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30'
  }

  return (
    <button
      onClick={onClick}
      className={`p-6 rounded-2xl border transition-all text-right w-full flex flex-col gap-2 ${
        active
          ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-xl ring-2 ring-emerald-500/20'
          : 'bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color as keyof typeof colors]}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{label}</p>
        <p className="text-3xl font-black text-slate-800 dark:text-white">{value}</p>
      </div>
    </button>
  )
}
