# Dates Factory Manager - Cloud Sync API

Vercel serverless API for cloud synchronization of the Dates Factory Manager desktop app.

## Features

- ✅ **Bidirectional sync** - Push and pull changes between desktop and cloud
- ✅ **Multi-tenant isolation** - Each factory has their own isolated database
- ✅ **License-based authentication** - Uses existing license system
- ✅ **Offline-first support** - Desktop app works without internet
- ✅ **Conflict resolution** - Automatic last-write-wins strategy
- ✅ **Edge functions** - Fast, scalable serverless deployment

## Architecture

```
Desktop App (Electron)
    ↓ (sync changes via HTTPS)
Vercel API (Edge Functions)
    ↓ (validated by license)
Neon PostgreSQL (serverless DB)
```

## Prerequisites

1. **Neon Account** - Sign up at https://neon.com (free tier available)
2. **Vercel Account** - Sign up at https://vercel.com (free tier available)
3. **Node.js 18+** - Required for local development

## Environment Variables

Create a `.env` file or set these in your Vercel project settings:

```bash
# Neon Database Configuration
NEON_PROJECT_ID=your-project-id
NEON_DB_PASSWORD=your-database-password
NEON_DATABASE_URL=postgresql://neondb_owner:password@ep-project-id.us-east-2.aws.neon.tech/neondb

# Factory-specific databases (optional - for per-factory isolation)
# Format: NEON_DB_{MACHINE_ID}=connection-string
# Example: NEON_DB_E809C7B617ABD1A4=postgres://...

# License Secret (must match your license.js)
LICENSE_SECRET=DateFactory2024SecretKey#$%^&*()!@#
```

## Getting Started

### 1. Set up Neon Database

1. Go to https://neonconsole.com
2. Create a new project
3. Copy your **Project ID** and **Connection String**
4. Set environment variables:
   - `NEON_PROJECT_ID` = your project ID
   - `NEON_DATABASE_URL` = your connection string

### 2. Create Factory Databases (Optional)

For complete data isolation, create a separate database for each factory:

```sql
-- In Neon console, run for each factory:
CREATE DATABASE dfm_{machine_id};
```

Example:
```sql
CREATE DATABASE dfm_E809C7B617ABD1A4;
CREATE DATABASE dfm_A123B456C789D012;
```

### 3. Deploy to Vercel

#### Option A: Deploy from CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
cd vercel-api
vercel deploy --prod
```

#### Option B: Deploy from Vercel Dashboard

1. Go to https://vercel.com/new
2. Import this repository
3. Add environment variables
4. Click "Deploy"

### 4. Configure Desktop App

Update the desktop app's sync API client to point to your deployed API:

```typescript
// In src/main/sync/api.ts
const API_BASE = 'https://your-project.vercel.app/api/sync'
```

## API Endpoints

### POST /api/sync/push

Push local changes to the cloud.

**Request:**
```json
{
  "changes": [
    {
      "operation": "INSERT",
      "table": "customers",
      "record_id": 123,
      "data": {
        "id": 123,
        "name": "Customer Name",
        "type": "supplier",
        "phone": "1234567890"
      },
      "client_timestamp": 1706204400000
    }
  ],
  "last_sync_checkpoint": 1706204400000
}
```

**Response:**
```json
{
  "success": true,
  "processed": 10,
  "failed": 0,
  "remote_changes": [],
  "new_checkpoint": 1706204500000
}
```

### POST /api/sync/pull

Pull remote changes from the cloud.

**Request:**
```json
{
  "last_sync_checkpoint": 1706204400000
}
```

**Response:**
```json
{
  "success": true,
  "changes": [
    {
      "operation": "UPDATE",
      "table": "customers",
      "data": { /* full record */ },
      "server_timestamp": 1706204450000
    }
  ],
  "checkpoint": 1706204500000
}
```

### POST /api/sync/full

Perform bidirectional sync in one request.

**Request:**
```json
{
  "changes": [ /* local changes */ ],
  "last_sync_checkpoint": 1706204400000
}
```

**Response:**
```json
{
  "success": true,
  "processed": 10,
  "failed": 0,
  "remote_changes": [ /* remote changes */ ],
  "new_checkpoint": 1706204500000
}
```

### POST /api/sync/database-info

Get factory database information.

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "machineId": "E809C7B617ABD1A4",
  "databaseName": "dfm-E809C7B617ABD1A4",
  "lastSync": "2025-01-25T10:30:00Z",
  "syncStatus": "connected"
}
```

### GET /api/sync/status

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-25T10:30:00Z",
  "version": "1.0.0",
  "service": "dates-factory-manager-sync-api"
}
```

## Authentication

All endpoints (except `/status`) require a valid license key in the Authorization header:

```
Authorization: Bearer XXXX-XXXX-XXXX-XXXX-4D
```

The license key is validated and mapped to a factory's database using the machine ID.

## Security

- ✅ **License validation** - Every request validated
- ✅ **Database isolation** - Each factory has separate database
- ✅ **Input validation** - Table name whitelist prevents SQL injection
- ✅ **HTTPS only** - All traffic encrypted
- ✅ **No sensitive data logging** - Logs don't contain personal data

## Database Schema

Each factory database has the following tables:

- `customers` - Customer records
- `weighbridge` - Weight transactions
- `crates` - Crate tracking
- `finance` - Financial transactions
- `users` - Application users
- `date_types` - Date product types
- `crate_types` - Crate types with weights
- `daily_prices` - Daily pricing data
- `supervisors` - Supervisor records

Each table includes sync columns:
- `_client_id` - Which client made the change
- `_synced_at` - Timestamp of last sync
- `_version` - Record version for conflict resolution

## Troubleshooting

### License validation fails

**Error:** "Invalid license key format"

**Solution:** Ensure license key follows format: `XXXX-XXXX-XXXX-XX-DD`

### Database connection fails

**Error:** "Failed to connect to database"

**Solution:** Check environment variables:
- `NEON_PROJECT_ID` is set correctly
- `NEON_DATABASE_URL` is valid
- Database exists in Neon console

### Sync returns no changes

**Error:** Pull returns empty changes array

**Solution:**
- Check if `last_sync_checkpoint` is correct
- Verify database has records with `_synced_at` > checkpoint
- Check browser console for errors

### Deployment fails

**Error:** "Build failed"

**Solution:** Ensure all dependencies are installed:
```bash
cd vercel-api
npm install
```

## Monitoring

### View Logs

```bash
vercel logs
```

### View Function Metrics

Go to Vercel Dashboard → Your Project → Functions

### Database Stats

Go to Neon Console → Your Project → Metrics

## Scaling

### Current Limits (Free Tier)

- **Neon:**
  - Storage: 0.5 GB per database
  - Active rows: 50,000 per month
  - Compute: Nano (scale-to-zero)

- **Vercel:**
  - Function invocations: 100K per day
  - Execution time: 10 seconds per function
  - Bandwidth: 100GB per month

### When to Upgrade

Upgrade to paid tiers when:
- More than 10 factories (need more databases)
- High sync frequency (need more execution time)
- Large data volume (need more storage)

## Cost Estimate

**1-10 factories:** $0/month (all free tiers)
**11-50 factories:** ~$50/month (Neon paid databases)
**50+ factories:** ~$150+/month (scale as needed)

## Development

### Local Development

```bash
cd vercel-api
npm install
vercel dev
```

API will be available at `http://localhost:3000/api/sync`

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Support

For issues or questions:
- GitHub: https://github.com/your-repo/issues
- Email: support@datesfactory.com
- WhatsApp: +201221089249

## License

Proprietary - All rights reserved
