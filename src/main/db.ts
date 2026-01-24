import initSqlJs, { Database, SqlJsStatic } from 'sql.js'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import bcrypt from 'bcryptjs'
import { is } from '@electron-toolkit/utils'

let db: Database | null = null
let SQL: SqlJsStatic | null = null

export const getDbPath = (): string => {
  if (is.dev) {
    return path.join(app.getAppPath(), 'date_factory_v2.db')
  }
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'date_factory_v2.db')
}

const initSchema = (db: Database): void => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'employee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)

  // Customers table
  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)

  // Date Types table
  db.run(`CREATE TABLE IF NOT EXISTS date_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)

  // Crate Types table
  db.run(`CREATE TABLE IF NOT EXISTS crate_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    weight REAL NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)

  // Daily prices table
  db.run(`CREATE TABLE IF NOT EXISTS daily_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE,
    price_per_qantar REAL NOT NULL,
    qantar_weight REAL DEFAULT 100.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)

  // Weighbridge transactions table
  db.run(`CREATE TABLE IF NOT EXISTS weighbridge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    customer_id INTEGER NOT NULL,
    date_type_id INTEGER,
    gross_weight REAL DEFAULT 0,
    net_weight REAL NOT NULL,
    price_per_qantar REAL NOT NULL,
    total REAL NOT NULL,
    crates_count INTEGER DEFAULT 0,
    commission REAL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (date_type_id) REFERENCES date_types(id)
  )`)

  // Crates tracking table
  db.run(`CREATE TABLE IF NOT EXISTS crates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    customer_id INTEGER NOT NULL,
    crate_type_id INTEGER,
    crates_out INTEGER DEFAULT 0,
    crates_returned INTEGER DEFAULT 0,
    handler TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (crate_type_id) REFERENCES crate_types(id)
  )`)

  // Finance table
  db.run(`CREATE TABLE IF NOT EXISTS finance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    customer_id INTEGER NOT NULL,
    transaction_type TEXT NOT NULL,
    amount_paid REAL DEFAULT 0,
    amount_received REAL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  )`)

  // Settings table
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`)

  // Supervisors table
  db.run(`CREATE TABLE IF NOT EXISTS supervisors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)

  // Sync queue table
  db.run(`CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER,
    data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced INTEGER DEFAULT 0
  )`)

  // Indexes
  db.run("CREATE INDEX IF NOT EXISTS idx_weighbridge_customer_date ON weighbridge(customer_id, date)")
  db.run("CREATE INDEX IF NOT EXISTS idx_finance_customer_date ON finance(customer_id, date)")
  db.run("CREATE INDEX IF NOT EXISTS idx_crates_customer_date ON crates(customer_id, date)")
  db.run("CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at)")
  db.run("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")

  // Seed default admin if not exists
  const res = db.exec("SELECT id FROM users WHERE username = 'admin'")
  if (res.length === 0 || res[0].values.length === 0) {
    const salt = bcrypt.genSaltSync(10)
    const hash = bcrypt.hashSync('admin123', salt)
    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hash, 'admin'])
  }

  // Seed default settings
  const defaultSettings = {
    crate_weight: '2',
    qantar_weight: '45',
    company_name: 'مصنع التمور - الإصدار الثاني',
    company_address: '',
    company_phone: '',
    telegram_token: '',
    telegram_chat_id: ''
  }
  
  const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
  Object.entries(defaultSettings).forEach(([key, value]) => {
    stmt.run([key, value])
  })
  stmt.free()
}

export const initializeDatabase = async (force: boolean = false): Promise<Database> => {
  if (db && !force) return db

  if (db) {
    db.close()
  }

  SQL = await initSqlJs()
  const dbPath = getDbPath()
  const dbDir = path.dirname(dbPath)

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  initSchema(db)
  await saveDatabase()
  
  return db
}

export const saveDatabase = async (): Promise<void> => {
  if (!db) return
  const dbPath = getDbPath()
  const data = db.export()
  const buffer = Buffer.from(data)
  await fs.promises.writeFile(dbPath, buffer)
}

export const getDb = (): Database => {
  if (!db) throw new Error('Database not initialized')
  return db
}
