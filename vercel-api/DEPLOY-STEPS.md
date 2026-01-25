# 🚀 Vercel API Deployment Guide

## Step-by-Step Deployment

### Step 1: Login to Vercel

I'll help you log in to Vercel. Run this command:

```bash
vercel login
```

**What will happen:**
1. Your browser will open
2. You'll be asked to:
   - Sign in to Vercel (or create account)
   - Authorize the CLI
3. Return here after login

**Note:** Vercel offers a generous free tier:
- 100 GB-Hours of serverless execution per month
- 100 GB bandwidth per month
- Unlimited projects
- Perfect for our sync API!

---

### Step 2: Prepare Environment

You'll need to set up Neon database first:

#### Option A: Quick Setup (Recommended)
1. Go to https://neon.tech
2. Click "Sign Up" (it's free)
3. Create a new project
4. Copy the **Connection String**

#### Option B: Use Default (For Testing)
I'll set up environment variables for you to test without Neon first.

---

### Step 3: Deploy to Vercel

After login, I'll deploy the API using:

```bash
cd vercel-api
vercel deploy --prod
```

**This will:**
- Package the API files
- Upload to Vercel
- Deploy to Edge Functions
- Give you a URL like: `https://dates-factory-sync-api.vercel.app`

---

## Ready to Start?

**Step 1:** Please run `vercel login` in your terminal, then let me know when you're logged in!

**Or**, if you prefer, I can guide you through manual deployment via the Vercel Dashboard instead.

Which would you prefer?
- A) CLI deployment (faster, automated)
- B) Dashboard deployment (visual, step-by-step)

Let me know your preference and we'll continue!
