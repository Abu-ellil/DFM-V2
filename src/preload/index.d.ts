import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      auth: {
        login: (credentials: any) => Promise<any>
        changePassword: (data: any) => Promise<{ success: boolean; message: string }>
      },
      customers: {
        getAll: () => Promise<any[]>
        create: (customer: any) => Promise<{ success: boolean; message?: string }>
        update: (id: number, customer: any) => Promise<{ success: boolean; message?: string }>
        delete: (id: number) => Promise<{ success: boolean; message?: string }>
      },
      dateTypes: {
        getAll: () => Promise<any[]>
        create: (name: string) => Promise<{ success: boolean; message?: string }>
        delete: (id: number) => Promise<{ success: boolean; message?: string }>
      },
      crateTypes: {
        getAll: () => Promise<any[]>
        create: (data: { name: string; weight: number }) => Promise<{ success: boolean; message?: string }>
        delete: (id: number) => Promise<{ success: boolean; message?: string }>
      },
      supervisors: {
        getAll: () => Promise<any[]>
        create: (name: string) => Promise<{ success: boolean; message?: string }>
        delete: (id: number) => Promise<{ success: boolean; message?: string }>
      },
      weighbridge: {
        getAll: () => Promise<any[]>
        create: (data: any) => Promise<{ success: boolean; message?: string }>
      },
      crates: {
        getAll: () => Promise<any[]>
        getSummary: () => Promise<any[]>
        create: (data: any) => Promise<{ success: boolean; message?: string }>
        update: (id: number, data: any) => Promise<{ success: boolean; message?: string }>
        delete: (id: number) => Promise<{ success: boolean; message?: string }>
      },
      finance: {
        getAll: () => Promise<any[]>
        getSummary: () => Promise<any[]>
        create: (data: any) => Promise<{ success: boolean; message?: string }>
        update: (id: number, data: any) => Promise<{ success: boolean; message?: string }>
        delete: (id: number) => Promise<{ success: boolean; message?: string }>
      },
      settings: {
        getAll: () => Promise<Record<string, string>>
        update: (key: string, value: string) => Promise<{ success: boolean }>
        sync: () => Promise<{ success: boolean; message?: string }>
        importDb: () => Promise<{ success: boolean; message?: string }>
        importExcel: () => Promise<{ success: boolean; message?: string }>
        deleteAllData: () => Promise<{ success: boolean; message: string }>
      },
      reports: {
        exportExcel: (data: { title: string; columns: any[]; data: any[] }) => Promise<{ success: boolean; message?: string }>
      },
      telegram: {
        send: (data: { token: string; chatId: string; message: string }) => Promise<{ success: boolean }>
      },
      license: {
        getInfo: () => Promise<any>
        getMachineId: () => Promise<{ success: boolean; machineId: string; message?: string }>
        activate: (data: { licenseKey: string; factoryName?: string }) => Promise<{ success: boolean; message: string }>
        check: () => Promise<boolean>
        openTrialRequest: () => Promise<{ success: boolean }>
      },
      duplicates: {
        getAll: () => Promise<any>
        delete: (data: { table: string; id: number }) => Promise<{ success: boolean; message?: string }>
        autoClean: () => Promise<{ success: boolean; count?: number; message?: string }>
      }
    }
  }
}
