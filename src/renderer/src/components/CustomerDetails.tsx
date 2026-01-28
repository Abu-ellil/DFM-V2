import { useEffect, useState, useMemo } from 'react'
import { useCustomerStore } from '../store/useCustomerStore'
import { useWeighbridgeStore } from '../store/useWeighbridgeStore'
import { useFinanceStore } from '../store/useFinanceStore'
import { useCrateStore } from '../store/useCrateStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useCustomerAccountStore } from '../store/useCustomerAccountStore'
import { Card } from './ui/Card'
import { Table } from './ui/Table'
import { toast } from 'react-toastify'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left'
import Printer from 'lucide-react/dist/esm/icons/printer'
import Plus from 'lucide-react/dist/esm/icons/plus'
import Scale from 'lucide-react/dist/esm/icons/scale'
import Wallet from 'lucide-react/dist/esm/icons/wallet'
import Package from 'lucide-react/dist/esm/icons/package'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import User from 'lucide-react/dist/esm/icons/user'
import Phone from 'lucide-react/dist/esm/icons/phone'
import Tag from 'lucide-react/dist/esm/icons/tag'
import X from 'lucide-react/dist/esm/icons/x'
import { formatCurrency, formatNumber } from '../utils/format'

interface CustomerDetailsProps {
  customerId: number
  onBack: () => void
}

export default function CustomerDetails({ customerId, onBack }: CustomerDetailsProps) {
  const { customers } = useCustomerStore()
  const { transactions: weighbridge, fetchTransactions: fetchWeighbridge } = useWeighbridgeStore()
  const { transactions: finance, fetchFinance } = useFinanceStore()
  const { transactions: crates, fetchCrates } = useCrateStore()
  const { settings, fetchSettings } = useSettingsStore()
  const { fetchCustomerSummary, refreshSelectedCustomer } =
    useCustomerAccountStore()

  const [activeTab, setActiveTab] = useState<'all' | 'weighbridge' | 'finance' | 'crates'>('all')
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false)
  const [isWeighbridgeModalOpen, setIsWeighbridgeModalOpen] = useState(false)
  const [isCrateModalOpen, setIsCrateModalOpen] = useState(false)
  const [printingTransaction, setPrintingTransaction] = useState<{
    type: string
    data: any
  } | null>(null)

  const [dateTypes, setDateTypes] = useState<any[]>([])
  const [crateTypes, setCrateTypes] = useState<any[]>([])

  const [newFinance, setNewFinance] = useState({
    date: new Date().toISOString().split('T')[0],
    customer_id: customerId,
    transaction_type: 'مقبوض',
    amount_paid: 0,
    amount_received: 0,
    notes: ''
  })

  const [newWeighbridge, setNewWeighbridge] = useState({
    date: new Date().toISOString().split('T')[0],
    customer_id: customerId,
    date_type_id: '',
    gross_weight: 0,
    net_weight: 0,
    price_per_qantar: 0,
    total: 0,
    crates_count: 0,
    notes: ''
  })

  const [newCrate, setNewCrate] = useState({
    date: new Date().toISOString().split('T')[0],
    customer_id: customerId,
    crate_type_id: '',
    crates_out: 0,
    crates_returned: 0,
    handler: '',
    notes: ''
  })

  const customer = customers.find((c) => c.id === customerId)

  useEffect(() => {
    fetchWeighbridge()
    fetchFinance()
    fetchCrates()
    fetchSettings()
    fetchAuxData()
    fetchCustomerSummary(customerId)
  }, [customerId])

  // Listen for real-time updates
  useEffect(() => {
    const handleAccountUpdate = ({ customerId: updatedId }: { customerId: number }) => {
      if (updatedId === customerId) {
        refreshSelectedCustomer()
        fetchWeighbridge()
        fetchFinance()
        fetchCrates()
      }
    }

    window.api?.on?.('customerAccounts:updated', handleAccountUpdate)

    return () => {
      window.api?.removeListener?.('customerAccounts:updated', handleAccountUpdate)
    }
  }, [customerId])

  const fetchAuxData = async () => {
    const [dt, ct] = await Promise.all([
      window.api.dateTypes.getAll(),
      window.api.crateTypes.getAll()
    ])
    setDateTypes(dt)
    setCrateTypes(ct)
  }

  const handleAddFinance = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await useFinanceStore.getState().addTransaction(newFinance)
    if (result.success) {
      toast.success('تم إضافة العملية المالية')
      setIsFinanceModalOpen(false)
      fetchFinance()
    }
  }

  const handleAddWeighbridge = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await useWeighbridgeStore.getState().addTransaction(newWeighbridge)
    if (result.success) {
      toast.success('تم إضافة عملية الميزان')
      setIsWeighbridgeModalOpen(false)
      fetchWeighbridge()
    }
  }

  const handleAddCrate = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await useCrateStore.getState().addTransaction(newCrate)
    if (result.success) {
      toast.success('تم إضافة عملية الصناديق')
      setIsCrateModalOpen(false)
      fetchCrates()
    }
  }

  const customerWeighbridge = useMemo(
    () => weighbridge.filter((t) => t.customer_id === customerId),
    [weighbridge, customerId]
  )
  const customerFinance = useMemo(
    () => finance.filter((t) => t.customer_id === customerId),
    [finance, customerId]
  )
  const customerCrates = useMemo(
    () => crates.filter((t) => t.customer_id === customerId),
    [crates, customerId]
  )

  const totalNetWeight = customerWeighbridge.reduce((acc, curr) => acc + curr.net_weight, 0)

  // حساب الإجماليات محلياً لضمان الدقة وتوافقها مع البيانات المعروضة
  const totalWeighbridgeDebt = useMemo(
    () => customerWeighbridge.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0),
    [customerWeighbridge]
  ) // دين الميزان - أصل قيمة التمور

  const totalCashPayments = useMemo(
    () => customerFinance.reduce((acc, curr) => acc + (Number(curr.amount_received) || 0), 0),
    [customerFinance]
  ) // توريدات البلح نقداً

  const totalAdvances = useMemo(
    () => customerFinance.reduce((acc, curr) => acc + (Number(curr.amount_paid) || 0), 0),
    [customerFinance]
  ) // السلف والمصروفات

  const totalSupplied = totalCashPayments + totalWeighbridgeDebt // إجمالي ما للمورد (تمور + نقد)
  const totalFinanceBalance = totalSupplied - totalAdvances // الرصيد النهائي

  const cratesBalance = useMemo(
    () =>
      customerCrates.reduce(
        (acc, curr) =>
          acc + (Number(curr.crates_out) || 0) - (Number(curr.crates_returned) || 0),
        0
      ),
    [customerCrates]
  )

  const weighbridgeCount = customerWeighbridge.length
  const totalCratesOut = useMemo(
    () => customerCrates.reduce((acc, curr) => acc + (Number(curr.crates_out) || 0), 0),
    [customerCrates]
  )
  const totalCratesReturned = useMemo(
    () => customerCrates.reduce((acc, curr) => acc + (Number(curr.crates_returned) || 0), 0),
    [customerCrates]
  )

  const weighbridgeColumns = [
    { header: 'التاريخ', accessor: (t: any) => new Date(t.date).toLocaleDateString('ar-EG') },
    { header: 'النوع', accessor: 'date_type_name' as const },
    { header: 'الوزن الصافي', accessor: (t: any) => `${formatNumber(t.net_weight)} كجم` },
    { header: 'الإجمالي', accessor: (t: any) => formatCurrency(t.total) },
    {
      header: 'إجراء',
      accessor: (t: any) => (
        <button
          onClick={() => handlePrintSingle('weighbridge', t)}
          className="text-emerald-600 hover:text-emerald-700 print:hidden"
        >
          <Printer size={16} />
        </button>
      )
    }
  ]

  const financeColumns = [
    { header: 'التاريخ', accessor: (t: any) => new Date(t.date).toLocaleDateString('ar-EG') },
    { header: 'البيان', accessor: 'transaction_type' as const },
    {
      header: 'له (إيراد من العميل)',
      accessor: (t: any) => (t.amount_received > 0 ? formatCurrency(t.amount_received) : '-'),
      className: 'text-emerald-600 font-bold'
    },
    {
      header: 'عليه (مدفوع للعميل)',
      accessor: (t: any) => (t.amount_paid > 0 ? formatCurrency(t.amount_paid) : '-'),
      className: 'text-red-600 font-bold'
    },
    {
      header: 'إجراء',
      accessor: (t: any) => (
        <button
          onClick={() => handlePrintSingle('finance', t)}
          className="text-emerald-600 hover:text-emerald-700 print:hidden"
        >
          <Printer size={16} />
        </button>
      )
    }
  ]

  const cratesColumns = [
    { header: 'التاريخ', accessor: (t: any) => new Date(t.date).toLocaleDateString('ar-EG') },
    { header: 'النوع', accessor: 'crate_type_name' as const },
    { header: 'خارج', accessor: 'crates_out' as const, className: 'text-red-600' },
    { header: 'عائد', accessor: 'crates_returned' as const, className: 'text-emerald-600' },
    {
      header: 'إجراء',
      accessor: (t: any) => (
        <button
          onClick={() => handlePrintSingle('crates', t)}
          className="text-emerald-600 hover:text-emerald-700 print:hidden"
        >
          <Printer size={16} />
        </button>
      )
    }
  ]

  const handlePrintSingle = (type: string, transaction: any) => {
    setPrintingTransaction({ type, data: transaction })
    setTimeout(() => {
      window.print()
      setPrintingTransaction(null)
    }, 100)
  }

  const handlePrintAll = () => {
    setPrintingTransaction(null)
    setTimeout(() => {
      window.print()
    }, 100)
  }

  if (!customer) return <div>العميل غير موجود</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
            تفاصيل العميل: {customer.name}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrintAll}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-700 transition-colors"
          >
            <Printer size={20} />
            طباعة كشف حساب
          </button>
        </div>
      </div>

      {/* Print Header (Hidden on screen) */}
      <div className="hidden print:block text-center border-b-2 border-slate-300 pb-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div className="text-right">
            <h1 className="text-4xl font-black text-emerald-800 mb-2">{settings.company_name}</h1>
            <div className="space-y-1 text-slate-700 font-bold text-lg">
              <p className="flex items-center gap-2 justify-end">
                <span>{settings.company_address}</span>
              </p>
              <p className="flex items-center gap-2 justify-end">
                <span>{settings.company_phone}</span>
              </p>
            </div>
          </div>
          {settings.company_logo && (
            <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
              <img src={settings.company_logo} alt="Logo" className="h-24 w-auto object-contain" />
            </div>
          )}
        </div>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-slate-100 px-8 py-2 rounded-full text-2xl font-black text-slate-800 border-2 border-slate-200 shadow-sm">
              كشف حساب عميل
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex gap-8">
            <p className="font-bold">
              <span className="text-slate-500">العميل:</span> {customer.name}
            </p>
            <p className="font-bold">
              <span className="text-slate-500">النوع:</span> {customer.type}
            </p>
            <p className="font-bold">
              <span className="text-slate-500">الهاتف:</span> {customer.phone || '-'}
            </p>
          </div>
          <p className="text-sm font-bold text-slate-500">
            تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}
          </p>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        <Card className="md:col-span-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                <User size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold">اسم العميل</p>
                <p className="font-bold">{customer.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                <Tag size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold">نوع العميل</p>
                <p className="font-bold">{customer.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                <Phone size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold">رقم الهاتف</p>
                <p className="font-bold">{customer.phone || 'غير مسجل'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold">تاريخ الانضمام</p>
                <p className="font-bold">
                  {new Date(customer.created_at).toLocaleDateString('ar-EG')}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-600 pb-3">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Wallet size={22} className="text-emerald-400" />
                ملخص الحساب المالي
              </h3>
            </div>





            {/* إجمالي ما للعميل */}
            <div className="bg-cyan-500/20 rounded-xl p-4 border-2 border-cyan-400/30">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <p className="text-cyan-300 text-sm font-bold mb-1">إجمالي ما للعميل</p>
                  <p className="text-xs text-slate-300">(تمور + إيرادات)</p>
                </div>
                <p className="text-2xl md:text-3xl font-black text-cyan-400 break-all">
                  {formatCurrency(totalSupplied)}
                </p>
              </div>
            </div>

            {/* مدفوعات للعميل */}
            <div className="bg-red-500/20 rounded-xl p-4 border-2 border-red-400/30">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <p className="text-red-300 text-sm font-bold mb-1">مدفوعات للعميل</p>
                  <p className="text-xs text-slate-300">(المصنع دفع للعميل)</p>
                </div>
                <p className="text-2xl md:text-3xl font-black text-red-400 break-all">
                  {formatCurrency(totalAdvances)}
                </p>
              </div>
            </div>

            {/* الرصيد النهائي */}
            <div
              className={`rounded-xl p-4 border-2 ${totalFinanceBalance >= 0 ? 'bg-emerald-600 border-emerald-400' : 'bg-red-600 border-red-400'}`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <p className="text-sm font-bold mb-1 opacity-90">المتبقي للعميل</p>
                  <p className="text-xs opacity-75">
                    {totalFinanceBalance >= 0 ? 'المصنع عليه للزبون' : 'الزبون عليه للمصنع'}
                  </p>
                </div>
                <p className="text-3xl md:text-4xl font-black text-white break-all">
                  {formatCurrency(Math.abs(totalFinanceBalance))}
                </p>
              </div>
            </div>



            {/* معلومات إضافية */}
            <div className="pt-3 border-t border-slate-600 grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                <p className="text-slate-400">رصيد الصناديق</p>
                <p className="text-lg font-bold">{cratesBalance} صندوق</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                <p className="text-slate-400">إجمالي الوزن</p>
                <p className="text-lg font-bold">{formatNumber(totalNetWeight)} كجم</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                <p className="text-slate-400">عدد عمليات الميزان</p>
                <p className="text-lg font-bold">{weighbridgeCount}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                <p className="text-slate-400">إجمالي الصناديق</p>
                <p className="text-lg font-bold">
                  {totalCratesOut} خارج / {totalCratesReturned} عائد
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 print:hidden">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'all' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}
        >
          الكل
        </button>
        <button
          onClick={() => setActiveTab('weighbridge')}
          className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'weighbridge' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}
        >
          الموازين
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'finance' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}
        >
          المالية
        </button>
        <button
          onClick={() => setActiveTab('crates')}
          className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'crates' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}
        >
          الصناديق
        </button>
      </div>

      {/* Tables Area */}
      <div className={`space-y-8 ${printingTransaction ? 'hidden print:hidden' : ''}`}>
        {(activeTab === 'all' || activeTab === 'weighbridge') && (
          <section
            className={`space-y-4 ${activeTab !== 'all' && activeTab !== 'weighbridge' ? 'hidden print:block' : ''}`}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Scale size={20} className="text-emerald-600" />
                تعاملات الميزان
              </h3>
              <button
                onClick={() => setIsWeighbridgeModalOpen(true)}
                className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1 hover:bg-emerald-700 transition-colors print:hidden"
              >
                <Plus size={16} />
                إضافة ميزان
              </button>
            </div>
            <Table columns={weighbridgeColumns} data={customerWeighbridge} />
          </section>
        )}

        {(activeTab === 'all' || activeTab === 'finance') && (
          <section
            className={`space-y-4 ${activeTab !== 'all' && activeTab !== 'finance' ? 'hidden print:block' : ''}`}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Wallet size={20} className="text-emerald-600" />
                الحركة المالية
              </h3>
              <button
                onClick={() => setIsFinanceModalOpen(true)}
                className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1 hover:bg-emerald-700 transition-colors print:hidden"
              >
                <Plus size={16} />
                إضافة عملية
              </button>
            </div>
            <Table columns={financeColumns} data={customerFinance} />
          </section>
        )}

        {(activeTab === 'all' || activeTab === 'crates') && (
          <section
            className={`space-y-4 ${activeTab !== 'all' && activeTab !== 'crates' ? 'hidden print:block' : ''}`}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Package size={20} className="text-emerald-600" />
                حركة الصناديق
              </h3>
              <button
                onClick={() => setIsCrateModalOpen(true)}
                className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1 hover:bg-emerald-700 transition-colors print:hidden"
              >
                <Plus size={16} />
                إضافة صناديق
              </button>
            </div>
            <Table columns={cratesColumns} data={customerCrates} />
          </section>
        )}
      </div>

      {/* Single Transaction Print View */}
      {printingTransaction && (
        <div className="hidden print:block p-8 border-4 border-slate-800 rounded-3xl relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-slate-50 rounded-tr-full -z-10 opacity-50"></div>

          <div className="flex justify-between items-start mb-10 border-b-4 border-emerald-600 pb-8">
            <div className="text-right">
              <h1 className="text-5xl font-black text-emerald-800 mb-3 tracking-tight">
                {settings.company_name}
              </h1>
              <div className="space-y-1 text-slate-700 text-xl font-bold">
                <p>{settings.company_address}</p>
                <p>{settings.company_phone}</p>
              </div>
            </div>
            {settings.company_logo && (
              <div className="bg-white p-3 rounded-2xl shadow-md border-2 border-slate-100">
                <img
                  src={settings.company_logo}
                  alt="Logo"
                  className="h-32 w-auto object-contain"
                />
              </div>
            )}
          </div>

          <div className="text-center mb-12 relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t-2 border-slate-200"></div>
            </div>
            <h3 className="relative text-4xl font-black bg-white px-12 py-3 border-4 border-slate-800 rounded-2xl inline-block shadow-lg transform -rotate-1">
              {printingTransaction.type === 'weighbridge'
                ? 'إيصال ميزان'
                : printingTransaction.type === 'finance'
                  ? 'إيصال مالي'
                  : 'إيصال عهدة صناديق'}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-8 text-2xl mb-12">
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3 px-2">
              <span className="text-slate-500 font-bold">التاريخ:</span>
              <span className="font-black text-slate-900">
                {new Date(printingTransaction.data.date).toLocaleDateString('ar-EG')}
              </span>
            </div>
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3 px-2">
              <span className="text-slate-500 font-bold">العميل:</span>
              <span className="font-black text-slate-900">{customer.name}</span>
            </div>

            {printingTransaction.type === 'weighbridge' && (
              <>
                <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3 px-2">
                  <span className="text-slate-500 font-bold">الصنف:</span>
                  <span className="font-black text-slate-900">
                    {printingTransaction.data.date_type_name}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3 px-2">
                  <span className="text-slate-500 font-bold">الوزن القائم:</span>
                  <span className="font-black text-slate-900">
                    {printingTransaction.data.gross_weight} كجم
                  </span>
                </div>
                <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3 px-2">
                  <span className="text-slate-500 font-bold">عدد الصناديق:</span>
                  <span className="font-black text-slate-900">
                    {printingTransaction.data.crates_count}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b-2 border-emerald-100 pb-3 px-2 bg-emerald-50/30">
                  <span className="text-emerald-700 font-bold">الوزن الصافي:</span>
                  <span className="font-black text-emerald-800 text-3xl">
                    {formatNumber(printingTransaction.data.net_weight)} كجم
                  </span>
                </div>
                <div className="col-span-2 flex justify-between items-center bg-slate-900 text-white p-8 rounded-2xl mt-4 shadow-xl">
                  <span className="font-bold text-3xl">إجمالي القيمة:</span>
                  <span className="font-black text-5xl text-emerald-400">
                    {formatCurrency(printingTransaction.data.total)}
                  </span>
                </div>
              </>
            )}

            {printingTransaction.type === 'finance' && (
              <>
                <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3 px-2">
                  <span className="text-slate-500 font-bold">نوع العملية:</span>
                  <span className="font-black text-slate-900">
                    {printingTransaction.data.transaction_type}
                  </span>
                </div>
                {printingTransaction.data.amount_received > 0 && (
                  <div className="flex justify-between items-center border-b-2 border-emerald-100 pb-3 px-2 bg-emerald-50/30">
                    <span className="text-emerald-700 font-bold">له (إيراد من العميل):</span>
                    <span className="font-black text-emerald-800 text-4xl">
                      {formatCurrency(printingTransaction.data.amount_received)}
                    </span>
                  </div>
                )}
                {printingTransaction.data.amount_paid > 0 && (
                  <div className="flex justify-between items-center border-b-2 border-red-100 pb-3 px-2 bg-red-50/30">
                    <span className="text-red-700 font-bold">عليه (مدفوع للعميل):</span>
                    <span className="font-black text-red-800 text-4xl">
                      {formatCurrency(printingTransaction.data.amount_paid)}
                    </span>
                  </div>
                )}
                <div className="col-span-2 mt-6 p-8 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50">
                  <span className="text-slate-500 font-bold block mb-3 text-xl">
                    ملاحظات / بيان:
                  </span>
                  <p className="text-2xl font-bold text-slate-800 leading-relaxed">
                    {printingTransaction.data.notes || 'لا يوجد ملاحظات إضافية'}
                  </p>
                </div>
              </>
            )}

            {printingTransaction.type === 'crates' && (
              <>
                <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3 px-2">
                  <span className="text-slate-500 font-bold">نوع الصناديق:</span>
                  <span className="font-black text-slate-900">
                    {printingTransaction.data.crate_type_name}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3 px-2">
                  <span className="text-slate-500 font-bold">المستلم:</span>
                  <span className="font-black text-slate-900">
                    {printingTransaction.data.handler || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b-2 border-red-100 pb-3 px-2 bg-red-50/30">
                  <span className="text-red-700 font-bold">خارج (منصرف):</span>
                  <span className="font-black text-red-800 text-3xl">
                    {formatNumber(printingTransaction.data.crates_out)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b-2 border-emerald-100 pb-3 px-2 bg-emerald-50/30">
                  <span className="text-emerald-700 font-bold">عائد (مرتجع):</span>
                  <span className="font-black text-emerald-800 text-3xl">
                    {formatNumber(printingTransaction.data.crates_returned)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-20 mt-20 pt-12 border-t-2 border-slate-100">
            <div className="text-center">
              <p className="text-xl font-bold text-slate-400 mb-12">توقيع المستلم</p>
              <div className="w-full border-b-2 border-slate-300"></div>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-400 mb-12">توقيع المسؤول</p>
              <div className="w-full border-b-2 border-slate-300"></div>
            </div>
          </div>

          <div className="mt-12 text-center text-slate-400 font-bold italic">
            <p>تم استخراج هذا الإيصال آلياً بتاريخ {new Date().toLocaleString('ar-EG')}</p>
          </div>
        </div>
      )}

      {/* Print Footer */}
      <div className="hidden print:flex justify-between gap-8 mt-16 pt-10 border-t-4 border-emerald-600">
        <div className="text-center flex-1">
          <p className="text-lg font-bold text-slate-600 mb-16">توقيع العميل</p>
          <div className="w-full border-b-2 border-slate-400 pb-2"></div>
        </div>
        <div className="text-center flex-1">
          <p className="text-lg font-bold text-slate-600 mb-16">توقيت المراجعة</p>
          <div className="w-full border-b-2 border-slate-400 pb-2"></div>
        </div>
        <div className="text-center flex-1">
          <p className="text-lg font-bold text-slate-600 mb-16">توقيع المحاسب / المدير</p>
          <div className="w-full border-b-2 border-slate-400 pb-2"></div>
        </div>
      </div>

      <div className="hidden print:block mt-12 text-center">
        <p className="text-slate-500 font-bold italic text-lg">
          تم استخراج كشف الحساب آلياً من نظام إدارة مصانع التمور -{' '}
          {new Date().toLocaleString('ar-EG')}
        </p>
      </div>

      {/* Finance Modal */}
      {isFinanceModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 print:hidden">
          <Card className="w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">إضافة عملية مالية: {customer.name}</h3>
              <button
                onClick={() => setIsFinanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddFinance} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">التاريخ</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                    value={newFinance.date}
                    onChange={(e) => setNewFinance({ ...newFinance, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">نوع العملية</label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                    value={newFinance.transaction_type}
                    onChange={(e) =>
                      setNewFinance({ ...newFinance, transaction_type: e.target.value })
                    }
                  >
                    <option value="مقبوض">مقبوض من العميل</option>
                    <option value="مدفوع">مدفوع للعميل</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">المبلغ</label>
                <input
                  type="number"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xl font-bold"
                  value={
                    newFinance.transaction_type === 'مقبوض'
                      ? newFinance.amount_received
                      : newFinance.amount_paid
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    if (newFinance.transaction_type === 'مقبوض') {
                      setNewFinance({ ...newFinance, amount_received: val, amount_paid: 0 })
                    } else {
                      setNewFinance({ ...newFinance, amount_paid: val, amount_received: 0 })
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">ملاحظات</label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 h-24"
                  value={newFinance.notes}
                  onChange={(e) => setNewFinance({ ...newFinance, notes: e.target.value })}
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

      {/* Weighbridge Modal */}
      {isWeighbridgeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 print:hidden">
          <Card className="w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">إضافة عملية ميزان: {customer.name}</h3>
              <button
                onClick={() => setIsWeighbridgeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddWeighbridge} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">التاريخ</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                    value={newWeighbridge.date}
                    onChange={(e) => setNewWeighbridge({ ...newWeighbridge, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">نوع الصنف</label>
                  <select
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                    value={newWeighbridge.date_type_id}
                    onChange={(e) =>
                      setNewWeighbridge({ ...newWeighbridge, date_type_id: e.target.value })
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">
                    الوزن القائم (كجم)
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-bold"
                    value={newWeighbridge.gross_weight}
                    onChange={(e) => {
                      const gross = parseFloat(e.target.value) || 0
                      const net =
                        gross - newWeighbridge.crates_count * parseFloat(settings.crate_weight)
                      const total =
                        (net / parseFloat(settings.qantar_weight)) * newWeighbridge.price_per_qantar
                      setNewWeighbridge({
                        ...newWeighbridge,
                        gross_weight: gross,
                        net_weight: Number(net.toFixed(2)),
                        total: Number(total.toFixed(2))
                      })
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">
                    عدد الصناديق
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-bold"
                    value={newWeighbridge.crates_count}
                    onChange={(e) => {
                      const count = parseInt(e.target.value) || 0
                      const net =
                        newWeighbridge.gross_weight - count * parseFloat(settings.crate_weight)
                      const total =
                        (net / parseFloat(settings.qantar_weight)) * newWeighbridge.price_per_qantar
                      setNewWeighbridge({
                        ...newWeighbridge,
                        crates_count: count,
                        net_weight: Number(net.toFixed(2)),
                        total: Number(total.toFixed(2))
                      })
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">سعر القنطار</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-emerald-600"
                    value={newWeighbridge.price_per_qantar}
                    onChange={(e) => {
                      const price = parseFloat(e.target.value) || 0
                      const total =
                        (newWeighbridge.net_weight / parseFloat(settings.qantar_weight)) * price
                      setNewWeighbridge({
                        ...newWeighbridge,
                        price_per_qantar: price,
                        total: Number(total.toFixed(2))
                      })
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">
                    الوزن الصافي
                  </label>
                  <div className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-black text-emerald-700">
                    {formatNumber(newWeighbridge.net_weight)} كجم
                  </div>
                </div>
              </div>
              <div className="bg-emerald-50 p-4 rounded-lg flex justify-between items-center">
                <span className="font-bold text-emerald-800">إجمالي المبلغ:</span>
                <span className="text-2xl font-black text-emerald-700">
                  {formatCurrency(newWeighbridge.total)}
                </span>
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                <Scale size={20} />
                حفظ عملية الميزان
              </button>
            </form>
          </Card>
        </div>
      )}

      {/* Crate Modal */}
      {isCrateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 print:hidden">
          <Card className="w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">إضافة حركة صناديق: {customer.name}</h3>
              <button
                onClick={() => setIsCrateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddCrate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">التاريخ</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                    value={newCrate.date}
                    onChange={(e) => setNewCrate({ ...newCrate, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">
                    نوع الصناديق
                  </label>
                  <select
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                    value={newCrate.crate_type_id}
                    onChange={(e) => setNewCrate({ ...newCrate, crate_type_id: e.target.value })}
                  >
                    <option value="">اختر النوع</option>
                    {crateTypes.map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        {ct.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1 text-red-600">
                    خارج (من المصنع)
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-bold"
                    value={newCrate.crates_out}
                    onChange={(e) =>
                      setNewCrate({ ...newCrate, crates_out: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1 text-emerald-600">
                    عائد (إلى المصنع)
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-bold"
                    value={newCrate.crates_returned}
                    onChange={(e) =>
                      setNewCrate({ ...newCrate, crates_returned: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">المستلم</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
                  value={newCrate.handler}
                  onChange={(e) => setNewCrate({ ...newCrate, handler: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">ملاحظات</label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 h-24"
                  value={newCrate.notes}
                  onChange={(e) => setNewCrate({ ...newCrate, notes: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                <Package size={20} />
                حفظ حركة الصناديق
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
