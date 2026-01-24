import { create } from 'zustand'

interface AppState {
  version: string
  isSidebarOpen: boolean
  toggleSidebar: () => void
  setVersion: (version: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  version: '2.0.0',
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setVersion: (version) => set({ version }),
}))
