import { useEffect } from 'react'
import { Card } from './ui/Card'
import {
  Users,
  Scale,
  Package,
  Wallet,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { useCustomerStore } from '../store/useCustomerStore'
import { useWeighbridgeStore } from '../store/useWeighbridgeStore'
import { useCrateStore } from '../store/useCrateStore'
import { useFinanceStore } from '../store/useFinanceStore'
import { formatCurrency, formatNumber } from '../utils/format'

const RECENT_ITEMS_LIMIT = 5

export default function Dashboard() {
  const { customers, fetchCustomers } = useCustomerStore()
  const { transactions: weighbridge, fetchTransactions: fetchWeighbridge } = useWeighbridgeStore()
  const { summary: crates, transactions: crateTransactions, fetchCrates } = useCrateStore()
  const { transactions: finance, fetchFinance } = useFinanceStore()

  useEffect(() => {
    fetchCustomers()
    fetchWeighbridge()
    fetchCrates()
    fetchFinance()
  }, [])

  // Helper to calculate trend percentage
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { trend: '0%', trendUp: true }
    const diff = ((current - previous) / previous) * 100
    return {
      trend: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`,
      trendUp: diff >= 0
    }
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  // 1. Customers Trend
  const currentCustomersCount = customers.filter(
    (c) => new Date(c.created_at) >= thirtyDaysAgo
  ).length
  const previousCustomersCount = customers.filter((c) => {
    const d = new Date(c.created_at)
    return d >= sixtyDaysAgo && d < thirtyDaysAgo
  }).length
  const customerTrend = calculateTrend(currentCustomersCount, previousCustomersCount)

  // 2. Weight Trend
  const currentWeightSum = weighbridge
    .filter((t) => new Date(t.date) >= thirtyDaysAgo)
    .reduce((acc, curr) => acc + curr.net_weight, 0)
  const previousWeightSum = weighbridge
    .filter((t) => {
      const d = new Date(t.date)
      return d >= sixtyDaysAgo && d < thirtyDaysAgo
    })
    .reduce((acc, curr) => acc + curr.net_weight, 0)
  const weightTrend = calculateTrend(currentWeightSum, previousWeightSum)

  // 3. Crates Trend (Balance change)
  const currentCrateBalance = crateTransactions
    .filter((t) => new Date(t.date) >= thirtyDaysAgo)
    .reduce((acc, curr) => acc + (curr.crates_out - curr.crates_returned), 0)
  const previousCrateBalance = crateTransactions
    .filter((t) => {
      const d = new Date(t.date)
      return d >= sixtyDaysAgo && d < thirtyDaysAgo
    })
    .reduce((acc, curr) => acc + (curr.crates_out - curr.crates_returned), 0)
  const crateTrend = calculateTrend(currentCrateBalance, previousCrateBalance)

  // 4. Finance Trend (Net balance change)
  const currentFinanceNet = finance
    .filter((t) => new Date(t.date) >= thirtyDaysAgo)
    .reduce((acc, curr) => acc + (curr.amount_received - curr.amount_paid), 0)
  const previousFinanceNet = finance
    .filter((t) => {
      const d = new Date(t.date)
      return d >= sixtyDaysAgo && d < thirtyDaysAgo
    })
    .reduce((acc, curr) => acc + (curr.amount_received - curr.amount_paid), 0)
  const financeTrend = calculateTrend(currentFinanceNet, previousFinanceNet)

  const totalCrates = crates.reduce((acc, curr) => acc + curr.balance, 0)
  const totalBalance = finance.reduce(
    (acc, curr) => acc + (curr.amount_received - curr.amount_paid),
    0
  )
  const totalWeight = weighbridge.reduce((acc, curr) => acc + curr.net_weight, 0)

  const stats = [
    {
      title: 'إجمالي العملاء',
      value: customers.length,
      icon: <Users className="text-blue-600" size={24} />,
      trend: customerTrend.trend,
      trendUp: customerTrend.trendUp,
      color: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: 'إجمالي التوريدات (كجم)',
      value: formatNumber(totalWeight),
      icon: <Scale className="text-emerald-600" size={24} />,
      trend: weightTrend.trend,
      trendUp: weightTrend.trendUp,
      color: 'bg-emerald-50 dark:bg-emerald-900/20'
    },
    {
      title: 'رصيد الصناديق',
      value: totalCrates,
      icon: <Package className="text-orange-600" size={24} />,
      trend: crateTrend.trend,
      trendUp: crateTrend.trendUp,
      color: 'bg-orange-50 dark:bg-orange-900/20'
    },
    {
      title: 'الرصيد المالي',
      value: formatCurrency(totalBalance),
      icon: <Wallet className="text-purple-600" size={24} />,
      trend: financeTrend.trend,
      trendUp: financeTrend.trendUp,
      color: 'bg-purple-50 dark:bg-purple-900/20'
    }
  ]

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2">لوحة التحكم</h1>
          <p className="text-slate-500 dark:text-slate-400">
            مرحباً بك مجدداً، إليك ملخص نشاط المصنع اليوم
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <Calendar className="text-emerald-600" size={20} />
          <span className="font-bold">
            {new Date().toLocaleDateString('ar-EG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="group hover:scale-[1.02] transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className={`${stat.color} p-3 rounded-2xl`}>{stat.icon}</div>
              <div
                className={`flex items-center gap-1 text-sm font-bold ${stat.trendUp ? 'text-emerald-600' : 'text-rose-600'}`}
              >
                {stat.trend}
                {stat.trendUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              </div>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-bold mb-1">{stat.title}</h3>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black flex items-center gap-2">
              <TrendingUp className="text-emerald-600" size={24} />
              أحدث التوريدات
            </h3>
            <button className="text-emerald-600 font-bold hover:underline text-sm">عرض الكل</button>
          </div>
          <div className="space-y-4">
            {weighbridge.slice(0, RECENT_ITEMS_LIMIT).map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-white dark:bg-slate-700 p-2 rounded-lg shadow-sm">
                    <Scale size={20} className="text-slate-600 dark:text-slate-300" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{t.customer_name}</p>
                    <p className="text-xs text-slate-500">{t.date}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-black text-emerald-600">{formatNumber(t.net_weight)} كجم</p>
                  <p className="text-xs font-bold text-slate-400">{t.date_type_name}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black flex items-center gap-2">
              <Wallet className="text-purple-600" size={24} />
              آخر العمليات المالية
            </h3>
            <button className="text-purple-600 font-bold hover:underline text-sm">عرض الكل</button>
          </div>
          <div className="space-y-4">
            {finance.slice(0, RECENT_ITEMS_LIMIT).map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-lg shadow-sm ${t.amount_received > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}
                  >
                    <Wallet
                      size={20}
                      className={t.amount_received > 0 ? 'text-emerald-600' : 'text-rose-600'}
                    />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{t.customer_name}</p>
                    <p className="text-xs text-slate-500">{t.date}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p
                    className={`font-black ${t.amount_received > 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {t.amount_received > 0
                      ? `+${formatCurrency(t.amount_received)}`
                      : `-${formatCurrency(t.amount_paid)}`}
                  </p>
                  <p className="text-xs font-bold text-slate-400">{t.transaction_type}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
