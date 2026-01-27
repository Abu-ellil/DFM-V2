import React from 'react'
import { formatCurrency, formatNumber } from '../../utils/format'
import { PrintLayout } from './PrintLayout'

interface ReceiptData {
    type: 'weighbridge' | 'finance' | 'crates'
    data: any
    customerName: string
}

export const ReceiptTemplate: React.FC<ReceiptData> = ({ type, data, customerName }) => {
    const getTitle = () => {
        switch (type) {
            case 'weighbridge':
                return 'إيصال استلام تمور (ميزان)'
            case 'finance':
                return 'إيصال معاملة مالية'
            case 'crates':
                return 'إيصال حركة صناديق'
            default:
                return 'إيصال'
        }
    }

    const renderContent = () => {
        return (
            <div className="grid grid-cols-2 gap-x-8 gap-y-6 text-xl">
                {/* Common Info */}
                <div className="flex justify-between border-b pb-2">
                    <span className="font-bold text-slate-500">التاريخ:</span>
                    <span className="font-black">{new Date(data.date).toLocaleDateString('ar-EG')}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="font-bold text-slate-500">العميل:</span>
                    <span className="font-black">{customerName}</span>
                </div>

                {/* Weighbridge Specific */}
                {type === 'weighbridge' && (
                    <>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-bold text-slate-500">نوع البلح:</span>
                            <span className="font-black">{data.date_type_name}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-bold text-slate-500">الوزن القائم:</span>
                            <span className="font-black">{formatNumber(data.gross_weight)} كجم</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-bold text-slate-500">عدد الصناديق:</span>
                            <span className="font-black">{data.crates_count}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2 bg-slate-50 px-2 rounded">
                            <span className="font-bold text-emerald-600">الوزن الصافي:</span>
                            <span className="font-black text-2xl">{formatNumber(data.net_weight)} كجم</span>
                        </div>
                        <div className="col-span-2 mt-4 p-4 bg-slate-100 rounded-xl border border-slate-300">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-2xl">الإجمالي:</span>
                                <span className="font-black text-4xl text-emerald-700">
                                    {formatCurrency(data.total)}
                                </span>
                            </div>
                        </div>
                    </>
                )}

                {/* Finance Specific */}
                {type === 'finance' && (
                    <>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-bold text-slate-500">نوع العملية:</span>
                            <span className="font-black">{data.transaction_type}</span>
                        </div>
                        <div className="col-span-2"></div> {/* Spacer */}
                        {data.amount_received > 0 && (
                            <div className="col-span-2 flex justify-between items-center p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                <span className="font-bold text-emerald-700 text-xl">المبلغ المستلم (له):</span>
                                <span className="font-black text-4xl text-emerald-800">
                                    {formatCurrency(data.amount_received)}
                                </span>
                            </div>
                        )}
                        {data.amount_paid > 0 && (
                            <div className="col-span-2 flex justify-between items-center p-4 bg-red-50 border border-red-200 rounded-xl">
                                <span className="font-bold text-red-700 text-xl">المبلغ المدفوع (عليه):</span>
                                <span className="font-black text-4xl text-red-800">
                                    {formatCurrency(data.amount_paid)}
                                </span>
                            </div>
                        )}
                        {data.notes && (
                            <div className="col-span-2 mt-4">
                                <p className="font-bold text-slate-500 mb-2">ملاحظات:</p>
                                <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 text-lg">
                                    {data.notes}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Crates Specific */}
                {type === 'crates' && (
                    <>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-bold text-slate-500">نوع الصندوق:</span>
                            <span className="font-black">{data.crate_type_name}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="font-bold text-slate-500">المستلم/المسلم:</span>
                            <span className="font-black">{data.handler || '-'}</span>
                        </div>
                        <div className="col-span-2 grid grid-cols-2 gap-4 mt-4">
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                                <span className="block font-bold text-red-600 mb-1">صناديق خارجة</span>
                                <span className="block font-black text-3xl text-red-800">
                                    {formatNumber(data.crates_out)}
                                </span>
                            </div>
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                                <span className="block font-bold text-emerald-600 mb-1">صناديق عائدة</span>
                                <span className="block font-black text-3xl text-emerald-800">
                                    {formatNumber(data.crates_returned)}
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        )
    }

    return (
        <PrintLayout
            title={getTitle()}
            showSignatures={true}
        >
            {renderContent()}
        </PrintLayout>
    )
}
