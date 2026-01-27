/* eslint-disable @typescript-eslint/no-explicit-any */
// Telegram User Types
export interface TelegramUser {
  id: number
  telegram_id: number
  username?: string
  first_name?: string
  last_name?: string
  phone?: string
  user_id?: number
  role?: string
  status: 'pending' | 'active' | 'inactive' | 'suspended'
  registration_date: string
  last_interaction: string
}

export interface TelegramUserWithRole extends TelegramUser {
  role?: string
}

// Registration Types
export interface RegistrationRequest {
  id: number
  telegram_id: number
  requested_role?: 'owner' | 'manager' | 'worker'
  full_name?: string
  phone?: string
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  reviewed_by?: number
  reviewed_at?: string
}

export interface RegistrationSession {
  step: number
  data: Partial<{
    full_name: string
    phone: string
    requested_role: 'owner' | 'manager' | 'worker'
    reason: string
  }>
}

// Role Types
export type UserRole = 'owner' | 'manager' | 'worker'

export interface UserRoleAssignment {
  id: number
  user_id: number
  role: UserRole
  assigned_by?: number
  assigned_at: string
  notes?: string
}

// Permission Types
export type Permission =
  | 'view_reports'
  | 'view_finance'
  | 'manage_users'
  | 'manage_settings'
  | 'send_notifications'
  | 'approve_registrations'
  | 'view_operations'
  | 'manage_tasks'
  | 'view_own_tasks'
  | 'update_task_status'

export interface RolePermission {
  id: number
  role: UserRole
  permission: Permission
  granted: number
}

// Notification Types
export type NotificationType = 'report' | 'alert' | 'task' | 'registration' | 'system'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Notification {
  id: number
  telegram_id: number
  notification_type: NotificationType
  title?: string
  message: string
  priority: NotificationPriority
  sent: number
  created_at: string
  sent_at?: string
  error_message?: string
}

export interface NotificationPreference {
  id: number
  telegram_id: number
  receive_reports: number
  receive_alerts: number
  receive_tasks: number
  quiet_hours_start?: string // Format: "HH:MM"
  quiet_hours_end?: string // Format: "HH:MM"
}

// Bot Command Types
export interface BotCommand {
  command: string
  description: string
  handler: (msg: any) => void | Promise<void>
}

export interface MiddlewareContext {
  user?: TelegramUser
  permission?: Permission
}

// Rate Limiting
export interface RateLimitEntry {
  telegram_id: number
  requests: number
  window_start: number
}

// Registration Flow States
export type RegistrationStep = 1 | 2 | 3 | 4 | 5

export const RegistrationSteps = {
  1: 'full_name',
  2: 'phone',
  3: 'requested_role',
  4: 'reason',
  5: 'confirm'
} as const

// API Request/Response Types
export interface TelegramApiRequest {
  telegram_id?: number
  status?: string
  role?: UserRole
  limit?: number
  offset?: number
}

export interface TelegramApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// Trigger Types
export interface NotificationTrigger {
  type: 'weighbridge' | 'finance' | 'registration' | 'task' | 'system'
  data: any
  targetRoles: UserRole[]
}
