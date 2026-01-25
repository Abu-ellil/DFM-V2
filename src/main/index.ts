/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { writeFile, readFile } from 'fs/promises'
import * as XLSX from 'xlsx'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initializeDatabase, getDb, saveDatabase, getDbPath } from './db'
import { enqueueChange } from './sync/queue'
import bcrypt from 'bcryptjs'
import {
  generateReportData,
  generateReportSummary,
  generateExcelReport,
  generateJsonReport,
  sendReportToTelegram
} from './reports'
import {
  startTelegramBot,
  stopTelegramBot,
  restartTelegramBot,
  testBotConnection,
  getBotStats
} from './telegram'

// Import license manager
import * as licenseManager from './license'

let mainWindow: BrowserWindow | null = null

async function createWindow(): Promise<void> {
  // Initialize Database
  try {
    await initializeDatabase()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }

  // Start Telegram bot if configured
  try {
    const botResult = await startTelegramBot()
    if (botResult.success) {
      console.log('Telegram bot started:', botResult.message)
    } else {
      console.log('Telegram bot not started:', botResult.message)
    }
  } catch (error) {
    console.error('Failed to start Telegram bot:', error)
  }

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// IPC Handlers
ipcMain.handle('auth:login', async (_event, { username, password }) => {
  try {
    const db = getDb()
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?')
    stmt.bind([username])

    if (stmt.step()) {
      const user = stmt.getAsObject() as any
      stmt.free()

      const passwordMatch = bcrypt.compareSync(password, user.password)
      if (passwordMatch) {
        return { success: true, user: { id: user.id, username: user.username, role: user.role } }
      }
    } else {
      stmt.free()
    }

    return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, message: 'حدث خطأ أثناء تسجيل الدخول' }
  }
})

// Customers IPC
ipcMain.handle('customers:getAll', async () => {
  try {
    const db = getDb()
    const res = db.exec('SELECT * FROM customers ORDER BY name ASC')
    if (res.length === 0) return []
    const columns = res[0].columns
    return res[0].values.map((row) => {
      const obj = {}
      columns.forEach((col, i) => (obj[col] = row[i]))
      return obj
    })
  } catch (error) {
    console.error('Get customers error:', error)
    return []
  }
})

ipcMain.handle('customers:create', async (_event, customer) => {
  try {
    const db = getDb()
    const stmt = db.prepare('INSERT INTO customers (name, type, phone) VALUES (?, ?, ?)')
    stmt.bind([customer.name, customer.type, customer.phone])
    stmt.run()
    stmt.free()

    const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
    await saveDatabase()

    // Enqueue for sync
    await enqueueChange({
      operation: 'INSERT',
      table: 'customers',
      record_id: lastId,
      data: { ...customer, id: lastId, _client_id: null, _synced_at: null, _version: 1 },
      client_timestamp: Date.now()
    }).catch((err) => console.error('Failed to enqueue change:', err))

    return { success: true }
  } catch (error) {
    console.error('Create customer error:', error)
    return { success: false, message: 'حدث خطأ أثناء إضافة العميل' }
  }
})

ipcMain.handle('customers:update', async (_event, id, customer) => {
  try {
    const db = getDb()
    const stmt = db.prepare('UPDATE customers SET name = ?, type = ?, phone = ? WHERE id = ?')
    stmt.bind([customer.name, customer.type, customer.phone, id])
    stmt.run()
    stmt.free()
    await saveDatabase()

    // Enqueue for sync
    await enqueueChange({
      operation: 'UPDATE',
      table: 'customers',
      record_id: id,
      data: customer,
      client_timestamp: Date.now()
    }).catch((err) => console.error('Failed to enqueue change:', err))

    return { success: true }
  } catch (error) {
    console.error('Update customer error:', error)
    return { success: false, message: 'حدث خطأ أثناء تعديل العميل' }
  }
})

ipcMain.handle('customers:delete', async (_event, id) => {
  try {
    const db = getDb()
    const stmt = db.prepare('DELETE FROM customers WHERE id = ?')
    stmt.bind([id])
    stmt.run()
    stmt.free()
    await saveDatabase()

    // Enqueue for sync
    await enqueueChange({
      operation: 'DELETE',
      table: 'customers',
      record_id: id,
      data: { id },
      client_timestamp: Date.now()
    }).catch((err) => console.error('Failed to enqueue change:', err))

    return { success: true }
  } catch (error) {
    console.error('Delete customer error:', error)
    return { success: false, message: 'حدث خطأ أثناء حذف العميل' }
  }
})

// Date Types & Crate Types IPC
ipcMain.handle('dateTypes:getAll', async () => {
  try {
    const db = getDb()
    const res = db.exec('SELECT * FROM date_types ORDER BY name ASC')
    if (res.length === 0) return []
    const columns = res[0].columns
    return res[0].values.map((row) => {
      const obj = {}
      columns.forEach((col, i) => (obj[col] = row[i]))
      return obj
    })
  } catch {
    return []
  }
})

ipcMain.handle('dateTypes:create', async (_event, name) => {
  try {
    const db = getDb()
    const stmt = db.prepare('INSERT INTO date_types (name) VALUES (?)')
    stmt.bind([name])
    stmt.run()
    stmt.free()
    await saveDatabase()
    return { success: true }
  } catch {
    return { success: false, message: 'فشل إضافة النوع' }
  }
})

ipcMain.handle('dateTypes:delete', async (_event, id) => {
  try {
    const db = getDb()
    const stmt = db.prepare('DELETE FROM date_types WHERE id = ?')
    stmt.bind([id])
    stmt.run()
    stmt.free()
    await saveDatabase()
    return { success: true }
  } catch {
    return { success: false, message: 'فشل حذف النوع' }
  }
})

ipcMain.handle('crateTypes:getAll', async () => {
  try {
    const db = getDb()
    const res = db.exec('SELECT * FROM crate_types ORDER BY name ASC')
    if (res.length === 0) return []
    const columns = res[0].columns
    return res[0].values.map((row) => {
      const obj = {}
      columns.forEach((col, i) => (obj[col] = row[i]))
      return obj
    })
  } catch {
    return []
  }
})

ipcMain.handle('crateTypes:create', async (_event, { name, weight }) => {
  try {
    const db = getDb()
    const stmt = db.prepare('INSERT INTO crate_types (name, weight) VALUES (?, ?)')
    stmt.bind([name, weight])
    stmt.run()
    stmt.free()
    await saveDatabase()
    return { success: true }
  } catch {
    return { success: false, message: 'فشل إضافة نوع الصندوق' }
  }
})

ipcMain.handle('crateTypes:delete', async (_event, id) => {
  try {
    const db = getDb()
    const stmt = db.prepare('DELETE FROM crate_types WHERE id = ?')
    stmt.bind([id])
    stmt.run()
    stmt.free()
    await saveDatabase()
    return { success: true }
  } catch {
    return { success: false, message: 'فشل حذف نوع الصندوق' }
  }
})

// Supervisors IPC
ipcMain.handle('supervisors:getAll', async () => {
  try {
    const db = getDb()
    const res = db.exec('SELECT * FROM supervisors ORDER BY name ASC')
    if (res.length === 0) return []
    const columns = res[0].columns
    return res[0].values.map((row) => {
      const obj = {}
      columns.forEach((col, i) => (obj[col] = row[i]))
      return obj
    })
  } catch {
    return []
  }
})

ipcMain.handle('supervisors:create', async (_event, name) => {
  try {
    const db = getDb()
    const stmt = db.prepare('INSERT INTO supervisors (name) VALUES (?)')
    stmt.bind([name])
    stmt.run()
    stmt.free()
    await saveDatabase()
    return { success: true }
  } catch {
    return { success: false, message: 'فشل إضافة المشرف' }
  }
})

ipcMain.handle('supervisors:delete', async (_event, id) => {
  try {
    const db = getDb()
    const stmt = db.prepare('DELETE FROM supervisors WHERE id = ?')
    stmt.bind([id])
    stmt.run()
    stmt.free()
    await saveDatabase()
    return { success: true }
  } catch {
    return { success: false, message: 'فشل حذف المشرف' }
  }
})

// Weighbridge IPC
ipcMain.handle('weighbridge:getAll', async () => {
  try {
    const db = getDb()
    const res = db.exec(`
      SELECT w.*, c.name as customer_name, dt.name as date_type_name 
      FROM weighbridge w
      JOIN customers c ON w.customer_id = c.id
      LEFT JOIN date_types dt ON w.date_type_id = dt.id
      ORDER BY w.date DESC, w.id DESC
    `)
    if (res.length === 0) return []
    const columns = res[0].columns
    return res[0].values.map((row) => {
      const obj = {}
      columns.forEach((col, i) => (obj[col] = row[i]))
      return obj
    })
  } catch (error) {
    console.error('Get weighbridge error:', error)
    return []
  }
})

ipcMain.handle('weighbridge:create', async (_event, data) => {
  try {
    const db = getDb()
    const stmt = db.prepare(`
      INSERT INTO weighbridge (date, customer_id, date_type_id, gross_weight, net_weight, price_per_qantar, total, crates_count, commission, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.bind([
      data.date,
      data.customer_id,
      data.date_type_id,
      data.gross_weight,
      data.net_weight,
      data.price_per_qantar,
      data.total,
      data.crates_count,
      data.commission,
      data.notes
    ])
    stmt.run()
    stmt.free()

    const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
    await saveDatabase()

    // Enqueue for sync
    await enqueueChange({
      operation: 'INSERT',
      table: 'weighbridge',
      record_id: lastId,
      data: { ...data, id: lastId },
      client_timestamp: Date.now()
    }).catch((err) => console.error('Failed to enqueue change:', err))

    return { success: true }
  } catch (error) {
    console.error('Create weighbridge error:', error)
    return { success: false, message: 'حدث خطأ أثناء إضافة عملية الميزان' }
  }
})

// Crates IPC
ipcMain.handle('crates:getAll', async () => {
  try {
    const db = getDb()
    const res = db.exec(`
      SELECT cr.*, c.name as customer_name, ct.name as crate_type_name
      FROM crates cr
      JOIN customers c ON cr.customer_id = c.id
      LEFT JOIN crate_types ct ON cr.crate_type_id = ct.id
      ORDER BY cr.date DESC, cr.id DESC
    `)
    if (res.length === 0) return []
    const columns = res[0].columns
    return res[0].values.map((row) => {
      const obj = {}
      columns.forEach((col, i) => (obj[col] = row[i]))
      return obj
    })
  } catch (error) {
    console.error('Get crates error:', error)
    return []
  }
})

ipcMain.handle('crates:getSummary', async () => {
  try {
    const db = getDb()
    const res = db.exec(`
      SELECT 
        c.name as customer_name,
        SUM(cr.crates_out) as total_out,
        SUM(cr.crates_returned) as total_returned,
        (SUM(cr.crates_out) - SUM(cr.crates_returned)) as balance
      FROM crates cr
      JOIN customers c ON cr.customer_id = c.id
      GROUP BY cr.customer_id
      HAVING balance > 0
    `)
    if (res.length === 0) return []
    const columns = res[0].columns
    return res[0].values.map((row) => {
      const obj = {}
      columns.forEach((col, i) => (obj[col] = row[i]))
      return obj
    })
  } catch (error) {
    console.error('Get crates summary error:', error)
    return []
  }
})

ipcMain.handle('crates:create', async (_event, data) => {
  try {
    const db = getDb()
    const stmt = db.prepare(`
      INSERT INTO crates (date, customer_id, crate_type_id, crates_out, crates_returned, handler, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.bind([
      data.date,
      data.customer_id,
      data.crate_type_id,
      data.crates_out,
      data.crates_returned,
      data.handler,
      data.notes
    ])
    stmt.run()
    stmt.free()

    const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
    await saveDatabase()

    // Enqueue for sync
    await enqueueChange({
      operation: 'INSERT',
      table: 'crates',
      record_id: lastId,
      data: { ...data, id: lastId },
      client_timestamp: Date.now()
    }).catch((err) => console.error('Failed to enqueue change:', err))

    return { success: true }
  } catch (error) {
    console.error('Create crate transaction error:', error)
    return { success: false, message: 'حدث خطأ أثناء إضافة عملية الصناديق' }
  }
})

ipcMain.handle('crates:update', async (_event, id, data) => {
  try {
    const db = getDb()
    const stmt = db.prepare(`
      UPDATE crates
      SET date = ?, customer_id = ?, crate_type_id = ?, crates_out = ?, crates_returned = ?, handler = ?, notes = ?
      WHERE id = ?
    `)
    stmt.bind([
      data.date,
      data.customer_id,
      data.crate_type_id,
      data.crates_out,
      data.crates_returned,
      data.handler,
      data.notes,
      id
    ])
    stmt.run()
    stmt.free()
    await saveDatabase()

    // Enqueue for sync
    await enqueueChange({
      operation: 'UPDATE',
      table: 'crates',
      record_id: id,
      data: data,
      client_timestamp: Date.now()
    }).catch((err) => console.error('Failed to enqueue change:', err))

    return { success: true }
  } catch (error) {
    console.error('Update crate transaction error:', error)
    return { success: false, message: 'حدث خطأ أثناء تحديث عملية الصناديق' }
  }
})

ipcMain.handle('crates:delete', async (_event, id) => {
  try {
    const db = getDb()
    const stmt = db.prepare('DELETE FROM crates WHERE id = ?')
    stmt.bind([id])
    stmt.run()
    stmt.free()
    await saveDatabase()

    // Enqueue for sync
    await enqueueChange({
      operation: 'DELETE',
      table: 'crates',
      record_id: id,
      data: { id },
      client_timestamp: Date.now()
    }).catch((err) => console.error('Failed to enqueue change:', err))

    return { success: true }
  } catch (error) {
    console.error('Delete crate transaction error:', error)
    return { success: false, message: 'حدث خطأ أثناء حذف عملية الصناديق' }
  }
})

// Finance IPC
ipcMain.handle('finance:getAll', async () => {
  try {
    const db = getDb()
    const res = db.exec(`
      SELECT f.*, c.name as customer_name
      FROM finance f
      JOIN customers c ON f.customer_id = c.id
      ORDER BY f.date DESC, f.id DESC
    `)
    if (res.length === 0) return []
    const columns = res[0].columns
    return res[0].values.map((row) => {
      const obj = {}
      columns.forEach((col, i) => (obj[col] = row[i]))
      return obj
    })
  } catch (error) {
    console.error('Get finance error:', error)
    return []
  }
})

ipcMain.handle('finance:getSummary', async () => {
  try {
    const db = getDb()
    const res = db.exec(`
      SELECT 
        c.name as customer_name,
        SUM(f.amount_paid) as total_paid,
        SUM(f.amount_received) as total_received,
        (SUM(f.amount_received) - SUM(f.amount_paid)) as balance
      FROM finance f
      JOIN customers c ON f.customer_id = c.id
      GROUP BY f.customer_id
    `)
    if (res.length === 0) return []
    const columns = res[0].columns
    return res[0].values.map((row) => {
      const obj = {}
      columns.forEach((col, i) => (obj[col] = row[i]))
      return obj
    })
  } catch (error) {
    console.error('Get finance summary error:', error)
    return []
  }
})

ipcMain.handle('finance:create', async (_event, data) => {
  try {
    const db = getDb()
    const stmt = db.prepare(`
      INSERT INTO finance (date, customer_id, transaction_type, amount_paid, amount_received, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    stmt.bind([
      data.date,
      data.customer_id,
      data.transaction_type,
      data.amount_paid,
      data.amount_received,
      data.notes
    ])
    stmt.run()
    stmt.free()

    const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
    await saveDatabase()

    // Enqueue for sync
    await enqueueChange({
      operation: 'INSERT',
      table: 'finance',
      record_id: lastId,
      data: { ...data, id: lastId },
      client_timestamp: Date.now()
    }).catch((err) => console.error('Failed to enqueue change:', err))

    return { success: true }
  } catch (error) {
    console.error('Create finance transaction error:', error)
    return { success: false, message: 'حدث خطأ أثناء إضافة العملية المالية' }
  }
})

ipcMain.handle('finance:update', async (_event, id, data) => {
  try {
    const db = getDb()
    const stmt = db.prepare(`
      UPDATE finance
      SET date = ?, customer_id = ?, transaction_type = ?, amount_paid = ?, amount_received = ?, notes = ?
      WHERE id = ?
    `)
    stmt.bind([
      data.date,
      data.customer_id,
      data.transaction_type,
      data.amount_paid,
      data.amount_received,
      data.notes,
      id
    ])
    stmt.run()
    stmt.free()
    await saveDatabase()

    // Enqueue for sync
    await enqueueChange({
      operation: 'UPDATE',
      table: 'finance',
      record_id: id,
      data: data,
      client_timestamp: Date.now()
    }).catch((err) => console.error('Failed to enqueue change:', err))

    return { success: true }
  } catch (error) {
    console.error('Update finance transaction error:', error)
    return { success: false, message: 'حدث خطأ أثناء تحديث العملية المالية' }
  }
})

ipcMain.handle('finance:delete', async (_event, id) => {
  try {
    const db = getDb()
    const stmt = db.prepare('DELETE FROM finance WHERE id = ?')
    stmt.bind([id])
    stmt.run()
    stmt.free()
    await saveDatabase()

    // Enqueue for sync
    await enqueueChange({
      operation: 'DELETE',
      table: 'finance',
      record_id: id,
      data: { id },
      client_timestamp: Date.now()
    }).catch((err) => console.error('Failed to enqueue change:', err))

    return { success: true }
  } catch (error) {
    console.error('Delete finance transaction error:', error)
    return { success: false, message: 'حدث خطأ أثناء حذف العملية المالية' }
  }
})

// Security IPC
ipcMain.handle('auth:changePassword', async (_event, { oldPassword, newPassword }) => {
  try {
    const db = getDb()
    const stmt = db.prepare("SELECT * FROM users WHERE username = 'admin'")
    if (stmt.step()) {
      const user = stmt.getAsObject() as any
      stmt.free()

      const passwordMatch = bcrypt.compareSync(oldPassword, user.password)
      if (!passwordMatch) {
        return { success: false, message: 'كلمة المرور القديمة غير صحيحة' }
      }

      const salt = bcrypt.genSaltSync(10)
      const hash = bcrypt.hashSync(newPassword, salt)
      const updateStmt = db.prepare("UPDATE users SET password = ? WHERE username = 'admin'")
      updateStmt.bind([hash])
      updateStmt.run()
      updateStmt.free()
      await saveDatabase()
      return { success: true, message: 'تم تغيير كلمة المرور بنجاح' }
    }
    stmt.free()
    return { success: false, message: 'لم يتم العثور على حساب المشرف' }
  } catch (error) {
    console.error('Change password error:', error)
    return { success: false, message: 'حدث خطأ أثناء تغيير كلمة المرور' }
  }
})

ipcMain.handle('settings:deleteAllData', async () => {
  try {
    const db = getDb()
    // List of tables to clear
    const tables = [
      'weighbridge',
      'crates',
      'finance',
      'customers',
      'date_types',
      'crate_types',
      'supervisors',
      'daily_prices'
    ]

    db.run('BEGIN TRANSACTION')
    try {
      for (const table of tables) {
        const stmt = db.prepare(`DELETE FROM ${table}`)
        stmt.run()
        stmt.free()
      }
      db.run('COMMIT')
    } catch (err) {
      db.run('ROLLBACK')
      throw err
    }

    await saveDatabase()
    return { success: true, message: 'تم حذف كافة البيانات بنجاح' }
  } catch (error: any) {
    console.error('Delete all data error:', error)
    return { success: false, message: error.message || 'حدث خطأ أثناء حذف البيانات' }
  }
})

// Settings IPC
ipcMain.handle('settings:getAll', async () => {
  try {
    const db = getDb()
    const res = db.exec('SELECT * FROM settings')
    if (res.length === 0) return {}
    const settings = {}
    res[0].values.forEach((row) => {
      settings[row[0] as string] = row[1]
    })
    return settings
  } catch (error) {
    console.error('Get settings error:', error)
    return {}
  }
})

ipcMain.handle('settings:update', async (_event, key, value) => {
  try {
    const db = getDb()
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    stmt.bind([key, value])
    stmt.run()
    stmt.free()
    await saveDatabase()
    return { success: true }
  } catch (error) {
    console.error('Update settings error:', error)
    return { success: false }
  }
})

ipcMain.handle('settings:sync', async () => {
  try {
    const db = getDb()
    const data = db.export()

    if (!mainWindow) {
      throw new Error('Main window not found')
    }

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'حفظ نسخة احتياطية',
      defaultPath: `backup-${new Date().toISOString().split('T')[0]}.sqlite`,
      filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }]
    })

    if (filePath) {
      await writeFile(filePath, Buffer.from(data))
      return { success: true }
    }
    return { success: false }
  } catch (error: any) {
    console.error('Sync error:', error)
    // Rethrow to be caught by renderer's catch block, or return success: false
    // Given the renderer handles both, let's return a clear error
    return { success: false, message: error.message || 'حدث خطأ أثناء التصدير' }
  }
})

ipcMain.handle('settings:importDb', async () => {
  try {
    if (!mainWindow) {
      throw new Error('Main window not found')
    }

    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'اختر ملف قاعدة البيانات للاستيراد',
      filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
      properties: ['openFile']
    })

    if (filePaths && filePaths.length > 0) {
      const data = await readFile(filePaths[0])

      // Get the correct database path
      const dbPath = getDbPath()

      // Write the new database file
      await writeFile(dbPath, data)

      // Re-initialize the DB
      await initializeDatabase(true)

      return { success: true, message: 'تم استيراد قاعدة البيانات بنجاح' }
    }
    return { success: false }
  } catch (error: any) {
    console.error('Import DB error:', error)
    return { success: false, message: error.message || 'فشل استيراد قاعدة البيانات' }
  }
})

ipcMain.handle('settings:importExcel', async () => {
  try {
    console.log('Main: Starting Excel import dialog...')

    if (!mainWindow) {
      throw new Error('Main window not found')
    }

    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'اختر ملف Excel للاستيراد',
      filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls', 'csv'] }],
      properties: ['openFile']
    })

    if (filePaths && filePaths.length > 0) {
      console.log('Main: File selected:', filePaths[0])
      const buffer = await readFile(filePaths[0])
      const workbook = XLSX.read(buffer, { type: 'buffer' })

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return { success: false, message: 'الملف لا يحتوي على أوراق عمل' }
      }

      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[]

      if (data.length === 0) {
        console.log('Main: Excel file is empty')
        return { success: false, message: 'الملف فارغ أو غير صالح' }
      }

      const db = getDb()
      let importedCount = 0

      console.log('Main: Starting row processing...')

      // Start transaction for better performance
      const beginStmt = db.prepare('BEGIN TRANSACTION')
      beginStmt.run()
      beginStmt.free()

      try {
        for (const row of data) {
          // Normalize column names (support Arabic and English)
          const name = (
            row['الاسم'] ||
            row['اسم العميل'] ||
            row['Name'] ||
            row['name'] ||
            row['customer_name'] ||
            ''
          )
            .toString()
            .trim()
          const type = (row['النوع'] || row['نوع العميل'] || row['Type'] || row['type'] || 'مورد')
            .toString()
            .trim()
          const phone = (
            row['الهاتف'] ||
            row['رقم الهاتف'] ||
            row['تلفون'] ||
            row['Phone'] ||
            row['phone'] ||
            ''
          )
            .toString()
            .trim()

          if (name) {
            const stmt = db.prepare(
              'INSERT OR IGNORE INTO customers (name, type, phone) VALUES (?, ?, ?)'
            )
            stmt.bind([name, type, phone])
            stmt.run()
            stmt.free()
            importedCount++
          }
        }
        const commitStmt = db.prepare('COMMIT')
        commitStmt.run()
        commitStmt.free()
      } catch (transactionError) {
        const rollbackStmt = db.prepare('ROLLBACK')
        rollbackStmt.run()
        rollbackStmt.free()
        throw transactionError
      }

      await saveDatabase()
      console.log(`Main: Successfully imported ${importedCount} customers`)
      return { success: true, message: `تم استيراد ${importedCount} عميل بنجاح` }
    }
    console.log('Main: Import cancelled by user')
    return { success: false }
  } catch (error: any) {
    console.error('Main: Import Excel error:', error)
    return { success: false, message: `فشل استيراد ملف Excel: ${error.message || 'خطأ غير معروف'}` }
  }
})

ipcMain.handle('reports:exportExcel', async (_event, { title, data }) => {
  try {
    if (!mainWindow) {
      throw new Error('Main window not found')
    }

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'تصدير إلى Excel',
      defaultPath: `${title}-${new Date().toISOString().split('T')[0]}.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    })

    if (filePath) {
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
      await writeFile(filePath, buffer)
      return { success: true }
    }
    return { success: false }
  } catch (error: any) {
    console.error('Export Excel error:', error)
    return { success: false, message: error.message || 'فشل التصدير إلى Excel' }
  }
})

ipcMain.handle('telegram:send', async (_event, { token, chatId, message }) => {
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
    })
    const data = await response.json()
    return { success: data.ok }
  } catch (error) {
    console.error('Telegram error:', error)
    return { success: false }
  }
})

ipcMain.handle('telegram:sendReport', async () => {
  try {
    const db = getDb()

    const settings = db.exec('SELECT * FROM settings')
    const telegramSettings: Record<string, string> = {}
    if (settings.length > 0) {
      settings[0].values.forEach((row) => {
        telegramSettings[row[0] as string] = row[1] as string
      })
    }

    const telegramToken = telegramSettings.telegram_token
    const chatId = telegramSettings.telegram_chat_id

    if (!telegramToken || !chatId) {
      return { success: false, message: 'يرجى إعداد توكن البوت ومعرف الشات أولاً' }
    }

    const reportData = generateReportData(db)
    const summary = generateReportSummary(db)
    const excelBuffer = generateExcelReport(reportData, summary)
    const jsonReport = generateJsonReport(reportData, summary)

    const result = await sendReportToTelegram(
      telegramToken,
      chatId,
      excelBuffer,
      jsonReport,
      summary
    )

    return result
  } catch (error: any) {
    console.error('Send report error:', error)
    return { success: false, error: error.message || 'فشل إرسال التقرير' }
  }
})

// License IPC
ipcMain.handle('license:getInfo', async () => {
  return licenseManager.getLicenseInfo()
})

ipcMain.handle('license:getMachineId', async () => {
  try {
    const machineId = licenseManager.getMachineId()
    console.log('License: Machine ID retrieved:', machineId)
    return { success: true, machineId }
  } catch (error) {
    console.error('License: Error getting machine ID:', error)
    return { success: false, message: 'فشل الحصول على معرف الجهاز' }
  }
})

ipcMain.handle('license:activate', async (_event, { licenseKey, factoryName }) => {
  if (licenseManager.validateLicense(licenseKey)) {
    const success = licenseManager.saveLicense(licenseKey, factoryName || '')
    return { success, message: success ? 'تم تفعيل البرنامج بنجاح' : 'فشل حفظ ملف الترخيص' }
  }
  return { success: false, message: 'مفتاح الترخيص غير صالح لهذا الجهاز' }
})

ipcMain.handle('license:check', async () => {
  return await licenseManager.isLicensed()
})

ipcMain.handle('license:openTrialRequest', async () => {
  const TRIAL_REQUEST_URL =
    process.env.TRIAL_REQUEST_URL || 'https://dates-factory-manager-cloud.vercel.app/trial'
  shell.openExternal(TRIAL_REQUEST_URL)
  return { success: true }
})

// Duplicates IPC
ipcMain.handle('duplicates:getAll', async () => {
  try {
    const db = getDb()
    const duplicates: any = {
      weighbridge: [],
      crates: [],
      finance: [],
      summary: { total: 0, byTable: {} }
    }

    // Helper to execute query and return objects
    const query = (sql: string) => {
      const res = db.exec(sql)
      if (res.length === 0) return []
      const columns = res[0].columns
      return res[0].values.map((row) => {
        const obj = {}
        columns.forEach((col, i) => (obj[col] = row[i]))
        return obj
      })
    }

    // 1. Weighbridge duplicates
    duplicates.weighbridge = query(`
      SELECT w.*, c.name as customer_name,
             (SELECT COUNT(*) FROM weighbridge w2 
              WHERE w2.date = w.date 
              AND w2.customer_id = w.customer_id 
              AND w2.gross_weight = w.gross_weight 
              AND w2.net_weight = w.net_weight) as duplicate_count
      FROM weighbridge w
      LEFT JOIN customers c ON w.customer_id = c.id
      WHERE (w.date || w.customer_id || w.gross_weight || w.net_weight) IN (
          SELECT (date || customer_id || gross_weight || net_weight)
          FROM weighbridge 
          GROUP BY date, customer_id, gross_weight, net_weight 
          HAVING COUNT(*) > 1
      )
      ORDER BY w.date DESC, w.customer_id, w.id
    `)
    duplicates.summary.byTable.weighbridge = duplicates.weighbridge.length

    // 2. Crates duplicates
    duplicates.crates = query(`
      SELECT cr.*, c.name as customer_name,
             (SELECT COUNT(*) FROM crates cr2 
              WHERE cr2.date = cr.date 
              AND cr2.customer_id = cr.customer_id 
              AND cr2.crates_out = cr.crates_out 
              AND cr2.crates_returned = cr.crates_returned) as duplicate_count
      FROM crates cr
      LEFT JOIN customers c ON cr.customer_id = c.id
      WHERE (cr.date || cr.customer_id || cr.crates_out || cr.crates_returned) IN (
          SELECT (date || customer_id || crates_out || crates_returned)
          FROM crates 
          GROUP BY date, customer_id, crates_out, crates_returned 
          HAVING COUNT(*) > 1
      )
      ORDER BY cr.date DESC, cr.customer_id, cr.id
    `)
    duplicates.summary.byTable.crates = duplicates.crates.length

    // 3. Finance duplicates
    duplicates.finance = query(`
      SELECT f.*, c.name as customer_name,
             (SELECT COUNT(*) FROM finance f2 
              WHERE f2.date = f.date 
              AND f2.customer_id = f.customer_id 
              AND f2.transaction_type = f.transaction_type
              AND f2.amount_paid = f.amount_paid 
              AND f2.amount_received = f.amount_received) as duplicate_count
      FROM finance f
      LEFT JOIN customers c ON f.customer_id = c.id
      WHERE (f.date || f.customer_id || f.transaction_type || f.amount_paid || f.amount_received) IN (
          SELECT (date || customer_id || transaction_type || amount_paid || amount_received)
          FROM finance 
          GROUP BY date, customer_id, transaction_type, amount_paid, amount_received 
          HAVING COUNT(*) > 1
      )
      ORDER BY f.date DESC, f.customer_id, f.id
    `)
    duplicates.summary.byTable.finance = duplicates.finance.length

    duplicates.summary.total =
      duplicates.weighbridge.length + duplicates.crates.length + duplicates.finance.length

    return duplicates
  } catch (error) {
    console.error('Get duplicates error:', error)
    return { weighbridge: [], crates: [], finance: [], summary: { total: 0, byTable: {} } }
  }
})

ipcMain.handle('duplicates:delete', async (_event, { table, id }) => {
  try {
    const validTables = ['weighbridge', 'crates', 'finance']
    if (!validTables.includes(table)) {
      return { success: false, message: 'جدول غير صالح' }
    }
    const db = getDb()
    const stmt = db.prepare(`DELETE FROM ${table} WHERE id = ?`)
    stmt.bind([id])
    stmt.run()
    stmt.free()
    await saveDatabase()
    return { success: true }
  } catch (error: any) {
    console.error('Delete duplicate error:', error)
    return { success: false, message: error.message }
  }
})

ipcMain.handle('duplicates:autoClean', async () => {
  try {
    const db = getDb()
    let totalCleaned = 0

    const clean = (table: string, columns: string[]) => {
      const columnList = columns.join(', ')
      const stmt = db.prepare(`
        DELETE FROM ${table} 
        WHERE id NOT IN (
            SELECT MIN(id) FROM ${table} GROUP BY ${columnList}
        )
      `)
      stmt.run()
      stmt.free()
      return db.getRowsModified()
    }

    const beginStmt = db.prepare('BEGIN TRANSACTION')
    beginStmt.run()
    beginStmt.free()
    try {
      totalCleaned += clean('weighbridge', ['date', 'customer_id', 'gross_weight', 'net_weight'])
      totalCleaned += clean('crates', ['date', 'customer_id', 'crates_out', 'crates_returned'])
      totalCleaned += clean('finance', [
        'date',
        'customer_id',
        'transaction_type',
        'amount_paid',
        'amount_received'
      ])
      const commitStmt = db.prepare('COMMIT')
      commitStmt.run()
      commitStmt.free()
    } catch (err) {
      const rollbackStmt = db.prepare('ROLLBACK')
      rollbackStmt.run()
      rollbackStmt.free()
      throw err
    }

    await saveDatabase()
    return { success: true, count: totalCleaned }
  } catch (error: any) {
    console.error('Auto clean duplicates error:', error)
    return { success: false, message: error.message }
  }
})

// Telegram Bot IPC Handlers
ipcMain.handle('telegram:startBot', async () => {
  return startTelegramBot()
})

ipcMain.handle('telegram:stopBot', async () => {
  return stopTelegramBot()
})

ipcMain.handle('telegram:restartBot', async () => {
  return restartTelegramBot()
})

ipcMain.handle('telegram:testConnection', async (_event, token?) => {
  return testBotConnection(token)
})

ipcMain.handle('telegram:getStats', async () => {
  return getBotStats()
})

// Telegram Users IPC
ipcMain.handle('telegram:getUsers', async (_event, filters) => {
  try {
    const db = getDb()
    let query = `
      SELECT tu.*, ur.role
      FROM telegram_users tu
      LEFT JOIN user_roles ur ON tu.user_id = ur.user_id
    `
    const params: any[] = []
    const conditions: string[] = []

    if (filters?.status) {
      conditions.push('tu.status = ?')
      params.push(filters.status)
    }

    if (filters?.role) {
      conditions.push('ur.role = ?')
      params.push(filters.role)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY tu.registration_date DESC'

    if (filters?.limit) {
      query += ' LIMIT ?'
      params.push(filters.limit)
      if (filters?.offset) {
        query += ' OFFSET ?'
        params.push(filters.offset)
      }
    }

    const stmt = db.prepare(query)
    params.forEach((param) => stmt.bind([param]))

    const users: any[] = []
    while (stmt.step()) {
      users.push(stmt.getAsObject())
    }
    stmt.free()

    return { success: true, data: users }
  } catch (error: any) {
    console.error('Get telegram users error:', error)
    return { success: false, message: error.message || 'Failed to get users' }
  }
})

ipcMain.handle('telegram:updateUser', async (_event, telegramId, data) => {
  try {
    const db = getDb()
    const updates: string[] = []
    const params: any[] = []

    if (data.status !== undefined) {
      updates.push('status = ?')
      params.push(data.status)
    }

    if (data.role !== undefined) {
      // Update role in user_roles table
      const getUserIdStmt = db.prepare('SELECT user_id FROM telegram_users WHERE telegram_id = ?')
      getUserIdStmt.bind([telegramId])
      getUserIdStmt.step()
      const userIdResult = getUserIdStmt.getAsObject() as any
      getUserIdStmt.free()

      if (userIdResult?.user_id) {
        // Check if role exists
        const checkRoleStmt = db.prepare('SELECT * FROM user_roles WHERE user_id = ?')
        checkRoleStmt.bind([userIdResult.user_id])
        if (checkRoleStmt.step()) {
          const updateRoleStmt = db.prepare('UPDATE user_roles SET role = ? WHERE user_id = ?')
          updateRoleStmt.bind([data.role, userIdResult.user_id])
          updateRoleStmt.run()
          updateRoleStmt.free()
        } else {
          const insertRoleStmt = db.prepare('INSERT INTO user_roles (user_id, role) VALUES (?, ?)')
          insertRoleStmt.bind([userIdResult.user_id, data.role])
          insertRoleStmt.run()
          insertRoleStmt.free()
        }
        checkRoleStmt.free()
      }
    }

    if (updates.length > 0) {
      params.push(telegramId)
      const stmt = db.prepare(
        `UPDATE telegram_users SET ${updates.join(', ')} WHERE telegram_id = ?`
      )
      stmt.bind(params)
      stmt.run()
      stmt.free()
    }

    await saveDatabase()
    return { success: true }
  } catch (error: any) {
    console.error('Update telegram user error:', error)
    return { success: false, message: error.message || 'Failed to update user' }
  }
})

ipcMain.handle('telegram:deleteUser', async (_event, telegramId) => {
  try {
    const db = getDb()

    // Delete user roles
    const deleteRoleStmt = db.prepare(`
      DELETE FROM user_roles
      WHERE user_id IN (SELECT user_id FROM telegram_users WHERE telegram_id = ?)
    `)
    deleteRoleStmt.bind([telegramId])
    deleteRoleStmt.run()
    deleteRoleStmt.free()

    // Delete notifications
    const deleteNotifStmt = db.prepare('DELETE FROM notification_queue WHERE telegram_id = ?')
    deleteNotifStmt.bind([telegramId])
    deleteNotifStmt.run()
    deleteNotifStmt.free()

    // Delete preferences
    const deletePrefStmt = db.prepare('DELETE FROM notification_preferences WHERE telegram_id = ?')
    deletePrefStmt.bind([telegramId])
    deletePrefStmt.run()
    deletePrefStmt.free()

    // Delete user
    const deleteStmt = db.prepare('DELETE FROM telegram_users WHERE telegram_id = ?')
    deleteStmt.bind([telegramId])
    deleteStmt.run()
    deleteStmt.free()

    await saveDatabase()
    return { success: true }
  } catch (error: any) {
    console.error('Delete telegram user error:', error)
    return { success: false, message: error.message || 'Failed to delete user' }
  }
})

// Telegram Registrations IPC
ipcMain.handle('telegram:getRegistrations', async (_event, filters) => {
  try {
    const { getRegistrationHandler } = require('./telegram/handlers/registration')
    const handler = getRegistrationHandler()
    const registrations = await handler.getRegistrations(filters)
    return { success: true, data: registrations }
  } catch (error: any) {
    console.error('Get registrations error:', error)
    return { success: false, message: error.message || 'Failed to get registrations' }
  }
})

ipcMain.handle(
  'telegram:approveRegistration',
  async (_event, registrationId, role, reviewerUserId) => {
    try {
      const { getRegistrationHandler } = require('./telegram/handlers/registration')
      const handler = getRegistrationHandler()
      const result = await handler.approveRegistration(registrationId, role, reviewerUserId)
      return result
    } catch (error: any) {
      console.error('Approve registration error:', error)
      return { success: false, message: error.message || 'Failed to approve registration' }
    }
  }
)

ipcMain.handle(
  'telegram:rejectRegistration',
  async (_event, registrationId, reason, reviewerUserId) => {
    try {
      const { getRegistrationHandler } = require('./telegram/handlers/registration')
      const handler = getRegistrationHandler()
      const result = await handler.rejectRegistration(registrationId, reason, reviewerUserId)
      return result
    } catch (error: any) {
      console.error('Reject registration error:', error)
      return { success: false, message: error.message || 'Failed to reject registration' }
    }
  }
)

// Sync IPC Handlers
ipcMain.handle('sync:getStatus', async () => {
  try {
    const { getSyncStatus } = require('./sync')
    const status = await getSyncStatus()
    return { success: true, data: status }
  } catch (error: any) {
    console.error('Get sync status error:', error)
    return { success: false, message: error.message || 'Failed to get sync status' }
  }
})

ipcMain.handle('sync:manualSync', async () => {
  try {
    const { manualSync } = require('./sync')
    const result = await manualSync()
    return { success: true, data: result }
  } catch (error: any) {
    console.error('Manual sync error:', error)
    return { success: false, message: error.message || 'Sync failed' }
  }
})

ipcMain.handle('sync:enable', async () => {
  try {
    const { enableSync } = require('./sync')
    enableSync()
    return { success: true }
  } catch (error: any) {
    console.error('Enable sync error:', error)
    return { success: false, message: error.message || 'Failed to enable sync' }
  }
})

ipcMain.handle('sync:disable', async () => {
  try {
    const { disableSync } = require('./sync')
    disableSync()
    return { success: true }
  } catch (error: any) {
    console.error('Disable sync error:', error)
    return { success: false, message: error.message || 'Failed to disable sync' }
  }
})

ipcMain.handle('sync:getConflicts', async (_event, limit) => {
  try {
    const { getRecentConflicts } = require('./sync/conflict')
    const conflicts = await getRecentConflicts(limit || 50)
    return { success: true, data: conflicts }
  } catch (error: any) {
    console.error('Get conflicts error:', error)
    return { success: false, message: error.message || 'Failed to get conflicts' }
  }
})

ipcMain.handle('sync:clearOldConflicts', async (_event, olderThanDays) => {
  try {
    const { clearOldConflicts } = require('./sync/conflict')
    const cleared = await clearOldConflicts(olderThanDays || 90)
    return { success: true, data: { cleared } }
  } catch (error: any) {
    console.error('Clear conflicts error:', error)
    return { success: false, message: error.message || 'Failed to clear conflicts' }
  }
})

// This method will be called when Electron has finished
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
