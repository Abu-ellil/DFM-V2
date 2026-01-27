/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from 'xlsx'
import { Database } from 'sql.js'
import TelegramBot from 'node-telegram-bot-api'

interface ReportData {
  customers: any[]
  weighbridge: any[]
  crates: any[]
  finance: any[]
  settings: Record<string, string>
}

interface ReportSummary {
  report_date: string
  customers: {
    total: number
    suppliers: number
    traders: number
    factories: number
  }
  today: {
    weighbridge_transactions: number
    crates_out: number
    crates_returned: number
    financial_transactions: number
  }
  recent_customers: any[]
  recent_transactions: any[]
}

export function generateReportData(db: Database): ReportData {
  const customers = db.exec('SELECT * FROM customers ORDER BY created_at DESC LIMIT 50')
  const customersData =
    customers.length > 0
      ? customers[0].values.map((row) => {
          const obj: any = {}
          customers[0].columns.forEach((col, i) => (obj[col] = row[i]))
          return obj
        })
      : []

  const weighbridge = db.exec(`
    SELECT w.*, c.name as customer_name, dt.name as date_type_name 
    FROM weighbridge w
    JOIN customers c ON w.customer_id = c.id
    LEFT JOIN date_types dt ON w.date_type_id = dt.id
    ORDER BY w.date DESC, w.id DESC
    LIMIT 50
  `)
  const weighbridgeData =
    weighbridge.length > 0
      ? weighbridge[0].values.map((row) => {
          const obj: any = {}
          weighbridge[0].columns.forEach((col, i) => (obj[col] = row[i]))
          return obj
        })
      : []

  const crates = db.exec(`
    SELECT cr.*, c.name as customer_name, ct.name as crate_type_name
    FROM crates cr
    JOIN customers c ON cr.customer_id = c.id
    LEFT JOIN crate_types ct ON cr.crate_type_id = ct.id
    ORDER BY cr.date DESC, cr.id DESC
    LIMIT 50
  `)
  const cratesData =
    crates.length > 0
      ? crates[0].values.map((row) => {
          const obj: any = {}
          crates[0].columns.forEach((col, i) => (obj[col] = row[i]))
          return obj
        })
      : []

  const finance = db.exec(`
    SELECT f.*, c.name as customer_name
    FROM finance f
    JOIN customers c ON f.customer_id = c.id
    ORDER BY f.date DESC, f.id DESC
    LIMIT 50
  `)
  const financeData =
    finance.length > 0
      ? finance[0].values.map((row) => {
          const obj: any = {}
          finance[0].columns.forEach((col, i) => (obj[col] = row[i]))
          return obj
        })
      : []

  const settingsRes = db.exec('SELECT * FROM settings')
  const settings: Record<string, string> = {}
  if (settingsRes.length > 0) {
    settingsRes[0].values.forEach((row) => {
      settings[row[0] as string] = row[1] as string
    })
  }

  return {
    customers: customersData,
    weighbridge: weighbridgeData,
    crates: cratesData,
    finance: financeData,
    settings
  }
}

export function generateReportSummary(db: Database): ReportSummary {
  const today = new Date().toISOString().split('T')[0]

  const customers = db.exec('SELECT * FROM customers')
  const customersList =
    customers.length > 0
      ? customers[0].values.map((row) => {
          const obj: any = {}
          customers[0].columns.forEach((col, i) => (obj[col] = row[i]))
          return obj
        })
      : []

  const suppliers = customersList.filter((c) => c.type === 'مورد').length
  const traders = customersList.filter((c) => c.type === 'تاجر').length
  const factories = customersList.filter((c) => c.type === 'مصنع').length

  const todayWeighbridge = db.exec(`SELECT COUNT(*) as count FROM weighbridge WHERE date = ?`)
  const todayWeighbridgeCount =
    todayWeighbridge.length > 0 ? (todayWeighbridge[0].values[0][0] as number) : 0

  const todayCrates = db.exec(
    `SELECT SUM(crates_out) as out, SUM(crates_returned) as returned FROM crates WHERE date = ?`
  )
  const todayCratesData = todayCrates.length > 0 ? todayCrates[0].values[0] : [0, 0]

  const todayFinance = db.exec(`SELECT COUNT(*) as count FROM finance WHERE date = ?`)
  const todayFinanceCount = todayFinance.length > 0 ? (todayFinance[0].values[0][0] as number) : 0

  const recentCustomers = db.exec('SELECT * FROM customers ORDER BY created_at DESC LIMIT 10')
  const recentCustomersData =
    recentCustomers.length > 0
      ? recentCustomers[0].values.map((row) => {
          const obj: any = {}
          recentCustomers[0].columns.forEach((col, i) => (obj[col] = row[i]))
          return obj
        })
      : []

  const recentTransactions = db.exec(`
    SELECT 'weighbridge' as type, id, date, customer_name, total as amount 
    FROM (SELECT w.*, c.name as customer_name FROM weighbridge w JOIN customers c ON w.customer_id = c.id)
    WHERE date >= date('now', '-7 days')
    
    UNION ALL
    
    SELECT 'finance' as type, id, date, customer_name, amount_received as amount 
    FROM (SELECT f.*, c.name as customer_name FROM finance f JOIN customers c ON f.customer_id = c.id)
    WHERE date >= date('now', '-7 days') AND amount_received > 0
    
    ORDER BY date DESC
    LIMIT 20
  `)
  const recentTransactionsData =
    recentTransactions.length > 0
      ? recentTransactions[0].values.map((row) => {
          const obj: any = {}
          recentTransactions[0].columns.forEach((col, i) => (obj[col] = row[i]))
          return obj
        })
      : []

  return {
    report_date: today,
    customers: {
      total: customersList.length,
      suppliers,
      traders,
      factories
    },
    today: {
      weighbridge_transactions: todayWeighbridgeCount,
      crates_out: (todayCratesData[0] as number) || 0,
      crates_returned: (todayCratesData[1] as number) || 0,
      financial_transactions: todayFinanceCount
    },
    recent_customers: recentCustomersData,
    recent_transactions: recentTransactionsData
  }
}

export function generateExcelReport(reportData: ReportData, summary: ReportSummary): Buffer {
  const wb = XLSX.utils.book_new()

  const companyName = reportData.settings.company_name || 'مصنع التمور'
  const reportDate = summary.report_date

  const summaryData = [
    ['تقرير حالة المصنع'],
    [`الشركة: ${companyName}`],
    [`التاريخ: ${reportDate}`],
    [''],
    ['إحصائيات العملاء'],
    ['إجمالي العملاء', summary.customers.total],
    ['الموردين', summary.customers.suppliers],
    ['التجار', summary.customers.traders],
    ['المصانع', summary.customers.factories],
    [''],
    ['إحصائيات اليوم'],
    ['عمليات الميزان', summary.today.weighbridge_transactions],
    ['الصناديق الصادرة', summary.today.crates_out],
    ['الصناديق المرتجعة', summary.today.crates_returned],
    ['المعاملات المالية', summary.today.financial_transactions]
  ]

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, summaryWs, 'الملخص')

  if (reportData.customers.length > 0) {
    const customersHeader = [['المعرف', 'الاسم', 'النوع', 'الهاتف', 'تاريخ الإضافة']]
    const customersRows = reportData.customers.map((c) => [
      c.id,
      c.name,
      c.type,
      c.phone || '',
      new Date(c.created_at).toLocaleDateString('ar-EG')
    ])
    const customersWs = XLSX.utils.aoa_to_sheet([...customersHeader, ...customersRows])
    XLSX.utils.book_append_sheet(wb, customersWs, 'العملاء')
  }

  if (reportData.weighbridge.length > 0) {
    const weighbridgeHeader = [
      [
        'المعرف',
        'التاريخ',
        'العميل',
        'نوع التمر',
        'الوزن الإجمالي',
        'الوزن الصافي',
        'السعر/قنطار',
        'الإجمالي',
        'عدد الصناديق',
        'العمولة',
        'ملاحظات'
      ]
    ]
    const weighbridgeRows = reportData.weighbridge.map((w) => [
      w.id,
      w.date,
      w.customer_name,
      w.date_type_name || '-',
      w.gross_weight || 0,
      w.net_weight,
      w.price_per_qantar,
      w.total,
      w.crates_count || 0,
      w.commission || 0,
      w.notes || ''
    ])
    const weighbridgeWs = XLSX.utils.aoa_to_sheet([...weighbridgeHeader, ...weighbridgeRows])
    XLSX.utils.book_append_sheet(wb, weighbridgeWs, 'الميزان')
  }

  if (reportData.crates.length > 0) {
    const cratesHeader = [
      ['المعرف', 'التاريخ', 'العميل', 'نوع الصندوق', 'صادرة', 'مرتجعة', 'المسؤول', 'ملاحظات']
    ]
    const cratesRows = reportData.crates.map((c) => [
      c.id,
      c.date,
      c.customer_name,
      c.crate_type_name || '-',
      c.crates_out,
      c.crates_returned,
      c.handler || '-',
      c.notes || ''
    ])
    const cratesWs = XLSX.utils.aoa_to_sheet([...cratesHeader, ...cratesRows])
    XLSX.utils.book_append_sheet(wb, cratesWs, 'الصناديق')
  }

  if (reportData.finance.length > 0) {
    const financeHeader = [
      ['المعرف', 'التاريخ', 'العميل', 'نوع المعاملة', 'مدفوع', 'مستلم', 'ملاحظات']
    ]
    const financeRows = reportData.finance.map((f) => [
      f.id,
      f.date,
      f.customer_name,
      f.transaction_type,
      f.amount_paid || 0,
      f.amount_received || 0,
      f.notes || ''
    ])
    const financeWs = XLSX.utils.aoa_to_sheet([...financeHeader, ...financeRows])
    XLSX.utils.book_append_sheet(wb, financeWs, 'المالية')
  }

  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return Buffer.from(excelBuffer)
}

export function generateJsonReport(reportData: ReportData, summary: ReportSummary): string {
  const report = {
    ...summary,
    detailed_data: {
      customers: reportData.customers.slice(0, 20),
      weighbridge: reportData.weighbridge.slice(0, 20),
      crates: reportData.crates.slice(0, 20),
      finance: reportData.finance.slice(0, 20)
    }
  }
  return JSON.stringify(report, null, 2)
}

export async function sendReportToTelegram(
  telegramToken: string,
  chatId: string,
  excelBuffer: Buffer,
  jsonReport: string,
  summary: ReportSummary
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const bot = new TelegramBot(telegramToken, { polling: false })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_')
    const companyName = summary.customers.total > 0 ? 'تقرير المصنع' : 'تقرير المصنع'

    const caption = `
📊 ${companyName}
📅 التاريخ: ${summary.report_date}

👥 إحصائيات العملاء:
• إجمالي: ${summary.customers.total}
• موردين: ${summary.customers.suppliers}
• تجار: ${summary.customers.traders}
• مصانع: ${summary.customers.factories}

📈 اليوم:
• عمليات الميزان: ${summary.today.weighbridge_transactions}
• الصناديق الصادرة: ${summary.today.crates_out}
• الصناديق المرتجعة: ${summary.today.crates_returned}
• المعاملات المالية: ${summary.today.financial_transactions}
    `.trim()

    await bot.sendDocument(
      chatId,
      excelBuffer,
      {},
      {
        filename: `تقرير_${timestamp}.xlsx`,
        caption: caption
      }
    )

    await bot.sendDocument(
      chatId,
      Buffer.from(jsonReport),
      {},
      {
        filename: `تقرير_${timestamp}.json`,
        caption: '📄 تقرير بصيغة JSON (بيانات تفصيلية)'
      }
    )

    return { success: true, message: 'تم إرسال التقرير بنجاح' }
  } catch (error: any) {
    console.error('Telegram send error:', error)
    return { success: false, error: error.message || 'فشل إرسال التقرير' }
  }
}
