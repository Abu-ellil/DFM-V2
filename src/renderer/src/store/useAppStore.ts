import { create } from 'zustand'

interface AppState {
  version: string
  isSidebarOpen: boolean
  activeTab: string
  selectedCustomerId: number | null
  toggleSidebar: () => void
  setVersion: (version: string) => void
  setActiveTab: (tab: string) => void
  setSelectedCustomerId: (id: number | null) => void
  navigateToCustomer: (id: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  version: '2.0.0',
  isSidebarOpen: true,
  activeTab: 'dashboard',
  selectedCustomerId: null,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setVersion: (version) => set({ version }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedCustomerId: (selectedCustomerId) => set({ selectedCustomerId }),
  navigateToCustomer: (id) => set({ activeTab: 'customer-details', selectedCustomerId: id })
}))
