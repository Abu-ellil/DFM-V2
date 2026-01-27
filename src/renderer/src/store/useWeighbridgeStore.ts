/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand'

interface Transaction {
  id: number
  date: string
  customer_id: number
  customer_name: string
  date_type_id: number
  date_type_name: string
  gross_weight: number
  net_weight: number
  price_per_qantar: number
  total: number
  crates_count: number
  commission: number
  notes: string
  created_at: string
}

interface WeighbridgeStore {
  transactions: Transaction[]
  isLoading: boolean
  fetchTransactions: () => Promise<void>
  addTransaction: (data: any) => Promise<{ success: boolean; message?: string }>
}

export const useWeighbridgeStore = create<WeighbridgeStore>((set) => ({
  transactions: [],
  isLoading: false,
  fetchTransactions: async () => {
    set({ isLoading: true })
    try {
      const transactions = await window.api.weighbridge.getAll()
      set({ transactions, isLoading: false })
    } catch (error) {
      console.error('Fetch transactions error:', error)
      set({ isLoading: false })
    }
  },
  addTransaction: async (data) => {
    try {
      const result = await window.api.weighbridge.create(data)
      if (result.success) {
        const transactions = await window.api.weighbridge.getAll()
        set({ transactions })

        // Trigger customer account refresh - Import dynamically to avoid circular dependency
        const { useCustomerAccountStore } = require('./useCustomerAccountStore')
        useCustomerAccountStore.getState().fetchAllSummaries()
      }
      return result
    } catch {
      return { success: false, message: 'خطأ في الاتصال بالقاعدة' }
    }
  }
}))
