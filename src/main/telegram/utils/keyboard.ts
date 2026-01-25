/* eslint-disable @typescript-eslint/no-explicit-any */
import { InlineKeyboard } from 'node-telegram-bot-api'

export const Keyboards = {
  // Main menu
  mainMenu: (hasRole: boolean = false): InlineKeyboard => {
    const keyboard = [
      [{ text: '👤 ملفي', callback_data: 'profile' }],
      [{ text: '📚 المساعدة', callback_data: 'help' }],
      [{ text: '📊 حالة النظام', callback_data: 'status' }]
    ]

    if (!hasRole) {
      keyboard.unshift([{ text: '✍️ تسجيل', callback_data: 'register_start' }])
    }

    return keyboard
  },

  // Role selection for registration
  roleSelection: (): InlineKeyboard => {
    return [
      [
        { text: '👔 مدير', callback_data: 'role_manager' },
        { text: '👷 عامل', callback_data: 'role_worker' }
      ],
      [{ text: '🔙 إلغاء', callback_data: 'register_cancel' }]
    ]
  },

  // Confirmation
  confirmRegistration: (): InlineKeyboard => {
    return [
      [
        { text: '✅ تأكيد', callback_data: 'register_confirm' },
        { text: '❌ إلغاء', callback_data: 'register_cancel' }
      ]
    ]
  },

  // Admin menu
  adminMenu: (): InlineKeyboard => {
    return [
      [{ text: '👥 المستخدمون', callback_data: 'admin_users' }],
      [{ text: '📝 طلبات التسجيل', callback_data: 'admin_registrations' }],
      [{ text: '📊 الإحصائيات', callback_data: 'admin_stats' }],
      [{ text: '🔔 الإشعارات', callback_data: 'admin_notifications' }],
      [{ text: '⚙️ الإعدادات', callback_data: 'admin_settings' }],
      [{ text: '🔙 العودة', callback_data: 'main_menu' }]
    ]
  },

  // User management
  userActions: (userId: number, status: string): InlineKeyboard => {
    const keyboard: InlineKeyboard = []

    if (status === 'pending') {
      keyboard.push([
        { text: '✅ قبول', callback_data: `user_approve_${userId}` },
        { text: '❌ رفض', callback_data: `user_reject_${userId}` }
      ])
    }

    keyboard.push([{ text: '👤 عرض التفاصيل', callback_data: `user_details_${userId}` }])

    if (status === 'active') {
      keyboard.push([{ text: '⏸ تعليق', callback_data: `user_suspend_${userId}` }])
    } else if (status === 'suspended') {
      keyboard.push([{ text: '▶️ تفعيل', callback_data: `user_activate_${userId}` }])
    }

    keyboard.push([{ text: '🔙 العودة', callback_data: 'admin_users' }])

    return keyboard
  },

  // Registration actions
  registrationActions: (registrationId: number, status: string): InlineKeyboard => {
    const keyboard: InlineKeyboard = []

    if (status === 'pending') {
      keyboard.push([
        { text: '✅ قبول (مالك)', callback_data: `reg_approve_owner_${registrationId}` },
        { text: '✅ قبول (مدير)', callback_data: `reg_approve_manager_${registrationId}` }
      ])
      keyboard.push([
        { text: '✅ قبول (عامل)', callback_data: `reg_approve_worker_${registrationId}` }
      ])
      keyboard.push([{ text: '❌ رفض', callback_data: `reg_reject_${registrationId}` }])
    }

    keyboard.push([{ text: '🔙 العودة', callback_data: 'admin_registrations' }])

    return keyboard
  },

  // Role assignment
  roleAssignment: (userId: number): InlineKeyboard => {
    return [
      [
        { text: '👔 مدير', callback_data: `role_assign_manager_${userId}` },
        { text: '👷 عامل', callback_data: `role_assign_worker_${userId}` }
      ],
      [{ text: '👑 مالك', callback_data: `role_assign_owner_${userId}` }],
      [{ text: '🔙 إلغاء', callback_data: `user_details_${userId}` }]
    ]
  },

  // Tasks menu
  tasksMenu: (): InlineKeyboard => {
    return [
      [{ text: '📋 مهامي', callback_data: 'tasks_my' }],
      [{ text: '✅ إكمال مهمة', callback_data: 'tasks_complete' }],
      [{ text: '🔙 العودة', callback_data: 'main_menu' }]
    ]
  },

  // Task actions
  taskActions: (taskId: number, status: string): InlineKeyboard => {
    const keyboard: InlineKeyboard = []

    if (status === 'pending') {
      keyboard.push([{ text: '▶️ بدء العمل', callback_data: `task_start_${taskId}` }])
    } else if (status === 'in_progress') {
      keyboard.push([{ text: '✅ إكمال', callback_data: `task_complete_${taskId}` }])
    }

    keyboard.push([{ text: '🔙 العودة', callback_data: 'tasks_my' }])

    return keyboard
  },

  // Notification preferences
  notificationPreferences: (preferences: any): InlineKeyboard => {
    const reportsText = preferences.receive_reports ? '✅ التقارير' : '❌ التقارير'
    const alertsText = preferences.receive_alerts ? '✅ التنبيهات' : '❌ التنبيهات'
    const tasksText = preferences.receive_tasks ? '✅ المهام' : '❌ المهام'

    return [
      [
        { text: reportsText, callback_data: 'pref_toggle_reports' },
        { text: alertsText, callback_data: 'pref_toggle_alerts' }
      ],
      [{ text: tasksText, callback_data: 'pref_toggle_tasks' }],
      [{ text: '🔙 العودة', callback_data: 'profile' }]
    ]
  },

  // Pagination
  pagination: (page: number, totalPages: number, action: string): InlineKeyboard => {
    const keyboard: InlineKeyboard = []

    if (totalPages > 1) {
      const row: any[] = []

      if (page > 1) {
        row.push({ text: '⬅️ السابق', callback_data: `${action}_page_${page - 1}` })
      }

      row.push({ text: `${page}/${totalPages}`, callback_data: 'current_page' })

      if (page < totalPages) {
        row.push({ text: 'التالي ➡️', callback_data: `${action}_page_${page + 1}` })
      }

      keyboard.push(row)
    }

    keyboard.push([{ text: '🔙 العودة', callback_data: 'main_menu' }])

    return keyboard
  },

  // Reports
  reportsMenu: (): InlineKeyboard => {
    return [
      [{ text: '💰 المالية', callback_data: 'report_finance' }],
      [{ text: '⚖️ الميزان', callback_data: 'report_weighbridge' }],
      [{ text: '📦 الصناديق', callback_data: 'report_crates' }],
      [{ text: '📊 ملخص', callback_data: 'report_summary' }],
      [{ text: '🔙 العودة', callback_data: 'main_menu' }]
    ]
  },

  // Date range selector
  dateRangeSelector: (): InlineKeyboard => {
    return [
      [{ text: 'اليوم', callback_data: 'range_today' }],
      [{ text: 'هذا الأسبوع', callback_data: 'range_week' }],
      [{ text: 'هذا الشهر', callback_data: 'range_month' }],
      [{ text: 'كل الوقت', callback_data: 'range_all' }],
      [{ text: '🔙 العودة', callback_data: 'reports_menu' }]
    ]
  }
}
