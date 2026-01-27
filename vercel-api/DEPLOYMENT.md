# Deployment Guide - Dates Factory Manager Cloud Sync API

This guide will walk you through deploying the cloud sync API to Vercel.

## Step 1: Set up Neon Database

### 1.1 Create Neon Account

1. Go to https://neon.tech
2. Click "Sign Up" (free account available)
3. Verify your email

### 1.2 Create a New Project

1. In Neon Console, click "Create a project"
2. Choose a name: `dates-factory-manager-cloud`
3. Select a region (choose closest to your customers)
4. Click "Create project"

### 1.3 Get Connection Details

1. Open your newly created project
2. Copy the **Connection String**
3. Copy the **Project ID**

Your connection string should look like:
```
postgresql://neondb_owner:abc123@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### 1.4 (Optional) Create Factory-Specific Databases

For complete data isolation per factory:

```sql
-- Run in Neon SQL Editor for each factory:
CREATE DATABASE dfm_E809C7B617ABD1A4;
CREATE DATABASE dfm_A123B456C789D012;
-- etc.
```

## Step 2: Prepare for Deployment

### 2.1 Install Dependencies

```bash
cd vercel-api
npm install
```

### 2.2 Set Environment Variables

Create a `.env` file locally (for testing) or set them in Vercel dashboard:

```bash
# Required
NEON_PROJECT_ID=your-project-id
NEON_DATABASE_URL=your-connection-string
NEON_DB_PASSWORD=your-password

# Optional (for per-factory databases)
NEON_DB_E809C7B617ABD1A4=postgres://...
```

### 2.3 Update API URL (if needed)

By default, the desktop app uses:
```
https://dates-factory-manager-cloud.vercel.app/api/sync
```

If you're deploying to a different URL, update `src/main/sync/api.ts`:
```typescript
const API_BASE = 'https://your-custom-url.vercel.app/api/sync'
```

## Step 3: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to API folder
cd vercel-api

# Deploy to production
vercel deploy --prod
```

### Option B: Using Vercel Dashboard

1. Go to https://vercel.com/new
2. Import the `vercel-api` folder
3. Configure:
   - **Framework Preset:** Other
   - **Root Directory:** `./`
   - **Build Command:** `echo 'No build needed'`
   - **Output Directory:** `./`
4. Add environment variables:
   - Click "Environment Variables"
   - Add your Neon credentials
   - Click "Save"
5. Click "Deploy"

## Step 4: Configure Domain (Optional)

### 4.1 Use Default Vercel Domain

Your API will be available at:
```
https://your-project-name.vercel.app/api/sync
```

### 4.2 Use Custom Domain

1. Go to Vercel Dashboard → Your Project → Settings
2. Click "Domains"
3. Add your custom domain (e.g., `api.datesfactory.com`)
4. Update DNS records as instructed
5. Update desktop app to use new domain

## Step 5: Test Deployment

### 5.1 Health Check

```bash
curl https://your-project.vercel.app/api/sync/status
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-25T10:30:00Z",
  "version": "1.0.0",
  "service": "dates-factory-manager-sync-api"
}
```

### 5.2 Test Sync Endpoints

```bash
# Test database-info endpoint
curl -X POST https://your-project.vercel.app/api/sync/database-info \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR-LICENSE-KEY" \
  -d '{}'
```

Expected response:
```json
{
  "success": true,
  "machineId": "E809C7B617ABD1A4",
  "databaseName": "dfm-E809C7B617ABD1A4",
  "lastSync": null,
  "syncStatus": "connected"
}
```

### 5.3 Test from Desktop App

1. Open your desktop app
2. Go to Settings → Cloud Sync Settings
3. Enable automatic synchronization
4. Click "Sync Now"
5. Check console for any errors

## Step 6: Monitor and Scale

### 6.1 View Logs

```bash
vercel logs --prod
```

Or in Vercel Dashboard: Your Project → Logs

### 6.2 Monitor Database Usage

Go to Neon Console → Your Project → Metrics

Check:
- Storage usage
- Active rows
- Compute time

### 6.3 Scaling

When you need to scale:

1. **Upgrade Neon tier:**
   - Neon Console → Your Project → Settings → Billing
   - Choose appropriate tier

2. **Upgrade Vercel tier:**
   - Vercel Dashboard → Your Project → Settings → Billing
   - Choose appropriate tier

## Troubleshooting

### Issue: "Module not found" error

**Solution:** Make sure you ran `npm install` in the `vercel-api` folder

### Issue: "Database connection failed"

**Solution:**
- Check environment variables are set correctly
- Verify Neon project is active
- Test connection string in Neon console

### Issue: "License validation failed"

**Solution:**
- Verify license key format: `XXXX-XXXX-XXXX-XXXX-4D`
- Check machine ID matches database name
- Ensure license hasn't expired

### Issue: Functions timing out

**Solution:**
- Increase `maxDuration` in `vercel.json`
- Optimize database queries
- Consider using Vercel Pro tier for longer timeouts

### Issue: High latency

**Solution:**
- Choose Neon region closest to users
- Enable edge caching where appropriate
- Consider using Vercel's Edge Network

## Production Checklist

Before going to production:

- [ ] Neon database created and configured
- [ ] Environment variables set in Vercel
- [ ] API deployed successfully
- [ ] Health check endpoint returns 200
- [ ] Database-info endpoint works with license key
- [ ] Desktop app can connect and sync
- [ ] Error monitoring configured
- [ ] Log aggregation set up
- [ ] Backup strategy in place
- [ ] Scaling plan documented

## Post-Deployment

### 1. Set Up Alerts

- **Vercel:** Dashboard → Your Project → Settings → Alerts
- **Neon:** Console → Your Project → Alerts

Alert for:
- Function errors > 5%
- Response time > 3s
- Database connection failures

### 2. Configure Backups

Neon automatically backs up your database, but verify:
- Retention period (default: 7 days on free tier)
- Point-in-time recovery is enabled

### 3. Document Access

Save these credentials securely:
- Vercel project URL
- Neon console URL
- Database connection strings
- API keys

### 4. Update Desktop App Configuration

If you changed the API URL, rebuild and distribute the desktop app:

```bash
# In desktop app root
npm run build
npm run dist
```

## Support

If you encounter issues:

1. Check logs: `vercel logs --prod`
2. Check Neon metrics
3. Review this guide's troubleshooting section
4. Contact support: support@datesfactory.com
5. WhatsApp: +201221089249

## Next Steps

After successful deployment:

1. Monitor first week of usage
2. Collect performance metrics
3. Gather user feedback
4. Plan scaling strategy
5. Consider adding analytics
6. Set up staging environment for testing
