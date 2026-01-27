/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand'

interface CrateTransaction {
  id: number
  date: string
  customer_id: number
  customer_name: string
  crate_type_id: number
  crate_type_name: string
  crates_out: number
  crates_returned: number
  handler: string
  notes: string
  created_at: string
}

interface CrateSummary {
  customer_id: number
  customer_name: string
  total_out: number
  total_returned: number
  balance: number
}

interface CrateStore {
  transactions: CrateTransaction[]
  summary: CrateSummary[]
  isLoading: boolean
  fetchCrates: () => Promise<void>
  addTransaction: (data: any) => Promise<{ success: boolean; message?: string }>
  updateTransaction: (id: number, data: any) => Promise<{ success: boolean; message?: string }>
  deleteTransaction: (id: number) => Promise<{ success: boolean; message?: string }>
}

export const useCrateStore = create<CrateStore>((set) => ({
  transactions: [],
  summary: [],
  isLoading: false,
  fetchCrates: async () => {
    set({ isLoading: true })
    try {
      const [transactions, summary] = await Promise.all([
        window.api.crates.getAll(),
        window.api.crates.getSummary()
      ])
      set({ transactions, summary, isLoading: false })
    } catch (error) {
      console.error('Fetch crates error:', error)
      set({ isLoading: false })
    }
  },
  addTransaction: async (data) => {
    try {
      const result = await window.api.crates.create(data)
      if (result.success) {
        const [transactions, summary] = await Promise.all([
          window.api.crates.getAll(),
          window.api.crates.getSummary()
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
      const result = await window.api.crates.update(id, data)
      if (result.success) {
        const [transactions, summary] = await Promise.all([
          window.api.crates.getAll(),
          window.api.crates.getSummary()
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
      const result = await window.api.crates.delete(id)
      if (result.success) {
        const [transactions, summary] = await Promise.all([
          window.api.crates.getAll(),
          window.api.crates.getSummary()
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
