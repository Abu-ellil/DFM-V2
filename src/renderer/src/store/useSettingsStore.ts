import { create } from 'zustand'

interface Settings {
  crate_weight: string
  qantar_weight: string
  company_name: string
  company_address: string
  company_phone: string
  company_logo: string
  telegram_token: string
  telegram_chat_id: string
  telegram_bot_enabled: string
}

interface SettingsStore {
  settings: Settings
  isLoading: boolean
  fetchSettings: () => Promise<void>
  updateSetting: (key: keyof Settings, value: string) => Promise<{ success: boolean }>
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: {
    crate_weight: '2',
    qantar_weight: '45',
    company_name: '',
    company_address: '',
    company_phone: '',
    company_logo: '',
    telegram_token: '',
    telegram_chat_id: '',
    telegram_bot_enabled: '0'
  },
  isLoading: false,
  fetchSettings: async () => {
    set({ isLoading: true })
    try {
      const settings = await window.api.settings.getAll()
      set({ settings: { ...get().settings, ...settings }, isLoading: false })
    } catch (error) {
      console.error('Fetch settings error:', error)
      set({ isLoading: false })
    }
  },
  updateSetting: async (key, value) => {
    try {
      const result = await window.api.settings.update(key, value)
      if (result.success) {
        set((state) => ({
          settings: { ...state.settings, [key]: value }
        }))
      }
      return result
    } catch {
      return { success: false }
    }
  }
}))
