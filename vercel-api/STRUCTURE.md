# Cloud Sync Implementation - Complete Structure

## 📁 Project Structure

```
DFM-V2/
├── vercel-api/                          # Cloud sync API (NEW!)
│   ├── api/
│   │   └── sync/
│   │       ├── push.ts                 # Push changes endpoint
│   │       ├── pull.ts                 # Pull changes endpoint
│   │       ├── full.ts                 # Bidirectional sync endpoint
│   │       ├── database-info.ts        # Factory DB info endpoint
│   │       ├── status.ts               # Health check endpoint
│   │       └── lib/
│   │           ├── auth.ts             # License validation middleware
│   │           └── neon.ts             # Neon database client
│   ├── package.json                    # Dependencies
│   ├── vercel.json                     # Vercel configuration
│   ├── .env.example                    # Environment variables template
│   ├── README.md                       # API documentation
│   └── DEPLOYMENT.md                   # Deployment guide
│
├── src/
│   ├── main/
│   │   ├── db.ts                       # ✅ Enhanced with sync columns
│   │   ├── index.ts                    # ✅ Added sync IPC handlers
│   │   └── sync/                       # NEW! Sync service
│   │       ├── index.ts                # Main sync orchestrator
│   │       ├── queue.ts                # Sync queue manager
│   │       ├── api.ts                  # HTTP client for Vercel
│   │       ├── conflict.ts             # Conflict resolution
│   │       └── types.ts                # TypeScript interfaces
│   │
│   ├── preload/
│   │   └── index.ts                    # ✅ Added sync API methods
│   │
│   └── renderer/src/
│       ├── components/
│       │   ├── SyncStatus.tsx          # NEW! Header sync indicator
│       │   ├── SyncSettings.tsx        # NEW! Settings panel
│       │   └── Settings.tsx            # ✅ Added SyncSettings
│       │
│       ├── store/
│       │   └── useSyncStore.ts         # NEW! Sync state management
│       │
│       ├── types/
│       │   └── sync.ts                 # NEW! Sync type definitions
│       │
│       └── App.tsx                     # ✅ Added SyncStatus to header
│
└── date_factory_v2.db                  # Local SQLite database
```

## 🎯 What Was Built

### Phase 1: Backend Infrastructure (Desktop App)

#### 1. Database Schema (`src/main/db.ts`)
- ✅ Added `_client_id`, `_synced_at`, `_version` columns to 15 tables
- ✅ Created `_conflict_log` table for tracking conflicts
- ✅ Created `_sync_metadata` table for sync state
- ✅ Added indexes for sync performance

#### 2. Sync Queue Manager (`src/main/sync/queue.ts`)
**Functions:**
- `enqueueChange()` - Track database changes
- `getPendingChanges()` - Retrieve unsynced changes
- `markAsSynced()` - Mark successful syncs
- `markAsFailed()` - Handle failed syncs
- `logConflict()` - Track conflict resolutions
- `getLastSyncCheckpoint()` - Get last sync timestamp
- `updateLastSyncCheckpoint()` - Update checkpoint

#### 3. Sync API Client (`src/main/sync/api.ts`)
**Functions:**
- `pushChanges()` - Upload changes to cloud
- `pullChanges()` - Download changes from cloud
- `fullSync()` - Bidirectional sync
- `getFactoryDatabaseInfo()` - Get DB info
- `checkApiHealth()` - Health check

#### 4. Conflict Resolution (`src/main/sync/conflict.ts`)
**Functions:**
- `applyRemoteChanges()` - Apply server changes locally
- `getRecentConflicts()` - View conflict log
- `clearOldConflicts()` - Cleanup old conflicts
- Last-write-wins strategy with timestamps

#### 5. Main Sync Orchestrator (`src/main/sync/index.ts`)
**Functions:**
- `performSync()` - Full sync workflow (push + pull)
- `startAutoSync()` - Enable automatic sync (30s interval)
- `stopAutoSync()` - Disable auto-sync
- `getSyncStatus()` - Get current status
- `manualSync()` - Trigger manual sync
- Offline detection and retry logic

#### 6. CRUD Integration (`src/main/index.ts`)
Modified all IPC handlers to enqueue changes:
- ✅ Customers (create, update, delete)
- ✅ Weighbridge (create)
- ✅ Crates (create, update, delete)
- ✅ Finance (create, update, delete)

#### 7. Sync IPC Handlers (`src/main/index.ts`)
Added sync-specific handlers:
- `sync:getStatus` - Get sync status
- `sync:manualSync` - Trigger manual sync
- `sync:enable` - Enable auto-sync
- `sync:disable` - Disable auto-sync
- `sync:getConflicts` - View conflicts
- `sync:clearOldConflicts` - Cleanup conflicts

### Phase 2: UI Components (Desktop App)

#### 1. Zustand Store (`src/renderer/src/store/useSyncStore.ts`)
**State:**
- `enabled` - Auto-sync enabled
- `inProgress` - Currently syncing
- `pendingChanges` - Number of unsynced changes
- `lastSync` - Last successful sync timestamp
- `lastError` - Last error message
- `status` - Current sync status

**Actions:**
- `fetchStatus()` - Refresh status from backend
- `manualSync()` - Trigger manual sync
- `enableSync()` - Enable auto-sync
- `disableSync()` - Disable auto-sync

#### 2. Sync Status Indicator (`src/renderer/src/components/SyncStatus.tsx`)
Compact header component showing:
- 🔄 Syncing animation
- ✅ Success state
- ❌ Error state
- ☁️ Disabled state
- 🟡 Pending changes badge
- Click-to-sync functionality
- Auto-refresh every 10s

#### 3. Sync Settings Panel (`src/renderer/src/components/SyncSettings.tsx`)
Complete sync management:
- Toggle switch for auto-sync
- Real-time status display
- Manual sync button
- Pending changes count
- Last sync timestamp
- Error messages display
- Conflicts log viewer
- Info box explaining features

#### 4. App Integration (`src/renderer/src/App.tsx`)
- ✅ Added `SyncStatus` to header
- ✅ Visible on all screens

#### 5. Settings Integration (`src/renderer/src/components/Settings.tsx`)
- ✅ Added `SyncSettings` card
- ✅ Placed between Database Sync and License Management

### Phase 3: Vercel API (Cloud Backend)

#### 1. License Validation (`vercel-api/api/sync/lib/auth.ts`)
**Functions:**
- `validateLicense()` - Validate license from Authorization header
- `extractMachineIdFromLicense()` - Decode machine ID from license
- `constructNeonUrl()` - Build database connection string
- `withLicenseAuth()` - Middleware for protecting endpoints

**Features:**
- License format validation
- Machine ID extraction
- Factory-to-database mapping
- Error handling

#### 2. Neon Database Client (`vercel-api/api/sync/lib/neon.ts`)
**Functions:**
- `createNeonConnection()` - Create database connection
- `validateTable()` - Whitelist validation
- `applyChange()` - Apply INSERT/UPDATE/DELETE
- `getChangesSince()` - Get changes after checkpoint
- `initializeFactorySchema()` - Create tables if needed

**Features:**
- Table whitelist (SQL injection prevention)
- Sync column management
- Version tracking
- Schema initialization

#### 3. API Endpoints

**POST /api/sync/push**
- Receives changes from desktop app
- Applies them to Neon database
- Returns remote changes (if any)
- Returns new checkpoint

**POST /api/sync/pull**
- Returns changes since checkpoint
- Filters by table
- Returns new checkpoint

**POST /api/sync/full**
- Combines push + pull
- Atomic bidirectional sync
- Returns sync results

**POST /api/sync/database-info**
- Returns factory database info
- Shows connection status
- Shows last sync timestamp

**GET /api/sync/status**
- Health check endpoint
- Returns API version
- No authentication required

## 🔧 Configuration Files

### Vercel Configuration (`vercel-api/vercel.json`)
```json
{
  "buildCommand": "echo 'No build needed'",
  "framework": null,
  "runtime": "nodejs20.x",
  "maxDuration": 10
}
```

### Package.json (`vercel-api/package.json`)
```json
{
  "dependencies": {
    "@neondatabase/serverless": "^0.9.0"
  },
  "devDependencies": {
    "vercel": "^34.0.0"
  }
}
```

### Environment Variables (`.env`)
```bash
NEON_PROJECT_ID=your-project-id
NEON_DATABASE_URL=your-connection-string
NEON_DB_PASSWORD=your-password
LICENSE_SECRET=your-secret-key
```

## 📊 Data Flow

### Sync Flow

```
Desktop App (Electron)
    │
    ├─→ User creates customer
    │   └─→ IPC handler: customers:create
    │       └─→ enqueueChange() [adds to sync_queue]
    │
    ├─→ Background sync (every 30s)
    │   └─→ performSync()
    │       ├─→ getPendingChanges() [from sync_queue]
    │       ├─→ pushChanges() [POST to Vercel]
    │       │   └─→ /api/sync/push
    │       │       ├─→ validateLicense() [check license]
    │       │       ├─→ connect to Neon DB
    │       │       ├─→ applyChanges() [INSERT/UPDATE/DELETE]
    │       │       └─→ return remote_changes
    │       │
    │       ├─→ applyRemoteChanges() [from server]
    │       │   ├─→ conflict resolution
    │       │   └─→ update local SQLite
    │       │
    │       └─→ markAsSynced() [update sync_queue]
    │
    └─→ UI updates
        └─→ SyncStatus shows status
        └─→ SyncSettings shows details
```

### License Authentication Flow

```
Desktop App Request
    │
    ├─→ License Key (from .license file)
    │
    ↓
Vercel API
    │
    ├─→ Extract from Authorization header
    │
    ├─→ validateLicenseFormat()
    │   └─→ Check format: XXXX-XXXX-XXXX-XXXX-4D
    │
    ├─→ extractMachineIdFromLicense()
    │   └─→ Decode machine ID
    │
    ├─→ constructNeonUrl()
    │   └─→ Build DB URL: dfm-{machineId}
    │
    ├─→ connect to Neon DB
    │   └─→ Each factory has separate DB
    │
    └─→ Process request
```

## 🔒 Security Features

### Authentication
- ✅ Bearer token authentication (license key)
- ✅ License validation on every request
- ✅ Machine ID verification

### Data Isolation
- ✅ Physical database separation per factory
- ✅ Server-side factory ID scoping
- ✅ Table whitelist (SQL injection prevention)

### Encryption
- ✅ HTTPS/TLS 1.3 enforced
- ✅ Neon encryption at rest
- ✅ No sensitive data in logs

### Access Control
- ✅ Factory A cannot access Factory B's data
- ✅ License expiry checking
- ✅ Input validation and sanitization

## 📈 Performance

### Optimization
- Queue-based batching (100 changes per batch)
- Incremental sync (only changes since checkpoint)
- Offline support (changes queue locally)
- Automatic retry on failure

### Scalability
- **1-10 factories:** Free tiers ($0/month)
- **11-50 factories:** ~$50/month
- **50+ factories:** Scale as needed

### Monitoring
- Function execution time
- Database query performance
- Error rate tracking
- Pending queue size

## 🚀 Next Steps

To complete the setup:

1. **Set up Neon database**
   - Sign up at https://neon.com
   - Create project
   - Get connection string

2. **Deploy Vercel API**
   - Push to GitHub
   - Connect to Vercel
   - Set environment variables
   - Deploy

3. **Update desktop app**
   - Test sync locally
   - Fix any issues
   - Build and distribute

4. **Monitor first week**
   - Check logs
   - Track performance
   - Gather user feedback

## 📞 Support

For help:
- 📧 Email: support@datesfactory.com
- 📱 WhatsApp: +201221089249
- 📖 Docs: See README.md and DEPLOYMENT.md
