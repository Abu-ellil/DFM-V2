import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Card } from './ui/Card'
import { Table } from './ui/Table'
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import Download from 'lucide-react/dist/esm/icons/download'
import Scale from 'lucide-react/dist/esm/icons/scale'
import Wallet from 'lucide-react/dist/esm/icons/wallet'
import Package from 'lucide-react/dist/esm/icons/package'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down'
import { useWeighbridgeStore } from '../store/useWeighbridgeStore'
import { useFinanceStore } from '../store/useFinanceStore'
import { useCrateStore } from '../store/useCrateStore'
import { useCustomerStore } from '../store/useCustomerStore'
import { useAppStore } from '../store/useAppStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { formatCurrency, formatNumber } from '../utils/format'

type ReportType = 'weighbridge' | 'finance' | 'crates'

export default function Reports() {
  const { transactions: weighbridge, fetchTransactions: fetchWeighbridge } = useWeighbridgeStore()
  const { transactions: finance, fetchFinance } = useFinanceStore()
  const { transactions: crates, fetchCrates } = useCrateStore()
  const { customers, fetchCustomers } = useCustomerStore()
  const { navigateToCustomer } = useAppStore()
  const { settings, fetchSettings } = useSettingsStore()

  const [activeReport, setActiveReport] = useState<ReportType>('weighbridge')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all')
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    fetchWeighbridge()
    fetchFinance()
    fetchCrates()
    fetchCustomers()
    fetchSettings()
  }, [])

  const filterData = (data: any[]) => {
    return data.filter((item) => {
      const date = item.date
      const customerMatch =
        selectedCustomer === 'all' || item.customer_id.toString() === selectedCustomer
      const dateMatch = date >= dateRange.start && date <= dateRange.end
      return customerMatch && dateMatch
    })
  }

  const filteredWeighbridge = filterData(weighbridge)
  const filteredFinance = filterData(finance)
  const filteredCrates = filterData(crates)

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
    { header: 'نوع البلح', accessor: 'date_type_name' as const },
    { header: 'الوزن القائم', accessor: (t: any) => formatNumber(t.gross_weight) },
    { header: 'الوزن الفارغ', accessor: (t: any) => formatNumber(t.tare_weight) },
    {
      header: 'الوزن الصافي',
      accessor: (t: any) => formatNumber(t.net_weight),
      className: 'font-bold text-emerald-600'
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
      accessor: (t: any) => (t.amount_received > 0 ? formatCurrency(t.amount_received) : '-'),
      className: 'text-emerald-500 font-bold'
    },
    {
      header: 'مدفوع',
      accessor: (t: any) => (t.amount_paid > 0 ? formatCurrency(t.amount_paid) : '-'),
      className: 'text-red-500 font-bold'
    },
    { header: 'ملاحظات', accessor: 'notes' as const }
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
    { header: 'النوع', accessor: 'crate_type_name' as const },
    { header: 'خارج', accessor: 'crates_out' as const, className: 'text-red-500 font-bold' },
    {
      header: 'عائد',
      accessor: 'crates_returned' as const,
      className: 'text-emerald-500 font-bold'
    },
    { header: 'المستلم', accessor: 'handler' as const }
  ]

  const getStats = () => {
    switch (activeReport) {
      case 'weighbridge':
        const totalNetWeight = filteredWeighbridge.reduce((acc, curr) => acc + curr.net_weight, 0)
        return [
          {
            label: 'إجمالي الوزن الصافي',
            value: `${formatNumber(totalNetWeight)} كجم`,
            icon: <Scale size={20} />,
            color: 'text-emerald-600'
          },
          {
            label: 'عدد النقلات',
            value: filteredWeighbridge.length,
            icon: <TrendingUp size={20} />,
            color: 'text-blue-600'
          }
        ]
      case 'finance':
        const totalReceived = filteredFinance.reduce((acc, curr) => acc + curr.amount_received, 0)
        const totalPaid = filteredFinance.reduce((acc, curr) => acc + curr.amount_paid, 0)
        return [
          {
            label: 'إجمالي المقبوضات',
            value: formatCurrency(totalReceived),
            icon: <TrendingUp size={20} />,
            color: 'text-emerald-600'
          },
          {
            label: 'إجمالي المدفوعات',
            value: formatCurrency(totalPaid),
            icon: <TrendingDown size={20} />,
            color: 'text-red-600'
          },
          {
            label: 'صافي الحركة',
            value: formatCurrency(totalReceived - totalPaid),
            icon: <Wallet size={20} />,
            color: 'text-blue-600'
          }
        ]
      case 'crates':
        const totalOut = filteredCrates.reduce((acc, curr) => acc + curr.crates_out, 0)
        const totalReturned = filteredCrates.reduce((acc, curr) => acc + curr.crates_returned, 0)
        return [
          {
            label: 'إجمالي الخارج',
            value: totalOut,
            icon: <Package size={20} />,
            color: 'text-red-600'
          },
          {
            label: 'إجمالي العائد',
            value: totalReturned,
            icon: <Package size={20} />,
            color: 'text-emerald-600'
          },
          {
            label: 'الرصيد في الفترة',
            value: totalOut - totalReturned,
            icon: <TrendingUp size={20} />,
            color: 'text-blue-600'
          }
        ]
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = async () => {
    try {
      setIsExporting(true)
      const dataToExport =
        activeReport === 'weighbridge'
          ? filteredWeighbridge
          : activeReport === 'finance'
            ? filteredFinance
            : filteredCrates

      const columnsToExport =
        activeReport === 'weighbridge'
          ? weighbridgeColumns
          : activeReport === 'finance'
            ? financeColumns
            : cratesColumns

      const result = await window.api.reports.exportExcel({
        title: `تقرير-${activeReport === 'weighbridge' ? 'الميزان' : activeReport === 'finance' ? 'المالية' : 'الصناديق'}`,
        columns: columnsToExport.map((c) => ({ header: c.header })),
        data: dataToExport.map((item) => {
          const row = {}
          columnsToExport.forEach((col) => {
            if (col.header === 'العميل') {
              row[col.header] = item.customer_name
            } else if (typeof col.accessor === 'function') {
              row[col.header] = col.accessor(item)
            } else {
              row[col.header] = item[col.accessor as string]
            }
          })
          return row
        })
      })

      if (result.success) {
        toast.success('تم التصدير بنجاح')
      } else if (result.message) {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Export Excel error:', error)
      toast.error('حدث خطأ تقني أثناء التصدير')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <BarChart3 className="text-emerald-600" />
          التقارير والإحصائيات
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-bold disabled:opacity-50"
          >
            <Download size={20} />
            تصدير Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-bold"
          >
            <Calendar size={20} />
            طباعة
          </button>
        </div>
      </div>

      <Card className="print:hidden">
        <div className="flex flex-wrap gap-6 items-end">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-500 block">نوع التقرير</label>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setActiveReport('weighbridge')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${activeReport === 'weighbridge' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-slate-500'}`}
              >
                <Scale size={18} />
                الميزان
              </button>
              <button
                onClick={() => setActiveReport('finance')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${activeReport === 'finance' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-slate-500'}`}
              >
                <Wallet size={18} />
                المالية
              </button>
              <button
                onClick={() => setActiveReport('crates')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${activeReport === 'crates' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-slate-500'}`}
              >
                <Package size={18} />
                الصناديق
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-500 block">العميل</label>
            <select
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 min-w-[200px]"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <option value="all">كل العملاء</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-500 block">من تاريخ</label>
            <input
              type="date"
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-500 block">إلى تاريخ</label>
            <input
              type="date"
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {getStats()?.map((stat, i) => (
          <Card key={i} className="bg-white dark:bg-slate-900 border-r-4 border-r-emerald-500">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-500 truncate" title={stat.label}>
                  {stat.label}
                </p>
                <p className="text-xl lg:text-2xl font-black text-slate-800 dark:text-white break-words">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-800 shrink-0 ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="hidden print:block mb-8 border-b-4 border-emerald-600 pb-8">
          <div className="flex justify-between items-start mb-6">
            <div className="text-right flex-1">
              <h1 className="text-5xl font-black text-emerald-800 mb-3 tracking-tight">
                {settings.company_name || 'مصنع تمور'}
              </h1>
              <div className="space-y-1 text-slate-700 text-xl font-bold">
                {settings.company_address && <p>{settings.company_address}</p>}
                {settings.company_phone && <p>{settings.company_phone}</p>}
              </div>
            </div>
            {settings.company_logo && (
              <div className="bg-white p-3 rounded-2xl shadow-md border-2 border-slate-100">
                <img
                  src={settings.company_logo}
                  alt="Logo"
                  className="h-28 w-auto object-contain"
                />
              </div>
            )}
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t-2 border-slate-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-8 py-3 rounded-full text-3xl font-black text-slate-800 border-3 border-emerald-600 shadow-lg">
                تقرير{' '}
                {activeReport === 'weighbridge'
                  ? 'الميزان'
                  : activeReport === 'finance'
                    ? 'الحركة المالية'
                    : 'حركة الصناديق'}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center px-6 py-3 bg-slate-50 rounded-xl border-2 border-slate-200 mt-4">
            <div className="flex gap-8 text-lg">
              <p className="font-bold">
                <span className="text-slate-500">الفترة:</span>{' '}
                {new Date(dateRange.start).toLocaleDateString('ar-EG')} -{' '}
                {new Date(dateRange.end).toLocaleDateString('ar-EG')}
              </p>
              {selectedCustomer !== 'all' && (
                <p className="font-bold text-emerald-700">
                  <span className="text-slate-500">العميل:</span>{' '}
                  {customers.find((c) => c.id.toString() === selectedCustomer)?.name}
                </p>
              )}
            </div>
            <p className="text-lg font-bold text-slate-500">
              تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}
            </p>
          </div>
        </div>

        <Table
          columns={
            activeReport === 'weighbridge'
              ? weighbridgeColumns
              : activeReport === 'finance'
                ? financeColumns
                : cratesColumns
          }
          data={
            activeReport === 'weighbridge'
              ? filteredWeighbridge
              : activeReport === 'finance'
                ? filteredFinance
                : filteredCrates
          }
        />

        <div className="hidden print:flex justify-between gap-8 mt-16 pt-10 border-t-4 border-emerald-600">
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-slate-600 mb-16">توقيع المستلم</p>
            <div className="w-full border-b-2 border-slate-400 pb-2"></div>
          </div>
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-slate-600 mb-16">توقيت المراجعة</p>
            <div className="w-full border-b-2 border-slate-400 pb-2"></div>
          </div>
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-slate-600 mb-16">توقيع المدير المسؤول</p>
            <div className="w-full border-b-2 border-slate-400 pb-2"></div>
          </div>
        </div>

        <div className="hidden print:block mt-12 text-center">
          <p className="text-slate-500 font-bold italic text-lg">
            تم استخراج هذا التقرير آلياً من نظام إدارة مصانع التمور -{' '}
            {new Date().toLocaleString('ar-EG')}
          </p>
        </div>
      </Card>
    </div>
  )
}
