/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand'

interface CustomerAccountSummary {
  customer_id: number
  customer_name: string
  type: string
  phone: string
  total_weighbridge_debt: number
  weighbridge_transaction_count: number
  total_net_weight: number
  total_paid: number
  total_received: number
  total_crates_out: number
  total_crates_returned: number
  net_balance: number
  crate_balance: number
}

interface CustomerAccountStore {
  summaries: CustomerAccountSummary[]
  selectedCustomer: CustomerAccountSummary | null
  recentTransactions: any[]
  isLoading: boolean
  error: string | null
  lastUpdated: number | null

  fetchAllSummaries: () => Promise<void>
  fetchCustomerSummary: (customerId: number) => Promise<void>
  fetchRecentTransactions: (customerId: number, limit?: number) => Promise<void>
  refreshSelectedCustomer: () => Promise<void>
  clearSelectedCustomer: () => void
}

export const useCustomerAccountStore = create<CustomerAccountStore>((set, get) => ({
  summaries: [],
  selectedCustomer: null,
  recentTransactions: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  fetchAllSummaries: async () => {
    set({ isLoading: true, error: null })
    try {
      const summaries = await window.api.customerAccounts.getSummary()
      set({ summaries, isLoading: false, lastUpdated: Date.now() })
    } catch (error) {
      console.error('Fetch summaries error:', error)
      set({ error: 'خطأ في جلب ملخصات الحسابات', isLoading: false })
    }
  },

  fetchCustomerSummary: async (customerId: number) => {
    set({ isLoading: true, error: null })
    try {
      const summary = await window.api.customerAccounts.getSummary(customerId)
      set({ selectedCustomer: summary, isLoading: false })
    } catch (error) {
      console.error('Fetch customer summary error:', error)
      set({ error: 'خطأ في جلب ملخص الحساب', isLoading: false })
    }
  },

  fetchRecentTransactions: async (customerId: number, limit: number = 20) => {
    try {
      const transactions = await window.api.customerAccounts.getRecentTransactions(
        customerId,
        limit
      )
      set({ recentTransactions: transactions })
    } catch (error) {
      console.error('Fetch recent transactions error:', error)
    }
  },

  refreshSelectedCustomer: async () => {
    const { selectedCustomer } = get()
    if (selectedCustomer) {
      await get().fetchCustomerSummary(selectedCustomer.customer_id)
      await get().fetchRecentTransactions(selectedCustomer.customer_id)
    }
  },

  clearSelectedCustomer: () => {
    set({ selectedCustomer: null, recentTransactions: [] })
  }
}))
