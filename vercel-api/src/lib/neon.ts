import { neon } from '@neondatabase/serverless'

/**
 * Allowed tables for sync operations
 * This whitelist prevents SQL injection attacks
 */
export const ALLOWED_TABLES = [
  'customers',
  'weighbridge',
  'crates',
  'finance',
  'users',
  'date_types',
  'crate_types',
  'daily_prices',
  'supervisors',
  'telegram_users',
  'telegram_registrations',
  'user_roles',
  'notification_queue',
  'notification_preferences',
  'role_permissions'
]

/**
 * Sync columns that should be ignored during updates
 */
export const SYNC_COLUMNS = ['_client_id', '_synced_at', '_version']

/**
 * Create a Neon database connection
 */
export function createNeonConnection(databaseUrl: string) {
  return neon(databaseUrl, {
    fetchOptions: {
      cache: 'no-store'
    }
  })
}

/**
 * Validate table name against whitelist
 */
export function validateTable(tableName: string): void {
  if (!ALLOWED_TABLES.includes(tableName)) {
    throw new Error(`Invalid table: ${tableName}`)
  }
}

/**
 * Apply a sync change to the database
 */
export async function applyChange(
  sql: any,
  change: {
    operation: 'INSERT' | 'UPDATE' | 'DELETE'
    table: string
    record_id: number
    data: Record<string, any>
    client_id: string
    client_timestamp: number
  }
): Promise<void> {
  // Validate table name
  validateTable(change.table)

  const { operation, table, record_id, data, client_id, client_timestamp } = change

  switch (operation) {
    case 'INSERT':
      await applyInsert(sql, table, data, client_id, client_timestamp)
      break

    case 'UPDATE':
      await applyUpdate(sql, table, record_id, data, client_id, client_timestamp)
      break

    case 'DELETE':
      await applyDelete(sql, table, record_id)
      break

    default:
      throw new Error(`Unknown operation: ${operation}`)
  }
}

/**
 * Apply INSERT operation
 */
async function applyInsert(
  sql: any,
  table: string,
  data: Record<string, any>,
  clientId: string,
  clientTimestamp: number
): Promise<void> {
  // Remove sync columns from data (they're managed by the server)
  const cleanData = { ...data }
  delete cleanData._client_id
  delete cleanData._synced_at
  delete cleanData._version

  // Add server-managed columns
  cleanData._client_id = clientId
  cleanData._synced_at = clientTimestamp
  cleanData._version = 1

  // Build column names and values
  const columns = Object.keys(cleanData)
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
  const values = Object.values(cleanData)

  // Execute INSERT
  await sql`INSERT INTO ${sql(table)} ${sql(cleanData)}`
}

/**
 * Apply UPDATE operation
 */
async function applyUpdate(
  sql: any,
  table: string,
  recordId: number,
  data: Record<string, any>,
  clientId: string,
  clientTimestamp: number
): Promise<void> {
  // Remove sync columns and id from data
  const cleanData = { ...data }
  delete cleanData.id
  delete cleanData._client_id
  delete cleanData._synced_at
  delete cleanData._version

  // Increment version
  const currentVersion = data._version || 1
  cleanData._version = currentVersion + 1
  cleanData._synced_at = clientTimestamp

  // Execute UPDATE
  await sql`
    UPDATE ${sql(table)}
    SET ${sql(cleanData)}
    WHERE id = ${recordId}
  `
}

/**
 * Apply DELETE operation
 */
async function applyDelete(sql: any, table: string, recordId: number): Promise<void> {
  await sql`DELETE FROM ${sql(table)} WHERE id = ${recordId}`
}

/**
 * Get changes since a checkpoint timestamp
 */
export async function getChangesSince(
  sql: any,
  tables: string[],
  checkpoint: number
): Promise<Array<{ table: string; operation: string; data: any; server_timestamp: number }>> {
  const changes: any[] = []

  for (const table of tables) {
    // Get records modified after the checkpoint
    const records = await sql`
      SELECT *
      FROM ${sql(table)}
      WHERE _synced_at > ${checkpoint}
      ORDER BY _synced_at ASC
    `

    // Convert records to sync format
    for (const record of records) {
      changes.push({
        table,
        operation: 'UPDATE', // All changes from server are treated as updates
        data: record,
        server_timestamp: record._synced_at
      })
    }
  }

  return changes
}

/**
 * Check if a record exists
 */
export async function recordExists(sql: any, table: string, recordId: number): Promise<boolean> {
  const result = await sql`SELECT 1 FROM ${sql(table)} WHERE id = ${recordId} LIMIT 1`
  return result.length > 0
}

/**
 * Get a record by ID
 */
export async function getRecord(sql: any, table: string, recordId: number): Promise<any> {
  const records = await sql`SELECT * FROM ${sql(table)} WHERE id = ${recordId} LIMIT 1`
  return records.length > 0 ? records[0] : null
}

/**
 * Initialize database schema for a factory
 * Creates all required tables if they don't exist
 */
export async function initializeFactorySchema(sql: any): Promise<void> {
  // Create tables one by one
  const tables = [
    // Customers table
    `CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      phone TEXT,
      _client_id TEXT,
      _synced_at INTEGER,
      _version INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Date Types table
    `CREATE TABLE IF NOT EXISTS date_types (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      _client_id TEXT,
      _synced_at INTEGER,
      _version INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Crate Types table
    `CREATE TABLE IF NOT EXISTS crate_types (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      weight REAL NOT NULL,
      is_default INTEGER DEFAULT 0,
      _client_id TEXT,
      _synced_at INTEGER,
      _version INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Daily prices table
    `CREATE TABLE IF NOT EXISTS daily_prices (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL UNIQUE,
      price_per_qantar REAL NOT NULL,
      qantar_weight REAL DEFAULT 100.0,
      _client_id TEXT,
      _synced_at INTEGER,
      _version INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Weighbridge table
    `CREATE TABLE IF NOT EXISTS weighbridge (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      date_type_id INTEGER REFERENCES date_types(id),
      gross_weight REAL DEFAULT 0,
      net_weight REAL NOT NULL,
      price_per_qantar REAL NOT NULL,
      total REAL NOT NULL,
      crates_count INTEGER DEFAULT 0,
      commission REAL DEFAULT 0,
      notes TEXT,
      _client_id TEXT,
      _synced_at INTEGER,
      _version INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Crates table
    `CREATE TABLE IF NOT EXISTS crates (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      crate_type_id INTEGER REFERENCES crate_types(id),
      crates_out INTEGER DEFAULT 0,
      crates_returned INTEGER DEFAULT 0,
      handler TEXT,
      notes TEXT,
      _client_id TEXT,
      _synced_at INTEGER,
      _version INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Finance table
    `CREATE TABLE IF NOT EXISTS finance (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      transaction_type TEXT NOT NULL,
      amount_paid REAL DEFAULT 0,
      amount_received REAL DEFAULT 0,
      notes TEXT,
      _client_id TEXT,
      _synced_at INTEGER,
      _version INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Supervisors table
    `CREATE TABLE IF NOT EXISTS supervisors (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      _client_id TEXT,
      _synced_at INTEGER,
      _version INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ]

  for (const createTableSQL of tables) {
    try {
      await sql.unsafe(createTableSQL)
    } catch (error) {
      console.error('Failed to create table:', error)
    }
  }

  // Create indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_weighbridge_customer_date ON weighbridge(customer_id, date)',
    'CREATE INDEX IF NOT EXISTS idx_finance_customer_date ON finance(customer_id, date)',
    'CREATE INDEX IF NOT EXISTS idx_crates_customer_date ON crates(customer_id, date)',
    'CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)'
  ]

  for (const createIndexSQL of indexes) {
    try {
      await sql.unsafe(createIndexSQL)
    } catch (error) {
      // Ignore index creation errors (might already exist)
    }
  }
}
