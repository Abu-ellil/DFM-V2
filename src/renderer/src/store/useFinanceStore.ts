/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand'

interface FinanceTransaction {
  id: number
  date: string
  customer_id: number
  customer_name: string
  transaction_type: string
  amount_paid: number
  amount_received: number
  notes: string
  created_at: string
}

interface FinanceSummary {
  customer_id: number
  customer_name: string
  total_paid: number
  total_received: number
  balance: number
}

interface FinanceStore {
  transactions: FinanceTransaction[]
  summary: FinanceSummary[]
  isLoading: boolean
  fetchFinance: () => Promise<void>
  addTransaction: (data: any) => Promise<{ success: boolean; message?: string }>
  updateTransaction: (id: number, data: any) => Promise<{ success: boolean; message?: string }>
  deleteTransaction: (id: number) => Promise<{ success: boolean; message?: string }>
}

export const useFinanceStore = create<FinanceStore>((set) => ({
  transactions: [],
  summary: [],
  isLoading: false,
  fetchFinance: async () => {
    set({ isLoading: true })
    try {
      const [transactions, summary] = await Promise.all([
        window.api.finance.getAll(),
        window.api.finance.getSummary()
      ])
      set({ transactions, summary, isLoading: false })
    } catch (error) {
      console.error('Fetch finance error:', error)
      set({ isLoading: false })
    }
  },
  addTransaction: async (data) => {
    try {
      const result = await window.api.finance.create(data)
      if (result.success) {
        const [transactions, summary] = await Promise.all([
          window.api.finance.getAll(),
          window.api.finance.getSummary()
        ])
        set({ transactions, summary })

        // Trigger customer account refresh
        const { useCustomerAccountStore } = require('./useCustomerAccountStore')
        useCustomerAccountStore.getState().fetchAllSummaries()
      }
      return result
    } catch {
      return { success: false, message: 'خطأ في الاتصال بالقاعدة' }
    }
  },
  updateTransaction: async (id, data) => {
    try {
      const result = await window.api.finance.update(id, data)
      if (result.success) {
        const [transactions, summary] = await Promise.all([
          window.api.finance.getAll(),
          window.api.finance.getSummary()
        ])
        set({ transactions, summary })

        // Trigger customer account refresh
        const { useCustomerAccountStore } = require('./useCustomerAccountStore')
        useCustomerAccountStore.getState().fetchAllSummaries()
      }
      return result
    } catch {
      return { success: false, message: 'خطأ في الاتصال بالقاعدة' }
    }
  },
  deleteTransaction: async (id) => {
    try {
      const result = await window.api.finance.delete(id)
      if (result.success) {
        const [transactions, summary] = await Promise.all([
          window.api.finance.getAll(),
          window.api.finance.getSummary()
        ])
        set({ transactions, summary })

        // Trigger customer account refresh
        const { useCustomerAccountStore } = require('./useCustomerAccountStore')
        useCustomerAccountStore.getState().fetchAllSummaries()
      }
      return result
    } catch {
      return { success: false, message: 'خطأ في الاتصال بالقاعدة' }
    }
  }
}))
