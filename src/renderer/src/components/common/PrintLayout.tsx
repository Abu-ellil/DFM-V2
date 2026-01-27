import React from 'react'
import { useSettingsStore } from '../../store/useSettingsStore'

interface PrintLayoutProps {
    title: string
    subtitle?: string | React.ReactNode
    children: React.ReactNode
    showSignatures?: boolean
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({
    title,
    subtitle,
    children,
    showSignatures = true
}) => {
    const { settings } = useSettingsStore()

    return (
        <div className="hidden print:block w-full min-h-screen bg-white text-black p-8">
            {/* Header */}
            <div className="border-b-4 border-emerald-600 pb-6 mb-8">
                <div className="flex justify-between items-start">
                    <div className="text-right">
                        <h1 className="text-4xl font-black text-emerald-800 mb-2">
                            {settings.company_name || 'مصنع التمور'}
                        </h1>
                        <div className="space-y-1 text-slate-700 font-bold text-lg">
                            {settings.company_address && <p>{settings.company_address}</p>}
                            {settings.company_phone && <p>{settings.company_phone}</p>}
                        </div>
                    </div>
                    {settings.company_logo && (
                        <div className="bg-white p-2 rounded-xl border border-slate-200">
                            <img
                                src={settings.company_logo}
                                alt="Logo"
                                className="h-24 w-auto object-contain"
                            />
                        </div>
                    )}
                </div>

                <div className="relative mt-8 mb-4">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-300"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white px-8 py-2 rounded-full text-2xl font-black text-slate-800 border-2 border-slate-200">
                            {title}
                        </span>
                    </div>
                </div>

                {subtitle && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                        {subtitle}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="mb-12">{children}</div>

            {/* Footer / Signatures */}
            {showSignatures && (
                <div className="mt-auto pt-12 border-t-2 border-slate-200 break-inside-avoid">
                    <div className="flex justify-between gap-8">
                        <div className="text-center flex-1">
                            <p className="text-lg font-bold text-slate-600 mb-16">توقيع المستلم</p>
                            <div className="w-full border-b-2 border-slate-400"></div>
                        </div>
                        <div className="text-center flex-1">
                            <p className="text-lg font-bold text-slate-600 mb-16">توقيت المراجعة</p>
                            <div className="w-full border-b-2 border-slate-400"></div>
                        </div>
                        <div className="text-center flex-1">
                            <p className="text-lg font-bold text-slate-600 mb-16">توقيع المدير المسؤول</p>
                            <div className="w-full border-b-2 border-slate-400"></div>
                        </div>
                    </div>
                    <div className="mt-8 text-center">
                        <p className="text-slate-400 text-sm font-bold italic">
                            تم استخراج هذا المستند آلياً من النظام - {new Date().toLocaleString('ar-EG')}
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
