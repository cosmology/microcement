# Docker-Based Vercel Setup Guide

## 🐳 Overview

Since you're running everything in Docker, this guide shows how to set up Vercel environment variables and deployment without needing local npm/node installation.

## 🎯 Your Docker Workflow

1. **Local Development**: Docker Compose (Supabase + Next.js)
2. **Preview Deployment**: Vercel Preview (automatic on git push)
3. **Production Deployment**: Vercel Production (manual promotion)

## 📋 Step-by-Step Setup

### Step 1: Create Supabase Cloud Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Get your **Project URL** and **Anon Key**

### Step 2: Set Up Vercel Project

#### Option A: Vercel Dashboard (Easiest)
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

#### Option B: Docker Container with Vercel CLI
```bash
# Run Vercel CLI in Docker container
docker run --rm -it \
  -v "$(pwd):/app" \
  -w /app \
  -v ~/.vercel:/root/.vercel \
  node:18-alpine \
  sh -c "npm install -g vercel && vercel login && vercel"
```

### Step 3: Set Environment Variables

#### Method 1: Vercel Dashboard (Recommended)
1. Go to **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**
2. Add these variables for **BOTH Production AND Preview**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_NAME=Microcement Studio
```

#### Method 2: Docker Container with Vercel CLI
```bash
# Use the provided script
./scripts/setup-vercel-env-docker.sh

# Or manually run commands
docker run --rm -it \
  -v "$(pwd):/app" \
  -w /app \
  -v ~/.vercel:/root/.vercel \
  node:18-alpine \
  sh -c "
    npm install -g vercel &&
    vercel env add NEXT_PUBLIC_SUPABASE_URL production &&
    vercel env add NEXT_PUBLIC_SUPABASE_URL preview &&
    vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production &&
    vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview &&
    vercel env add NEXT_PUBLIC_SITE_URL production &&
    vercel env add NEXT_PUBLIC_SITE_URL preview &&
    vercel env add NEXT_PUBLIC_APP_NAME production &&
    vercel env add NEXT_PUBLIC_APP_NAME preview
  "
```

#### Method 3: Docker Compose
```bash
# Add to your docker-compose.yml or use the separate file
docker compose -f docker-compose.yml -f docker-compose.vercel.yml --profile tools run vercel-cli vercel env add NEXT_PUBLIC_SUPABASE_URL
```

### Step 4: Configure Supabase Redirect URLs

Go to **Supabase Dashboard** → **Authentication** → **Settings**

Add these redirect URLs:
```
https://your-app.vercel.app/auth/callback
https://your-app.vercel.app/login
http://localhost:3000/auth/callback
```

### Step 5: Create Local Environment File

Create `.env.local` in your project root:
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Microcement Studio
```

## 🚀 Deployment Workflow

### 1. Local Development (Docker)
```bash
# Start local Supabase
docker compose up -d

# Start Next.js development server
docker compose up app

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

#### Option A: Vercel Dashboard
1. Go to your project → Deployments
2. Click "Promote to Production"

#### Option B: Docker Container
```bash
docker run --rm -it \
  -v "$(pwd):/app" \
  -w /app \
  -v ~/.vercel:/root/.vercel \
  node:18-alpine \
  sh -c "npm install -g vercel && vercel --prod"
```

#### Option C: Docker Compose
```bash
docker compose -f docker-compose.yml -f docker-compose.vercel.yml --profile tools run vercel-cli vercel --prod
```

## 🔧 Docker Commands Reference

### Vercel CLI Commands in Docker
```bash
# Login to Vercel
docker run --rm -it \
  -v "$(pwd):/app" \
  -w /app \
  -v ~/.vercel:/root/.vercel \
  node:18-alpine \
  sh -c "npm install -g vercel && vercel login"

# List environment variables
docker run --rm -it \
  -v "$(pwd):/app" \
  -w /app \
  -v ~/.vercel:/root/.vercel \
  node:18-alpine \
  sh -c "npm install -g vercel && vercel env ls"

# Deploy to production
docker run --rm -it \
  -v "$(pwd):/app" \
  -w /app \
  -v ~/.vercel:/root/.vercel \
  node:18-alpine \
  sh -c "npm install -g vercel && vercel --prod"

# Check deployment status
docker run --rm -it \
  -v "$(pwd):/app" \
  -w /app \
  -v ~/.vercel:/root/.vercel \
  node:18-alpine \
  sh -c "npm install -g vercel && vercel ls"
```

### Using Docker Compose
```bash
# Add Vercel CLI service to your docker-compose.yml
# Then use:
docker compose --profile tools run vercel-cli vercel login
docker compose --profile tools run vercel-cli vercel env ls
docker compose --profile tools run vercel-cli vercel --prod
```

## 📊 Environment Variable Scopes

| Environment | Supabase URL | Site URL | How to Set |
|-------------|--------------|----------|------------|
| **Local** | `http://localhost:8000` | `http://localhost:3000` | `.env.local` file |
| **Preview** | `https://your-project.supabase.co` | `https://preview-url.vercel.app` | Vercel Dashboard |
| **Production** | `https://your-project.supabase.co` | `https://your-app.vercel.app` | Vercel Dashboard |

## 🚨 Troubleshooting

### Common Issues:

**1. "Vercel CLI not found"**
- Use Docker container with Vercel CLI
- Or use Vercel Dashboard instead

**2. "Authentication failed"**
- Check Supabase redirect URLs
- Verify environment variables are set correctly

**3. "Build failed"**
- Check Vercel build logs
- Ensure all dependencies are in package.json

**4. "Environment variables not loaded"**
- Verify variables are set for correct environments
- Check variable names match exactly

### Debug Steps:
1. Check Vercel deployment logs
2. Verify environment variables in Vercel dashboard
3. Test Supabase connection
4. Check browser console for errors

## 🎉 Success Checklist

- [ ] Supabase Cloud project created
- [ ] Environment variables set in Vercel (Production + Preview)
- [ ] Supabase redirect URLs configured
- [ ] Local `.env.local` created
- [ ] Docker development environment working
- [ ] Preview deployment tested
- [ ] Production deployment tested
- [ ] Authentication flow verified

## 📈 Monitoring

### Vercel Dashboard
- **Deployments**: View deployment history
- **Functions**: Monitor API routes
- **Analytics**: Track performance

### Supabase Dashboard
- **Authentication**: Monitor user sign-ups
- **Database**: Check query performance
- **Logs**: View system logs

## 🔐 Security Notes

1. **Never commit `.env` files**
2. **Use strong passwords**
3. **Enable 2FA on all accounts**
4. **Regularly rotate API keys**
5. **Monitor access logs**
6. **Use HTTPS in production**
