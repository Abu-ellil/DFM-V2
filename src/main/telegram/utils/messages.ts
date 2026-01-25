/* eslint-disable @typescript-eslint/no-explicit-any */
export const Messages = {
  // Welcome & Start
  welcome: (name: string = '') => `
👋 <b>مرحباً بك ${name}</b> في نظام إدارة مصنع التمور!

<i>النظام يساعدك على التنسيق مع الفريق وإدارة العمليات</i>

<b>الأوامر المتاحة:</b>
/start - بدء الاستخدام
/register - التسجيل في النظام
/help - عرض المساعدة
/status - حالة النظام
/myprofile - ملفي الشخصي
  `,

  // Registration
  registrationStarted: `
✅ <b>بدء عملية التسجيل</b>

سيتم طلب بعض المعلومات منك لإكمال التسجيل.
يرجى الإجابة على كل سؤال بدقة.

❌ إلغاء: /cancel
  `,

  registrationStep1: `
📝 <b>الخطوة 1/4: الاسم الكامل</b>

يرجى إدخال اسمك الكامل (الاسم الثلاثي):
  `,

  registrationStep2: `
📱 <b>الخطوة 2/4: رقم الهاتف</b>

يرجى إدخال رقم هاتفك للتواصل:
  `,

  registrationStep3: `
👥 <b>الخطوة 3/4: نوع الحساب</b>

يرجى اختيار نوع الحساب المناسب لك:
  `,

  registrationStep4: `
💬 <b>الخطوة 4/4: سبب التسجيل</b>

يرجى كتابة سبب رغبتك في التسجيل في النظام:
  `,

  registrationConfirm: (data: any) => `
✅ <b>مراجعة بيانات التسجيل</b>

<b>الاسم:</b> ${data.full_name}
<b>الهاتف:</b> ${data.phone}
<b>نوع الحساب:</b> ${getRoleName(data.requested_role)}
<b>السبب:</b> ${data.reason}

⟫ <b>هل تريد تأكيد هذه البيانات؟</b>
  `,

  registrationSuccess: `
✅ <b>تم إرسال طلب التسجيل بنجاح!</b>

<i>تم إرسال طلبك إلى المشرفين وسيتم مراجعته قريباً.</i>
⏳ ستحصل على إشعار عند قبول أو رفض طلبك.

شكراً لك!
  `,

  registrationCancelled: `
❌ <b>تم إلغاء عملية التسجيل</b>

يمكنك البدء مرة أخرى باستخدام الأمر /register
  `,

  registrationStepError: (step: number) => `
⚠️ <b>حدث خطأ في الإدخال</b>

الخطوة الحالية: ${step}

يرجى المحاولة مرة أخرى أو إلغاء العملية: /cancel
  `,

  // Approval/Rejection
  registrationApproved: (role: string) => `
🎉 <b>مبارك! تم قبول طلب تسجيلك</b>

<i>تم تفعيل حسابك بنجاح</i>
<b>الدور:</b> ${getRoleName(role)}

يمكنك الآن استخدام جميع الأوامر المتاحة لدورك.
ابدأ باستخدام الأمر /help لمعرفة المزيد.
  `,

  registrationRejected: (reason?: string) => `
❌ <b>تم رفض طلب التسجيل</b>

${reason ? `<b>السبب:</b> ${reason}` : 'يرجى التواصل مع المشرف للحصول على مزيد من المعلومات.'}

يمكنك المحاولة مرة أخرى لاحقاً باستخدام الأمر /register
  `,

  // Help
  help: (role?: string) => {
    const baseHelp = `
<b>📚 دليل الأوامر المتاحة</b>

<b>الأوامر العامة:</b>
/start - إعادة تشغيل البوت وعرض القائمة الرئيسية
/register - التسجيل في النظام (للمستخدمين الجدد)
/myprofile - عرض ملفك الشخصي
/help - عرض هذا الدليل
/status - حالة النظام
`

    const ownerCommands = `
<b>أوامر المالك:</b>
/reports - التقارير المالية
/users - إدارة المستخدمين
/registrations - طلبات التسجيل
/settings - إعدادات النظام
/broadcast - إرسال رسالة للجميع
`

    const managerCommands = `
<b>أوامر المدير:</b>
/tasks - المهام الموكلة إليك
/assign - إسناد مهمة
/team - عرض الفريق
`

    const workerCommands = `
<b>أوامر العامل:</b>
/tasks - مهامي
/complete - إكمال مهمة
`

    if (role === 'owner') return baseHelp + ownerCommands
    if (role === 'manager') return baseHelp + managerCommands
    if (role === 'worker') return baseHelp + workerCommands
    return baseHelp
  },

  // Profile
  profile: (user: any) => `
👤 <b>ملفي الشخصي</b>

<b>الاسم:</b> ${user.first_name || ''} ${user.last_name || ''}
<b>الدور:</b> ${getRoleName(user.role)}
<b>الحالة:</b> ${getStatusName(user.status)}
<b>تاريخ التسجيل:</b> ${formatDate(user.registration_date)}
<b>آخر تفاعل:</b> ${formatDate(user.last_interaction)}
  `,

  // Status
  systemStatus: (stats: any) => `
📊 <b>حالة النظام</b>

<b>المستخدمون:</b>
• نشط: ${stats.active_users || 0}
• معلق: ${stats.pending_users || 0}

<b>طلبات التسجيل:</b>
• في الانتظار: ${stats.pending_registrations || 0}
• مقبولة: ${stats.approved_registrations || 0}
• مرفوضة: ${stats.rejected_registrations || 0}

<b>الإشعارات:</b>
• في قائمة الانتظار: ${stats.pending_notifications || 0}
• تم الإرسال: ${stats.sent_notifications || 0}
• فاشلة: ${stats.failed_notifications || 0}
  `,

  // Errors
  error: (message: string) => `
❌ <b>حدث خطأ</b>

${message}

يرجى المحاولة مرة أخرى أو التواصل مع المشرف.
  `,

  notAuthorized: `
⛔ <b>غير مصرح</b>

<i>ليس لديك صلاحية للوصول إلى هذا الأمر</i>

يرجى التواصل مع المشرف إذا كنت تعتقد أن هذا خطأ.
  `,

  notRegistered: `
⚠️ <b>لم يتم التسجيل</b>

<i>لم تقم بالتسجيل في النظام بعد</i>

يرجى استخدام الأمر /register للتسجيل
  `,

  registrationPending: `
⏳ <b>التسجيل معلق</b>

<i>طلب التسجيل الخاص بك قيد المراجعة</i>

سيتم إشعارك عند اتخاذ القرار.
  `,

  // Notifications
  newNotification: (title: string, message: string) => `
🔔 <b>${title}</b>

${message}
  `,

  newTask: (task: any) => `
📋 <b>مهمة جديدة</b>

<b>العنوان:</b> ${task.title}
<b>الأولوية:</b> ${task.priority || 'عادية'}
<b>الموعد النهائي:</b> ${task.due_date || 'غير محدد'}

${task.description ? `<b>الوصف:</b> ${task.description}` : ''}
  `,

  // Admin commands
  adminCommands: `
<b>🔧 أوامر المشرف</b>

/manage_users - إدارة المستخدمين
/approve <id> [role] - قبول طلب تسجيل
/reject <id> [reason] - رفض طلب تسجيل
/notifications - إشعارات النظام
/stats - إحصائيات النظام
  `,

  // Tasks
  tasksList: (tasks: any[]) => {
    if (tasks.length === 0) {
      return `
📋 <b>مهامي</b>

<i>لا توجد مهام مسندة إليك حالياً</i>
      `
    }

    let message = `📋 <b>مهامي (${tasks.length})</b>\n\n`

    tasks.forEach((task, index) => {
      message += `<b>${index + 1}. ${task.title}</b>\n`
      message += `   الحالة: ${getTaskStatusName(task.status)}\n`
      if (task.due_date) {
        message += `   الموعد: ${task.due_date}\n`
      }
      message += '\n'
    })

    return message
  }
}

// Helper functions
function getRoleName(role: string): string {
  const roles: Record<string, string> = {
    owner: 'مالك',
    manager: 'مدير',
    worker: 'عامل',
    admin: 'مشرف'
  }
  return roles[role] || role
}

function getStatusName(status: string): string {
  const statuses: Record<string, string> = {
    active: 'نشط',
    pending: 'معلق',
    inactive: 'غير نشط',
    suspended: 'موقوف'
  }
  return statuses[status] || status
}

function getTaskStatusName(status: string): string {
  const statuses: Record<string, string> = {
    pending: 'قيد الانتظار',
    in_progress: 'جاري العمل',
    completed: 'مكتمل',
    cancelled: 'ملغي'
  }
  return statuses[status] || status
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
