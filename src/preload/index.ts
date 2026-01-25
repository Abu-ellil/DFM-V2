/* eslint-disable @typescript-eslint/no-explicit-any */
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  auth: {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    changePassword: (data) => ipcRenderer.invoke('auth:changePassword', data)
  },
  customers: {
    getAll: () => ipcRenderer.invoke('customers:getAll'),
    create: (customer) => ipcRenderer.invoke('customers:create', customer),
    update: (id, customer) => ipcRenderer.invoke('customers:update', id, customer),
    delete: (id) => ipcRenderer.invoke('customers:delete', id)
  },
  dateTypes: {
    getAll: () => ipcRenderer.invoke('dateTypes:getAll'),
    create: (name) => ipcRenderer.invoke('dateTypes:create', name),
    delete: (id) => ipcRenderer.invoke('dateTypes:delete', id)
  },
  crateTypes: {
    getAll: () => ipcRenderer.invoke('crateTypes:getAll'),
    create: (data) => ipcRenderer.invoke('crateTypes:create', data),
    delete: (id) => ipcRenderer.invoke('crateTypes:delete', id)
  },
  supervisors: {
    getAll: () => ipcRenderer.invoke('supervisors:getAll'),
    create: (name) => ipcRenderer.invoke('supervisors:create', name),
    delete: (id) => ipcRenderer.invoke('supervisors:delete', id)
  },
  weighbridge: {
    getAll: () => ipcRenderer.invoke('weighbridge:getAll'),
    create: (data) => ipcRenderer.invoke('weighbridge:create', data)
  },
  crates: {
    getAll: () => ipcRenderer.invoke('crates:getAll'),
    getSummary: () => ipcRenderer.invoke('crates:getSummary'),
    create: (data) => ipcRenderer.invoke('crates:create', data),
    update: (id, data) => ipcRenderer.invoke('crates:update', id, data),
    delete: (id) => ipcRenderer.invoke('crates:delete', id)
  },
  finance: {
    getAll: () => ipcRenderer.invoke('finance:getAll'),
    getSummary: () => ipcRenderer.invoke('finance:getSummary'),
    create: (data) => ipcRenderer.invoke('finance:create', data),
    update: (id, data) => ipcRenderer.invoke('finance:update', id, data),
    delete: (id) => ipcRenderer.invoke('finance:delete', id)
  },
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    update: (key, value) => ipcRenderer.invoke('settings:update', key, value),
    sync: () => ipcRenderer.invoke('settings:sync'),
    importDb: () => ipcRenderer.invoke('settings:importDb'),
    importExcel: () => ipcRenderer.invoke('settings:importExcel'),
    deleteAllData: () => ipcRenderer.invoke('settings:deleteAllData')
  },
  reports: {
    exportExcel: (data: { title: string; columns: any[]; data: any[] }) =>
      ipcRenderer.invoke('reports:exportExcel', data)
  },
  telegram: {
    send: (data) => ipcRenderer.invoke('telegram:send', data),
    sendReport: () => ipcRenderer.invoke('telegram:sendReport'),
    // Bot management
    startBot: () => ipcRenderer.invoke('telegram:startBot'),
    stopBot: () => ipcRenderer.invoke('telegram:stopBot'),
    restartBot: () => ipcRenderer.invoke('telegram:restartBot'),
    testConnection: (token?: string) => ipcRenderer.invoke('telegram:testConnection', token),
    getStats: () => ipcRenderer.invoke('telegram:getStats'),
    // User management
    getUsers: (filters?: any) => ipcRenderer.invoke('telegram:getUsers', filters),
    updateUser: (telegramId: number, data: any) =>
      ipcRenderer.invoke('telegram:updateUser', telegramId, data),
    deleteUser: (telegramId: number) => ipcRenderer.invoke('telegram:deleteUser', telegramId),
    // Registration management
    getRegistrations: (filters?: any) => ipcRenderer.invoke('telegram:getRegistrations', filters),
    approveRegistration: (registrationId: number, role: string, reviewerUserId: number) =>
      ipcRenderer.invoke('telegram:approveRegistration', registrationId, role, reviewerUserId),
    rejectRegistration: (registrationId: number, reason?: string, reviewerUserId?: number) =>
      ipcRenderer.invoke('telegram:rejectRegistration', registrationId, reason, reviewerUserId)
  },
  license: {
    getInfo: () => ipcRenderer.invoke('license:getInfo'),
    getMachineId: () => ipcRenderer.invoke('license:getMachineId'),
    activate: (data) => ipcRenderer.invoke('license:activate', data),
    check: () => ipcRenderer.invoke('license:check'),
    openTrialRequest: () => ipcRenderer.invoke('license:openTrialRequest')
  },
  duplicates: {
    getAll: () => ipcRenderer.invoke('duplicates:getAll'),
    delete: (data) => ipcRenderer.invoke('duplicates:delete', data),
    autoClean: () => ipcRenderer.invoke('duplicates:autoClean')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
