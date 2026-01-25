import { useEffect, useState } from 'react'
import { useSettingsStore } from '../store/useSettingsStore'
import { Card } from './ui/Card'
import { SyncSettings } from './SyncSettings'
import {
  Settings as SettingsIcon,
  Save,
  Database,
  Bell,
  Shield,
  Upload,
  FileSpreadsheet,
  Plus,
  Trash2,
  Lock,
  Key,
  Info
} from 'lucide-react'
import { toast } from 'react-toastify'

export default function Settings() {
  const { settings, fetchSettings, updateSetting } = useSettingsStore()
  const [formData, setFormData] = useState(settings)
  const [isProcessing, setIsProcessing] = useState(false)

  // Data Management States
  const [dateTypes, setDateTypes] = useState<any[]>([])
  const [crateTypes, setCrateTypes] = useState<any[]>([])
  const [supervisors, setSupervisors] = useState<any[]>([])
  const [newName, setNewName] = useState({
    dateType: '',
    crateType: '',
    crateWeight: '',
    supervisor: ''
  })

  // Security States
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' })
  const [showPasswordChange, setShowPasswordChange] = useState(false)

  // License States
  const [licenseInfo, setLicenseInfo] = useState<any>(null)
  const [licenseKey, setLicenseKey] = useState('')
  const [factoryName, setFactoryName] = useState('')

  useEffect(() => {
    fetchSettings()
    fetchDataManagement()
    fetchLicenseInfo()
  }, [])

  useEffect(() => {
    setFormData(settings)
    if (settings.company_name) setFactoryName(settings.company_name)
    if (settings.telegram_token) setBotToken(settings.telegram_token)
  }, [settings])

  const fetchDataManagement = async () => {
    const [dt, ct, sv] = await Promise.all([
      window.api.dateTypes.getAll(),
      window.api.crateTypes.getAll(),
      window.api.supervisors.getAll()
    ])
    setDateTypes(dt)
    setCrateTypes(ct)
    setSupervisors(sv)
  }

  const fetchLicenseInfo = async () => {
    const info = await window.api.license.getInfo()
    setLicenseInfo(info)
  }

  const handleSave = async (key: keyof typeof settings, value: string) => {
    const result = await updateSetting(key, value)
    if (result.success) {
      toast.success('تم حفظ التغييرات')
    } else {
      toast.error('فشل حفظ التغييرات')
    }
  }

  const handleAddDateType = async () => {
    if (!newName.dateType.trim()) return
    const result = await window.api.dateTypes.create(newName.dateType)
    if (result.success) {
      setNewName({ ...newName, dateType: '' })
      fetchDataManagement()
      toast.success('تم إضافة نوع التمر')
    }
  }

  const handleDeleteDateType = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا النوع؟')) return
    const result = await window.api.dateTypes.delete(id)
    if (result.success) {
      fetchDataManagement()
      toast.success('تم الحذف بنجاح')
    }
  }

  const handleAddCrateType = async () => {
    if (!newName.crateType.trim() || !newName.crateWeight) return
    const result = await window.api.crateTypes.create({
      name: newName.crateType,
      weight: parseFloat(newName.crateWeight)
    })
    if (result.success) {
      setNewName({ ...newName, crateType: '', crateWeight: '' })
      fetchDataManagement()
      toast.success('تم إضافة نوع الصندوق')
    }
  }

  const handleDeleteCrateType = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا النوع؟')) return
    const result = await window.api.crateTypes.delete(id)
    if (result.success) {
      fetchDataManagement()
      toast.success('تم الحذف بنجاح')
    }
  }

  const handleAddSupervisor = async () => {
    if (!newName.supervisor.trim()) return
    const result = await window.api.supervisors.create(newName.supervisor)
    if (result.success) {
      setNewName({ ...newName, supervisor: '' })
      fetchDataManagement()
      toast.success('تم إضافة المشرف')
    }
  }

  const handleDeleteSupervisor = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المشرف؟')) return
    const result = await window.api.supervisors.delete(id)
    if (result.success) {
      fetchDataManagement()
      toast.success('تم الحذف بنجاح')
    }
  }

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error('كلمة المرور الجديدة غير متطابقة')
      return
    }
    const result = await window.api.auth.changePassword({
      oldPassword: passwords.old,
      newPassword: passwords.new
    })
    if (result.success) {
      toast.success(result.message)
      setPasswords({ old: '', new: '', confirm: '' })
      setShowPasswordChange(false)
    } else {
      toast.error(result.message)
    }
  }

  const handleDeleteAllData = async () => {
    const confirmed = window.confirm(
      'تحذير نهائي: سيتم حذف كافة البيانات (الموازين، الصناديق، الحسابات، العملاء). لا يمكن التراجع عن هذه العملية. هل تريد الاستمرار؟'
    )
    if (confirmed) {
      const password = window.prompt('يرجى إدخال كلمة مرور المشرف للتأكيد:')
      if (password) {
        const result = await window.api.settings.deleteAllData()
        if (result.success) {
          toast.success(result.message)
          fetchSettings()
          fetchDataManagement()
        } else {
          toast.error(result.message)
        }
      }
    }
  }

  const handleActivate = async () => {
    if (!licenseKey.trim() || !factoryName.trim()) {
      toast.error('يرجى إدخال مفتاح الترخيص واسم المصنع')
      return
    }
    const result = await window.api.license.activate({ licenseKey: licenseKey, factoryName })
    if (result.success) {
      toast.success(result.message)
      fetchLicenseInfo()
    } else {
      toast.error(result.message)
    }
  }

  const handleSync = async () => {
    try {
      setIsProcessing(true)
      console.log('Starting sync...')
      const result = await window.api.settings.sync()
      console.log('Sync result:', result)
      if (result.success) {
        toast.success('تم إنشاء نسخة احتياطية بنجاح')
      } else if (result.message) {
        toast.error(result.message)
      } else {
        toast.error('تم إلغاء العملية أو فشل الحفظ')
      }
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('حدث خطأ تقني أثناء التصدير')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImportDb = async () => {
    try {
      if (
        window.confirm(
          'تحذير: استيراد قاعدة بيانات سيؤدي لاستبدال كافة البيانات الحالية. هل تريد الاستمرار؟'
        )
      ) {
        setIsProcessing(true)
        console.log('Starting DB import...')
        const result = await window.api.settings.importDb()
        console.log('Import result:', result)
        if (result.success) {
          toast.success(result.message)
          fetchSettings()
        } else if (result.message) {
          toast.error(result.message)
        }
      }
    } catch (error) {
      console.error('Import DB error:', error)
      toast.error('حدث خطأ تقني أثناء الاستيراد')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImportExcel = async () => {
    try {
      setIsProcessing(true)
      console.log('Starting Excel import...')
      const result = await window.api.settings.importExcel()
      console.log('Excel import result:', result)
      if (result.success) {
        toast.success(result.message)
      } else if (result.message) {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Excel import error:', error)
      toast.error('حدث خطأ تقني أثناء استيراد Excel')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTestTelegram = async () => {
    if (!formData.telegram_token || !formData.telegram_chat_id) {
      toast.error('يرجى إدخال بيانات تلجرام أولاً')
      return
    }

    const result = await (window as any).api.telegram.send({
      token: formData.telegram_token,
      chatId: formData.telegram_chat_id,
      message: '🔔 تجربة إشعارات مصنع التمور\nتم إعداد البوت بنجاح!'
    })

    if (result.success) {
      toast.success('تم إرسال رسالة التجربة بنجاح')
    } else {
      toast.error('فشل إرسال رسالة التجربة، تحقق من البيانات')
    }
  }

  const handleSendReport = async () => {
    if (!formData.telegram_token || !formData.telegram_chat_id) {
      toast.error('يرجى إدخال بيانات تلجرام أولاً')
      return
    }

    try {
      setIsProcessing(true)
      const result = await (window as any).api.telegram.sendReport()

      if (result.success) {
        toast.success(result.message || 'تم إرسال التقرير بنجاح')
      } else {
        toast.error(result.error || result.message || 'فشل إرسال التقرير')
      }
    } catch (error) {
      console.error('Send report error:', error)
      toast.error('حدث خطأ أثناء إرسال التقرير')
    } finally {
      setIsProcessing(false)
    }
  }

  // Telegram Bot Management States
  const [botStatus, setBotStatus] = useState<any>(null)
  const [botToken, setBotToken] = useState(formData.telegram_token || '')

  const fetchBotStatus = async () => {
    const stats = await window.api.telegram.getStats()
    setBotStatus(stats)
  }

  const handleStartBot = async () => {
    const result = await window.api.telegram.startBot()
    if (result.success) {
      toast.success(result.message || 'تم تشغيل البوت')
      fetchBotStatus()
    } else {
      toast.error(result.message || 'فشل تشغيل البوت')
    }
  }

  const handleStopBot = async () => {
    const result = await window.api.telegram.stopBot()
    if (result.success) {
      toast.success(result.message || 'تم إيقاف البوت')
      fetchBotStatus()
    } else {
      toast.error(result.message || 'فشل إيقاف البوت')
    }
  }

  const handleRestartBot = async () => {
    const result = await window.api.telegram.restartBot()
    if (result.success) {
      toast.success(result.message || 'تم إعادة تشغيل البوت')
      fetchBotStatus()
    } else {
      toast.error(result.message || 'فشل إعادة تشغيل البوت')
    }
  }

  const handleTestBotConnection = async () => {
    if (!botToken) {
      toast.error('يرجى إدخال توكن البوت أولاً')
      return
    }
    const result = await window.api.telegram.testConnection(botToken)
    if (result.success) {
      toast.success(`تم الاتصال بالبوت: @${result.botInfo?.username}`)
    } else {
      toast.error(result.message || 'فشل الاتصال بالبوت')
    }
  }

  const handleEnableBot = async (enabled: boolean) => {
    await handleSave('telegram_bot_enabled', enabled ? '1' : '0')
    if (enabled) {
      handleStartBot()
    } else {
      handleStopBot()
    }
  }

  useEffect(() => {
    fetchBotStatus()
  }, [])

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">الإعدادات</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 mb-4 text-emerald-600">
            <SettingsIcon size={20} />
            <h3 className="font-bold">الإعدادات العامة</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">
                اسم الشركة / المصنع
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
                <button
                  onClick={() => handleSave('company_name', formData.company_name)}
                  className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Save size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">
                  العنوان
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.company_address}
                    onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                  />
                  <button
                    onClick={() => handleSave('company_address', formData.company_address)}
                    className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Save size={20} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">
                  رقم الهاتف
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.company_phone}
                    onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                  />
                  <button
                    onClick={() => handleSave('company_phone', formData.company_phone)}
                    className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Save size={20} />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">
                  وزن الصندوق الافتراضي (كجم)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.crate_weight}
                    onChange={(e) => setFormData({ ...formData, crate_weight: e.target.value })}
                  />
                  <button
                    onClick={() => handleSave('crate_weight', formData.crate_weight)}
                    className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Save size={20} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">
                  وزن القنطار (كجم)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.qantar_weight}
                    onChange={(e) => setFormData({ ...formData, qantar_weight: e.target.value })}
                  />
                  <button
                    onClick={() => handleSave('qantar_weight', formData.qantar_weight)}
                    className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Save size={20} />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">
                شعار المصنع
              </label>
              <div className="flex items-center gap-4">
                {formData.company_logo && (
                  <div className="relative w-24 h-24 border rounded-lg overflow-hidden bg-white flex items-center justify-center">
                    <img
                      src={formData.company_logo}
                      alt="Logo"
                      className="max-w-full max-h-full object-contain"
                    />
                    <button
                      onClick={() => handleSave('company_logo', '')}
                      className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg hover:bg-red-600 transition-colors shadow-sm"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
                <div className="flex-1">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-xs text-slate-500 font-bold">انقر لرفع شعار المصنع</p>
                      <p className="text-[10px] text-slate-400 mt-1">يفضل أن يكون بخلفية شفافة</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            const base64String = reader.result as string
                            handleSave('company_logo', base64String)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Data Management Section */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 mb-4 text-amber-600">
            <Plus size={20} />
            <h3 className="font-bold">إدارة أنواع البيانات</h3>
          </div>

          <div className="space-y-6">
            {/* Date Types */}
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">أنواع التمور</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="نوع جديد..."
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  value={newName.dateType}
                  onChange={(e) => setNewName({ ...newName, dateType: e.target.value })}
                />
                <button
                  onClick={handleAddDateType}
                  className="bg-amber-600 text-white p-1.5 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {dateTypes.map((type) => (
                  <span
                    key={type.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md text-xs font-bold border border-amber-100 dark:border-amber-800"
                  >
                    {type.name}
                    <button
                      onClick={() => handleDeleteDateType(type.id)}
                      className="hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Crate Types */}
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">أنواع الصناديق</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input
                  type="text"
                  placeholder="اسم الصندوق..."
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  value={newName.crateType}
                  onChange={(e) => setNewName({ ...newName, crateType: e.target.value })}
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="الوزن..."
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                    value={newName.crateWeight}
                    onChange={(e) => setNewName({ ...newName, crateWeight: e.target.value })}
                  />
                  <button
                    onClick={handleAddCrateType}
                    className="bg-amber-600 text-white p-1.5 rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {crateTypes.map((type) => (
                  <span
                    key={type.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-bold border border-slate-200 dark:border-slate-700"
                  >
                    {type.name} ({type.weight}كجم)
                    <button
                      onClick={() => handleDeleteCrateType(type.id)}
                      className="hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Supervisors */}
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">المشرفين</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="اسم المشرف..."
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  value={newName.supervisor}
                  onChange={(e) => setNewName({ ...newName, supervisor: e.target.value })}
                />
                <button
                  onClick={handleAddSupervisor}
                  className="bg-amber-600 text-white p-1.5 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {supervisors.map((sv) => (
                  <span
                    key={sv.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md text-xs font-bold border border-emerald-100 dark:border-emerald-800"
                  >
                    {sv.name}
                    <button
                      onClick={() => handleDeleteSupervisor(sv.id)}
                      className="hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Telegram Notifications */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Bell size={20} />
              <h3 className="font-bold">إشعارات تلجرام</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSendReport}
                disabled={isProcessing}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'جاري الإرسال...' : 'إرسال التقرير'}
              </button>
              <button
                onClick={handleTestTelegram}
                className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold hover:bg-blue-100 transition-colors"
              >
                تجربة الإرسال
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">
                Telegram Bot Token
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  value={formData.telegram_token}
                  onChange={(e) => setFormData({ ...formData, telegram_token: e.target.value })}
                />
                <button
                  onClick={() => handleSave('telegram_token', formData.telegram_token)}
                  className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Save size={20} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">
                Chat ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  value={formData.telegram_chat_id}
                  onChange={(e) => setFormData({ ...formData, telegram_chat_id: e.target.value })}
                />
                <button
                  onClick={() => handleSave('telegram_chat_id', formData.telegram_chat_id)}
                  className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Save size={20} />
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Telegram Bot Management */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 mb-4 text-blue-600">
            <Bell size={20} />
            <h3 className="font-bold">إدارة بوت تيليجرام</h3>
          </div>

          <div className="space-y-4">
            {/* Bot Status */}
            <div
              className={`p-4 rounded-lg border-2 ${
                botStatus?.isRunning
                  ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
                  : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      botStatus?.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  <span className="font-bold text-sm">
                    {botStatus?.isRunning ? 'البوت يعمل' : 'البوت متوقف'}
                  </span>
                </div>
                <button
                  onClick={() => handleEnableBot(!botStatus?.isRunning)}
                  className={`text-xs px-4 py-2 rounded-full font-bold transition-colors ${
                    botStatus?.isRunning
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {botStatus?.isRunning ? 'إيقاف البوت' : 'تشغيل البوت'}
                </button>
              </div>
            </div>

            {/* Bot Token Test */}
            <div>
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">
                اختبار التوكن
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Telegram Bot Token"
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                />
                <button
                  onClick={handleTestBotConnection}
                  className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold"
                >
                  اختبار
                </button>
              </div>
            </div>

            {/* Bot Controls */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleStartBot}
                disabled={!formData.telegram_token}
                className="bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                تشغيل
              </button>
              <button
                onClick={handleStopBot}
                disabled={!botStatus?.isRunning}
                className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                إيقاف
              </button>
              <button
                onClick={handleRestartBot}
                disabled={!formData.telegram_token}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                إعادة تشغيل
              </button>
            </div>

            {/* Bot Stats */}
            {botStatus?.notificationStats && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2 text-xs">
                <div className="font-bold text-slate-600 dark:text-slate-400 mb-2">
                  إحصائيات الإشعارات
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">في الانتظار:</span>
                    <span className="font-bold">{botStatus.notificationStats.pending}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">تم الإرسال:</span>
                    <span className="font-bold text-emerald-600">
                      {botStatus.notificationStats.sent}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">فاشلة:</span>
                    <span className="font-bold text-red-500">
                      {botStatus.notificationStats.failed}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {botStatus?.registrationStats && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2 text-xs">
                <div className="font-bold text-slate-600 dark:text-slate-400 mb-2">
                  إحصائيات التسجيل
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">قيد المراجعة:</span>
                    <span className="font-bold">{botStatus.registrationStats.pending}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">مقبولة:</span>
                    <span className="font-bold text-emerald-600">
                      {botStatus.registrationStats.approved}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">مرفوضة:</span>
                    <span className="font-bold text-red-500">
                      {botStatus.registrationStats.rejected}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Database Sync */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 mb-4 text-purple-600">
            <Database size={20} />
            <h3 className="font-bold">قاعدة البيانات والمزامنة</h3>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-4">
            <p className="text-sm text-slate-500 text-center">
              إدارة البيانات: استيراد، تصدير، ونسخ احتياطي
            </p>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={handleSync}
                disabled={isProcessing}
                className="w-full bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Database size={18} />
                {isProcessing ? 'جاري المعالجة...' : 'تصدير نسخة احتياطية (.sqlite)'}
              </button>

              <button
                onClick={handleImportDb}
                disabled={isProcessing}
                className="w-full bg-slate-700 text-white px-6 py-2 rounded-lg hover:bg-slate-800 transition-colors font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Upload size={18} />
                {isProcessing ? 'جاري المعالجة...' : 'استيراد قاعدة بيانات (.sqlite)'}
              </button>

              <button
                onClick={handleImportExcel}
                disabled={isProcessing}
                className="w-full bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FileSpreadsheet size={18} />
                {isProcessing ? 'جاري المعالجة...' : 'استيراد عملاء من Excel'}
              </button>
            </div>
          </div>
        </Card>

        {/* Cloud Sync Settings */}
        <SyncSettings />

        {/* License Management */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 mb-4 text-emerald-600">
            <Key size={20} />
            <h3 className="font-bold">ترخيص البرنامج</h3>
          </div>

          <div className="space-y-4">
            {licenseInfo && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">حالة التفعيل:</span>
                  <span
                    className={`font-bold ${licenseInfo.activated ? 'text-emerald-600' : 'text-red-500'}`}
                  >
                    {licenseInfo.activated ? 'مفعل' : 'غير مفعل'}
                  </span>
                </div>
                {licenseInfo.factoryName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">اسم المصنع:</span>
                    <span className="font-bold">{licenseInfo.factoryName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center gap-4">
                  <span className="text-slate-500 shrink-0">معرف الجهاز:</span>
                  <code className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-[10px] break-all select-all">
                    {licenseInfo.machineId}
                  </code>
                </div>
              </div>
            )}

            {!licenseInfo?.activated && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    مفتاح الترخيص
                  </label>
                  <input
                    type="text"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleActivate}
                  className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors"
                >
                  تفعيل البرنامج الآن
                </button>
              </div>
            )}

            <div className="flex items-start gap-2 text-xs text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              <Info size={14} className="shrink-0 text-blue-500" />
              <p>
                لتفعيل البرنامج، يرجى تزويد الدعم الفني بمعرف الجهاز الخاص بك للحصول على مفتاح
                التفعيل.
              </p>
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 mb-4 text-red-600">
            <Shield size={20} />
            <h3 className="font-bold">الأمان والصلاحيات</h3>
          </div>

          <div className="space-y-4">
            {showPasswordChange ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-2">
                  <Lock size={18} />
                  <span className="font-bold">تغيير كلمة المرور</span>
                </div>
                <input
                  type="password"
                  placeholder="كلمة المرور الحالية"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"
                  value={passwords.old}
                  onChange={(e) => setPasswords({ ...passwords, old: e.target.value })}
                />
                <input
                  type="password"
                  placeholder="كلمة المرور الجديدة"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                />
                <input
                  type="password"
                  placeholder="تأكيد كلمة المرور الجديدة"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleChangePassword}
                    className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 text-sm"
                  >
                    حفظ كلمة المرور
                  </button>
                  <button
                    onClick={() => setShowPasswordChange(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg font-bold text-sm"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowPasswordChange(true)}
                className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex justify-between items-center group"
              >
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-slate-400" />
                  <span className="text-sm font-bold">تغيير كلمة مرور المشرف</span>
                </div>
                <Save size={16} className="text-slate-300 group-hover:text-emerald-500" />
              </button>
            )}

            <button
              onClick={handleDeleteAllData}
              className="w-full text-right p-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex justify-between items-center group text-red-500 border border-transparent hover:border-red-100 dark:hover:border-red-900/50"
            >
              <div className="flex items-center gap-2">
                <Trash2 size={16} />
                <span className="text-sm font-bold">حذف كافة البيانات (تصفير المصنع)</span>
              </div>
              <Shield size={16} className="text-red-300 group-hover:text-red-500" />
            </button>
          </div>
        </Card>
        {/* Technical Support */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 mb-4 text-emerald-600">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <h3 className="font-bold">الدعم الفني والتواصل</h3>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              للدعم الفني والاستفسارات أو طلب تفعيل البرنامج، يمكنك التواصل مع المطور مباشرة عبر
              واتساب:
            </p>
            <a
              href="https://wa.me/201221089249"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              تواصل عبر واتساب
            </a>
            <div className="text-center">
              <span className="text-xs text-slate-400 font-mono">+20 122 108 9249</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
