import { useState, useEffect } from 'react'
import { Card } from './ui/Card'
import Cloud from 'lucide-react/dist/esm/icons/cloud'
import CloudOff from 'lucide-react/dist/esm/icons/cloud-off'
import User from 'lucide-react/dist/esm/icons/user'
import Phone from 'lucide-react/dist/esm/icons/phone'
import Lock from 'lucide-react/dist/esm/icons/lock'
import Building2 from 'lucide-react/dist/esm/icons/building-2'
import LogIn from 'lucide-react/dist/esm/icons/log-in'
import UserPlus from 'lucide-react/dist/esm/icons/user-plus'
import Download from 'lucide-react/dist/esm/icons/download'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle'
import Loader2 from 'lucide-react/dist/esm/icons/loader-2'
import { clsx } from 'clsx'
import { toast } from 'react-toastify'

interface CloudAccountProps {
    onAccountChange?: () => void
}

export function CloudAccount({ onAccountChange }: CloudAccountProps) {
    const [mode, setMode] = useState<'status' | 'register' | 'login'>('status')
    const [isLoading, setIsLoading] = useState(false)
    const [accountStatus, setAccountStatus] = useState<{
        isRegistered: boolean
        phone?: string
        factoryName?: string
    }>({ isRegistered: false })

    // Form data
    const [formData, setFormData] = useState({
        phone: '',
        password: '',
        confirmPassword: '',
        factoryName: ''
    })

    useEffect(() => {
        fetchAccountStatus()
    }, [])

    const fetchAccountStatus = async () => {
        try {
            const result = await window.api.cloudAccount.getStatus()
            if (result.success) {
                setAccountStatus({
                    isRegistered: result.isRegistered,
                    phone: result.phone,
                    factoryName: result.factoryName
                })
            }
        } catch (error) {
            console.error('Failed to fetch account status:', error)
        }
    }

    const handleRegister = async () => {
        if (!formData.phone || !formData.password) {
            toast.error('يرجى إدخال رقم الهاتف وكلمة المرور')
            return
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('كلمة المرور غير متطابقة')
            return
        }

        if (formData.password.length < 6) {
            toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
            return
        }

        setIsLoading(true)
        try {
            const result = await window.api.cloudAccount.register({
                phone: formData.phone,
                password: formData.password,
                factoryName: formData.factoryName || undefined
            })

            if (result.success) {
                toast.success(result.message || 'تم إنشاء الحساب بنجاح')
                await fetchAccountStatus()
                setMode('status')
                setFormData({ phone: '', password: '', confirmPassword: '', factoryName: '' })
                onAccountChange?.()
            } else {
                toast.error(result.message || 'فشل إنشاء الحساب')
            }
        } catch (error: any) {
            toast.error(error.message || 'حدث خطأ أثناء إنشاء الحساب')
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogin = async () => {
        if (!formData.phone || !formData.password) {
            toast.error('يرجى إدخال رقم الهاتف وكلمة المرور')
            return
        }

        setIsLoading(true)
        try {
            const result = await window.api.cloudAccount.login({
                phone: formData.phone,
                password: formData.password
            })

            if (result.success) {
                toast.success(result.message || 'تم تسجيل الدخول بنجاح')
                await fetchAccountStatus()
                setMode('status')
                setFormData({ phone: '', password: '', confirmPassword: '', factoryName: '' })
                onAccountChange?.()
            } else {
                toast.error(result.message || 'فشل تسجيل الدخول')
            }
        } catch (error: any) {
            toast.error(error.message || 'حدث خطأ أثناء تسجيل الدخول')
        } finally {
            setIsLoading(false)
        }
    }

    const handleRestore = async () => {
        if (!formData.phone || !formData.password) {
            toast.error('يرجى إدخال رقم الهاتف وكلمة المرور')
            return
        }

        const confirmed = window.confirm(
            'تحذير: استعادة البيانات ستستبدل جميع البيانات المحلية الحالية. هل تريد المتابعة؟'
        )
        if (!confirmed) return

        setIsLoading(true)
        try {
            const result = await window.api.cloudAccount.restore({
                phone: formData.phone,
                password: formData.password
            })

            if (result.success) {
                toast.success(result.message || 'تم استعادة البيانات بنجاح')
                await fetchAccountStatus()
                setMode('status')
                setFormData({ phone: '', password: '', confirmPassword: '', factoryName: '' })
                onAccountChange?.()
                // Reload the page to refresh all data
                window.location.reload()
            } else {
                toast.error(result.message || 'فشل استعادة البيانات')
            }
        } catch (error: any) {
            toast.error(error.message || 'حدث خطأ أثناء استعادة البيانات')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        الحساب السحابي
                    </h3>
                </div>
                <div
                    className={clsx(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
                        accountStatus.isRegistered
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    )}
                >
                    {accountStatus.isRegistered ? (
                        <>
                            <CheckCircle className="w-4 h-4" />
                            متصل
                        </>
                    ) : (
                        <>
                            <CloudOff className="w-4 h-4" />
                            غير متصل
                        </>
                    )}
                </div>
            </div>

            {/* Account Status / Forms */}
            {mode === 'status' && (
                <div className="space-y-4">
                    {accountStatus.isRegistered ? (
                        <>
                            {/* Connected Account Info */}
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full">
                                        <Cloud className="w-6 h-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-green-900 dark:text-green-300">
                                            {accountStatus.factoryName || 'حساب متصل'}
                                        </p>
                                        <p className="text-sm text-green-700 dark:text-green-400">
                                            {accountStatus.phone}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                                بياناتك تُحفظ تلقائياً في السحابة
                            </p>
                        </>
                    ) : (
                        <>
                            {/* Not Connected - Show Options */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            لم تقم بإنشاء حساب سحابي بعد
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            أنشئ حساباً لحفظ بياناتك واستعادتها على أي جهاز
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setMode('register')}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    حساب جديد
                                </button>
                                <button
                                    onClick={() => setMode('login')}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                                >
                                    <LogIn className="w-4 h-4" />
                                    لدي حساب
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Register Form */}
            {mode === 'register' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">إنشاء حساب جديد</h4>
                        <button
                            onClick={() => setMode('status')}
                            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                            إلغاء
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Phone className="w-4 h-4 inline ml-1" />
                                رقم الهاتف
                            </label>
                            <input
                                type="tel"
                                dir="ltr"
                                placeholder="05xxxxxxxx"
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Lock className="w-4 h-4 inline ml-1" />
                                كلمة المرور
                            </label>
                            <input
                                type="password"
                                placeholder="******"
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Lock className="w-4 h-4 inline ml-1" />
                                تأكيد كلمة المرور
                            </label>
                            <input
                                type="password"
                                placeholder="******"
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Building2 className="w-4 h-4 inline ml-1" />
                                اسم المصنع (اختياري)
                            </label>
                            <input
                                type="text"
                                placeholder="مصنع التمور"
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.factoryName}
                                onChange={(e) => setFormData({ ...formData, factoryName: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleRegister}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <UserPlus className="w-4 h-4" />
                        )}
                        {isLoading ? 'جاري التسجيل...' : 'إنشاء الحساب'}
                    </button>
                </div>
            )}

            {/* Login Form */}
            {mode === 'login' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">تسجيل الدخول</h4>
                        <button
                            onClick={() => setMode('status')}
                            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                            إلغاء
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Phone className="w-4 h-4 inline ml-1" />
                                رقم الهاتف
                            </label>
                            <input
                                type="tel"
                                dir="ltr"
                                placeholder="05xxxxxxxx"
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Lock className="w-4 h-4 inline ml-1" />
                                كلمة المرور
                            </label>
                            <input
                                type="password"
                                placeholder="******"
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleLogin}
                            disabled={isLoading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <LogIn className="w-4 h-4" />
                            )}
                            {isLoading ? 'جاري الدخول...' : 'تسجيل الدخول'}
                        </button>
                        <button
                            onClick={handleRestore}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-50"
                            title="استعادة البيانات"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        استخدم زر الاستعادة لتحميل بياناتك من السحابة إلى هذا الجهاز
                    </p>
                </div>
            )}

            {/* Info Box */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                <div className="flex gap-3">
                    <Cloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="text-sm font-medium text-indigo-900 dark:text-indigo-300">
                            مميزات الحساب السحابي
                        </h4>
                        <ul className="text-xs text-indigo-700 dark:text-indigo-400 mt-2 space-y-1">
                            <li>• حفظ تلقائي لجميع بياناتك</li>
                            <li>• استعادة البيانات على أي جهاز</li>
                            <li>• مزامنة مستمرة كل 30 ثانية</li>
                            <li>• حماية بكلمة مرور آمنة</li>
                        </ul>
                    </div>
                </div>
            </div>
        </Card>
    )
}
