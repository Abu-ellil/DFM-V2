// Migration script to swap amount_paid and amount_received in finance table
// Run this script with: npx ts-node scripts/migrate-finance-data.ts

import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(__dirname, '..', 'date_factory_v2.db')
const BACKUP_PATH = path.join(__dirname, '..', `date_factory_v2_backup_${Date.now()}.db`)

async function migrate() {
  console.log('🔄 بدء ترحيل البيانات المالية...')
  
  // Create backup
  console.log('📦 إنشاء نسخة احتياطية...')
  fs.copyFileSync(DB_PATH, BACKUP_PATH)
  console.log(`✅ تم إنشاء نسخة احتياطية: ${BACKUP_PATH}`)
  
  // Load database
  const SQL = await initSqlJs()
  const fileBuffer = fs.readFileSync(DB_PATH)
  const db = new SQL.Database(fileBuffer)
  
  // Show current data
  console.log('\n📊 البيانات قبل الترحيل:')
  const before = db.exec('SELECT id, customer_id, amount_paid, amount_received FROM finance WHERE amount_paid > 0 OR amount_received > 0')
  if (before.length > 0) {
    console.table(before[0].values.map(row => ({
      id: row[0],
      customer_id: row[1],
      amount_paid: row[2],
      amount_received: row[3]
    })))
  }
  
  // Run migration - swap amount_paid to amount_received
  console.log('\n🔀 جاري نقل البيانات من amount_paid إلى amount_received...')
  db.run(`
    UPDATE finance 
    SET amount_received = amount_paid, 
        amount_paid = 0 
    WHERE amount_paid > 0
  `)
  
  // Show data after migration
  console.log('\n📊 البيانات بعد الترحيل:')
  const after = db.exec('SELECT id, customer_id, amount_paid, amount_received FROM finance WHERE amount_paid > 0 OR amount_received > 0')
  if (after.length > 0) {
    console.table(after[0].values.map(row => ({
      id: row[0],
      customer_id: row[1],
      amount_paid: row[2],
      amount_received: row[3]
    })))
  }
  
  // Save database
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)
  
  console.log('\n✅ تم ترحيل البيانات بنجاح!')
  console.log('📝 تم تعديل المعاملات المالية لتكون مدفوعات للعملاء بدلاً من توريدات.')
  
  db.close()
}

migrate().catch(console.error)
