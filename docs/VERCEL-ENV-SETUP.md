# Vercel Environment Variables Setup Guide

## 🎯 Your Workflow Overview

1. **Local Development**: Docker + Local Supabase
2. **Preview Deployment**: Vercel Preview with Production Supabase
3. **Production Deployment**: Vercel Production with Production Supabase

## 📋 Step-by-Step Setup

### Step 1: Create Supabase Cloud Project (Production)

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in details:
   - **Name**: `microcement-studio-prod`
   - **Database Password**: Generate strong password
   - **Region**: Choose closest to your users
4. Wait for project to be ready (2-3 minutes)

### Step 2: Get Production Supabase Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 3: Configure Supabase Authentication

1. Go to **Authentication** → **Settings**
2. Set **Site URL**: `https://your-app.vercel.app`
3. Add **Redirect URLs**:
   ```
   https://your-app.vercel.app/auth/callback
   https://your-app.vercel.app/login
   http://localhost:3000/auth/callback
   ```

### Step 4: Set Up Vercel Project

#### Option A: Connect GitHub Repository
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (or leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

#### Option B: Deploy via CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (this will create the project)
vercel
```

### Step 5: Set Environment Variables in Vercel

Go to **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

#### Required Variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_NAME=Microcement Studio
```

#### Optional Variables (for custom email):
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_ADMIN_EMAIL=your-email@gmail.com
SMTP_SENDER_NAME=Microcement Studio
```

#### Environment Scope:
- **Production**: ✅ (for production deployments)
- **Preview**: ✅ (for preview deployments)
- **Development**: ❌ (not needed, uses local Docker)

### Step 6: Create Local Environment File

Create `.env.local` in your project root:
```bash
# Local Development (Docker)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUPABASE_ANON_KEY_PLACEHOLDER
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Microcement Studio
```

## 🚀 Deployment Workflow

### 1. Local Development
```bash
# Start local Supabase
docker compose up -d

# Start Next.js development server
npm run dev

# Test at http://localhost:3000
```

### 2. Push to GitHub
```bash
git add .
git commit -m "Update authentication setup"
git push origin main
```

### 3. Preview Deployment (Automatic)
- Vercel automatically creates preview deployments
- Uses **Preview** environment variables
- Test at: `https://your-app-git-branch.vercel.app`

### 4. Promote to Production
```bash
# Option A: Via Vercel Dashboard
# Go to your project → Deployments → Promote to Production

# Option B: Via CLI
vercel --prod
```

## 🔧 Environment Variable Management

### Vercel Dashboard Method (Recommended)

1. **Go to Vercel Dashboard**
2. **Select your project**
3. **Settings** → **Environment Variables**
4. **Add Variable**:
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: `https://your-project-id.supabase.co`
   - **Environment**: Select `Production` and `Preview`
5. **Save**

### CLI Method
```bash
# Add environment variable
vercel env add NEXT_PUBLIC_SUPABASE_URL

# When prompted:
# ? What's the value of NEXT_PUBLIC_SUPABASE_URL? https://your-project-id.supabase.co
# ? Add NEXT_PUBLIC_SUPABASE_URL to which Environments? Production, Preview

# List all environment variables
vercel env ls

# Remove environment variable
vercel env rm NEXT_PUBLIC_SUPABASE_URL
```

## 📊 Environment Variable Scopes

| Variable | Development | Preview | Production |
|----------|-------------|---------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://localhost:8000` | `https://your-project.supabase.co` | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://preview-url.vercel.app` | `https://your-app.vercel.app` |

## 🔍 Testing Your Setup

### 1. Test Local Development
```bash
# Start local services
docker compose up -d
npm run dev

# Test authentication
# Go to http://localhost:3000
# Try signing up/signing in
```

### 2. Test Preview Deployment
```bash
# Push to GitHub
git push origin main

# Check Vercel dashboard for preview URL
# Test authentication on preview URL
```

### 3. Test Production Deployment
```bash
# Promote to production
vercel --prod

# Test authentication on production URL
```

## 🚨 Troubleshooting

### Common Issues:

**1. "Invalid redirect URL"**
- Check Supabase redirect URLs include your Vercel domain
- Ensure `NEXT_PUBLIC_SITE_URL` matches your actual domain

**2. "Missing environment variables"**
- Verify variables are set in Vercel dashboard
- Check variable names match exactly
- Ensure variables are enabled for correct environments

**3. "Authentication not working"**
- Check Supabase project status
- Verify API keys are correct
- Check browser console for errors

**4. "Preview deployment issues"**
- Ensure preview environment variables are set
- Check if preview URL is in Supabase redirect URLs

### Debug Steps:
1. Check Vercel deployment logs
2. Verify environment variables in Vercel dashboard
3. Test Supabase connection
4. Check browser console for errors
5. Monitor Supabase logs

## 📈 Monitoring

### Vercel Dashboard
- **Deployments**: View deployment history
- **Functions**: Monitor API routes
- **Analytics**: Track performance

### Supabase Dashboard
- **Authentication**: Monitor user sign-ups
- **Database**: Check query performance
- **Logs**: View system logs

## 🎉 Success Checklist

- [ ] Supabase Cloud project created
- [ ] Production Supabase credentials obtained
- [ ] Supabase redirect URLs configured
- [ ] Vercel project created
- [ ] Environment variables set in Vercel
- [ ] Local `.env.local` created
- [ ] Preview deployment tested
- [ ] Production deployment tested
- [ ] Authentication flow verified
- [ ] Email delivery confirmed
