import { create } from 'zustand'

interface Customer {
  id: number
  name: string
  type: string
  phone: string
  created_at: string
}

interface CustomerStore {
  customers: Customer[]
  isLoading: boolean
  fetchCustomers: () => Promise<void>
  addCustomer: (
    customer: Omit<Customer, 'id' | 'created_at'>
  ) => Promise<{ success: boolean; message?: string }>
  updateCustomer: (
    id: number,
    customer: Omit<Customer, 'id' | 'created_at'>
  ) => Promise<{ success: boolean; message?: string }>
  deleteCustomer: (id: number) => Promise<{ success: boolean; message?: string }>
}

export const useCustomerStore = create<CustomerStore>((set) => ({
  customers: [],
  isLoading: false,
  fetchCustomers: async () => {
    set({ isLoading: true })
    try {
      const customers = await window.api.customers.getAll()
      set({ customers, isLoading: false })
    } catch (error) {
      console.error('Fetch customers error:', error)
      set({ isLoading: false })
    }
  },
  addCustomer: async (customer) => {
    try {
      const result = await window.api.customers.create(customer)
      if (result.success) {
        const customers = await window.api.customers.getAll()
        set({ customers })
      }
      return result
    } catch (error) {
      console.error('Add customer error:', error)
      return { success: false, message: 'خطأ في الاتصال بالقاعدة - يرجى المحاولة مرة أخرى' }
    }
  },
  updateCustomer: async (id, customer) => {
    try {
      const result = await window.api.customers.update(id, customer)
      if (result.success) {
        const customers = await window.api.customers.getAll()
        set({ customers })
      }
      return result
    } catch (error) {
      console.error('Update customer error:', error)
      return { success: false, message: 'خطأ في الاتصال بالقاعدة - يرجى المحاولة مرة أخرى' }
    }
  },
  deleteCustomer: async (id) => {
    try {
      const result = await window.api.customers.delete(id)
      if (result.success) {
        const customers = await window.api.customers.getAll()
        set({ customers })
      }
      return result
    } catch (error) {
      console.error('Delete customer error:', error)
      return { success: false, message: 'خطأ في الاتصال بالقاعدة - يرجى المحاولة مرة أخرى' }
    }
  }
}))
