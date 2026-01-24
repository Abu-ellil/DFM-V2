import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Card } from './ui/Card'
import { Table } from './ui/Table'
import {
  BarChart3,
  Calendar,
  Download,
  Scale,
  Wallet,
  Package,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { useWeighbridgeStore } from '../store/useWeighbridgeStore'
import { useFinanceStore } from '../store/useFinanceStore'
import { useCrateStore } from '../store/useCrateStore'
import { useCustomerStore } from '../store/useCustomerStore'
import { formatCurrency, formatNumber } from '../utils/format'

type ReportType = 'weighbridge' | 'finance' | 'crates'

export default function Reports() {
  const { transactions: weighbridge, fetchTransactions: fetchWeighbridge } = useWeighbridgeStore()
  const { transactions: finance, fetchFinance } = useFinanceStore()
  const { transactions: crates, fetchCrates } = useCrateStore()
  const { customers, fetchCustomers } = useCustomerStore()

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
  }, [])

  const filterData = (data: any[]) => {
    return data.filter(item => {
      const date = item.date
      const customerMatch = selectedCustomer === 'all' || item.customer_id.toString() === selectedCustomer
      const dateMatch = date >= dateRange.start && date <= dateRange.end
      return customerMatch && dateMatch
    })
  }

  const filteredWeighbridge = filterData(weighbridge)
  const filteredFinance = filterData(finance)
  const filteredCrates = filterData(crates)

  const weighbridgeColumns = [
    { header: 'التاريخ', accessor: (t: any) => new Date(t.date).toLocaleDateString('ar-EG') },
    { header: 'العميل', accessor: 'customer_name' as const },
    { header: 'نوع البلح', accessor: 'date_type_name' as const },
    { header: 'الوزن القائم', accessor: (t: any) => formatNumber(t.gross_weight) },
    { header: 'الوزن الفارغ', accessor: (t: any) => formatNumber(t.tare_weight) },
    { header: 'الوزن الصافي', accessor: (t: any) => formatNumber(t.net_weight), className: 'font-bold text-emerald-600' },
  ]

  const financeColumns = [
    { header: 'التاريخ', accessor: (t: any) => new Date(t.date).toLocaleDateString('ar-EG') },
    { header: 'العميل', accessor: 'customer_name' as const },
    { header: 'النوع', accessor: 'transaction_type' as const },
    { header: 'مقبوض', accessor: (t: any) => t.amount_received > 0 ? formatCurrency(t.amount_received) : '-', className: 'text-emerald-500 font-bold' },
    { header: 'مدفوع', accessor: (t: any) => t.amount_paid > 0 ? formatCurrency(t.amount_paid) : '-', className: 'text-red-500 font-bold' },
    { header: 'ملاحظات', accessor: 'notes' as const },
  ]

  const cratesColumns = [
    { header: 'التاريخ', accessor: (t: any) => new Date(t.date).toLocaleDateString('ar-EG') },
    { header: 'العميل', accessor: 'customer_name' as const },
    { header: 'النوع', accessor: 'crate_type_name' as const },
    { header: 'خارج', accessor: 'crates_out' as const, className: 'text-red-500 font-bold' },
    { header: 'عائد', accessor: 'crates_returned' as const, className: 'text-emerald-500 font-bold' },
    { header: 'المستلم', accessor: 'handler' as const },
  ]

  const getStats = () => {
    switch (activeReport) {
      case 'weighbridge':
        const totalNetWeight = filteredWeighbridge.reduce((acc, curr) => acc + curr.net_weight, 0)
        return [
          { label: 'إجمالي الوزن الصافي', value: `${formatNumber(totalNetWeight)} كجم`, icon: <Scale size={20} />, color: 'text-emerald-600' },
          { label: 'عدد النقلات', value: filteredWeighbridge.length, icon: <TrendingUp size={20} />, color: 'text-blue-600' }
        ]
      case 'finance':
        const totalReceived = filteredFinance.reduce((acc, curr) => acc + curr.amount_received, 0)
        const totalPaid = filteredFinance.reduce((acc, curr) => acc + curr.amount_paid, 0)
        return [
          { label: 'إجمالي المقبوضات', value: formatCurrency(totalReceived), icon: <TrendingUp size={20} />, color: 'text-emerald-600' },
          { label: 'إجمالي المدفوعات', value: formatCurrency(totalPaid), icon: <TrendingDown size={20} />, color: 'text-red-600' },
          { label: 'صافي الحركة', value: formatCurrency(totalReceived - totalPaid), icon: <Wallet size={20} />, color: 'text-blue-600' }
        ]
      case 'crates':
        const totalOut = filteredCrates.reduce((acc, curr) => acc + curr.crates_out, 0)
        const totalReturned = filteredCrates.reduce((acc, curr) => acc + curr.crates_returned, 0)
        return [
          { label: 'إجمالي الخارج', value: totalOut, icon: <Package size={20} />, color: 'text-red-600' },
          { label: 'إجمالي العائد', value: totalReturned, icon: <Package size={20} />, color: 'text-emerald-600' },
          { label: 'الرصيد في الفترة', value: totalOut - totalReturned, icon: <TrendingUp size={20} />, color: 'text-blue-600' }
        ]
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = async () => {
    try {
      setIsExporting(true)
      const dataToExport = activeReport === 'weighbridge' ? filteredWeighbridge : 
                          activeReport === 'finance' ? filteredFinance : 
                          filteredCrates
      
      const columnsToExport = activeReport === 'weighbridge' ? weighbridgeColumns : 
                             activeReport === 'finance' ? financeColumns : 
                             cratesColumns

      const result = await window.api.reports.exportExcel({
        title: `تقرير-${activeReport === 'weighbridge' ? 'الميزان' : activeReport === 'finance' ? 'المالية' : 'الصناديق'}`,
        columns: columnsToExport.map(c => ({ header: c.header })),
        data: dataToExport.map(item => {
          const row = {}
          columnsToExport.forEach(col => {
            if (typeof col.accessor === 'function') {
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
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {getStats()?.map((stat, i) => (
          <Card key={i} className="bg-white dark:bg-slate-900 border-r-4 border-r-emerald-500">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-800 ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500">{stat.label}</p>
                <p className="text-xl font-black text-slate-800 dark:text-white">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="hidden print:block mb-6 text-center border-b pb-6">
          <h1 className="text-3xl font-black mb-2">مصنع تمور - تقرير {activeReport === 'weighbridge' ? 'الميزان' : activeReport === 'finance' ? 'الحركة المالية' : 'حركة الصناديق'}</h1>
          <p className="text-slate-600 font-bold">
            الفترة من: {new Date(dateRange.start).toLocaleDateString('ar-EG')} إلى: {new Date(dateRange.end).toLocaleDateString('ar-EG')}
          </p>
          {selectedCustomer !== 'all' && (
            <p className="text-emerald-600 font-black mt-2">
              العميل: {customers.find(c => c.id.toString() === selectedCustomer)?.name}
            </p>
          )}
        </div>

        <Table 
          columns={
            activeReport === 'weighbridge' ? weighbridgeColumns : 
            activeReport === 'finance' ? financeColumns : 
            cratesColumns
          } 
          data={
            activeReport === 'weighbridge' ? filteredWeighbridge : 
            activeReport === 'finance' ? filteredFinance : 
            filteredCrates
          } 
        />
        
        <div className="hidden print:flex justify-between mt-12 pt-8 border-t font-bold">
          <div>توقيع المستلم: ............................</div>
          <div>توقيع المدير المسؤول: ............................</div>
        </div>
      </Card>
    </div>
  )
}
