# Vercel API Deployment - Dates Factory Manager

## ✅ Deployment Status

**Status:** Deployed and Ready
**Production URL:** https://vercel-api-abuellils-projects.vercel.app
**Deployment Date:** January 26, 2026

## 📡 Available Endpoints

All endpoints require `Authorization: Bearer YOUR-LICENSE-KEY` header

### Health Check
```
GET /api/sync/status
```
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-26T02:00:00.000Z",
  "version": "1.0.0",
  "service": "dates-factory-manager-sync-api"
}
```

### Full Sync (Bidirectional)
```
POST /api/sync/full
```
**Request Body:**
```json
{
  "changes": [
    {
      "operation": "INSERT|UPDATE|DELETE",
      "table": "customers|weighbridge|crates|finance|users|date_types|crate_types|daily_prices|supervisors",
      "record_id": 123,
      "data": { /* record data */ },
      "client_timestamp": 1706230000000
    }
  ],
  "last_sync_checkpoint": 1706230000000
}
```

**Response:**
```json
{
  "success": true,
  "processed": 5,
  "failed": 0,
  "remote_changes": [ /* changes from cloud */ ],
  "new_checkpoint": 1706230050000
}
```

### Push Changes
```
POST /api/sync/push
```
Sends changes from desktop to cloud database

### Pull Changes
```
POST /api/sync/pull
```
Retrieves changes from cloud database since last checkpoint

### Database Info
```
POST /api/sync/database-info
```
Returns database connection info and sync status

## 🔧 Configuration

### Environment Variables
- ✅ `NEON_DATABASE_URL` - Configured
- ✅ `NEON_PROJECT_ID` - Configured (super-leaf-ahwkz1gs)

### Database Connection
```
Host: ep-super-leaf-ahwkz1gs-pooler.c-3.us-east-1.aws.neon.tech
Database: neondb
SSL: Required
```

## 🔐 Authentication

The API uses license key-based authentication. Include in your Electron app:

```javascript
const response = await fetch('https://vercel-api-abuellils-projects.vercel.app/api/sync/full', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR-LICENSE-KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    changes: localChanges,
    last_sync_checkpoint: lastCheckpoint
  })
})
```

## ⚠️ Deployment Protection

The API is currently protected by Vercel's deployment protection. To disable:

### Option 1: Vercel Dashboard (Recommended)
1. Visit: https://vercel.com/abuellils-projects/vercel-api/settings/protection
2. Change to "Only preview deployments" or disable completely
3. Save

### Option 2: Use from Electron App
Your Electron app can access the API directly with the license key. The protection only blocks unauthorized web requests.

## 📋 Sync Tables

The following tables are synchronized:
- customers
- weighbridge
- crates
- finance
- users
- date_types
- crate_types
- daily_prices
- supervisors

## 🧪 Testing

### Test Health Endpoint (No Auth Required After Protection Disabled)
```bash
curl https://vercel-api-abuellils-projects.vercel.app/api/sync/status
```

### Test Sync Endpoint (Requires License Key)
```bash
curl -X POST https://vercel-api-abuellils-projects.vercel.app/api/sync/push \
  -H "Authorization: Bearer YOUR-LICENSE-KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "changes": [],
    "last_sync_checkpoint": 0
  }'
```

## 🔄 Deployment Commands

```bash
cd DFM-V2/vercel-api

# Deploy to production
vercel --prod

# View deployment logs
vercel logs https://vercel-api-abuellils-projects.vercel.app

# List environment variables
vercel env ls

# Add new environment variable
vercel env add VARIABLE_NAME production
```

## 📊 Deployment History

Recent deployments:
- `vercel-jnqlnibuz-abuellils-projects.vercel.app` - Latest (with database config)
- `vercel-jklgf2bcn-abuellils-projects.vercel.app` - Fixed status handler
- `vercel-5gmpz81eu-abuellils-projects.vercel.app` - Fixed imports

## 🚀 Next Steps

1. **Disable deployment protection** for easier testing
2. **Test the sync endpoints** with your Electron app
3. **Set up custom domain** (optional): https://vercel.com/docs/custom-domains
4. **Monitor API usage**: https://vercel.com/abuellils-projects/vercel-api/analytics

## 📝 Notes

- The API uses Vercel serverless functions (Node.js 20.x)
- Each endpoint has a 10-second timeout
- Memory allocated: 1024MB per function
- The API automatically handles bidirectional sync with conflict resolution
- All sync operations are tracked with timestamps for consistency
