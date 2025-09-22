# ✅ Production Deployment Checklist

## Before Deploying to Vercel

### 1. Environment Variables (Vercel Dashboard)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://lxsbolsjavowlymvpyxo.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your production anon key
- [ ] `NEXT_PUBLIC_SITE_URL` = `https://your-app.vercel.app`

### 2. Production Database Schema (Supabase Dashboard)
- [ ] Run the SQL script in `VERCEL-PRODUCTION-DEPLOYMENT.md`
- [ ] Verify `user_scene_configs` table exists
- [ ] Check RLS policies are created
- [ ] Confirm indexes are created

### 3. Supabase Auth Configuration
- [ ] Site URL set to your Vercel domain
- [ ] Redirect URLs include `/auth/callback`
- [ ] Email templates configured

### 4. Code Ready
- [ ] All changes committed to git
- [ ] No console errors in local testing
- [ ] Authentication flow works locally

## After Deploying

### 5. Post-Deployment Testing
- [ ] App loads at Vercel URL
- [ ] User registration works
- [ ] Email confirmation works
- [ ] User login works
- [ ] 3D scene loads
- [ ] Hotspots are interactive
- [ ] Scene configs are created automatically

### 6. Production Verification
- [ ] No 404 errors for `user_scene_configs`
- [ ] No authentication redirect issues
- [ ] All environment variables working
- [ ] Database operations successful

## 🚨 Critical Reminder

**Your local migrations DO NOT run in production!** You must manually create the database schema in your production Supabase using the SQL script provided.
