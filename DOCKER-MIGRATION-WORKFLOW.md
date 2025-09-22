# 🐳 Docker-Only Migration Workflow

## 🎯 Goal
**One git commit → Vercel deployment → Automatic database migration → Working production app**

## 🔧 How It Works

### 1. **Automatic Migration on First User Access**
- When a user logs in, `SceneConfigService.getUserConfigs()` is called
- This triggers `ensureMigration()` which checks if the table exists
- If table doesn't exist, it calls `/api/migrate` to create it
- Migration runs automatically on first production access

### 2. **Files Created**
- **`app/api/migrate/route.ts`** - Migration API endpoint
- **`lib/services/SceneConfigService.ts`** - Auto-migration logic
- **`vercel.json`** - Vercel configuration

## 🚀 Deployment Workflow

### Step 1: Commit and Push
```bash
git add .
git commit -m "Add automatic database migration system"
git push origin main
```

### Step 2: Vercel Deployment
- Vercel automatically builds and deploys
- No manual intervention needed
- Migration runs when first user accesses the app

### Step 3: First User Login
- User logs in → `SceneConfigService` is called
- Migration runs automatically if table doesn't exist
- User gets their scene configuration
- App works perfectly

## 📋 What Happens During Deployment

1. **Vercel Build Process**:
   - Installs dependencies
   - Builds Next.js app
   - Deploys to production

2. **First User Access**:
   - User logs in
   - `HomeClient` calls `SceneConfigService.getUserConfigs()`
   - `ensureMigration()` checks if table exists
   - If not, calls `/api/migrate` endpoint
   - Migration creates `user_scene_configs` table
   - User gets their configuration
   - App works normally

## 🔍 Migration Details

### What Gets Created:
- ✅ `user_scene_configs` table with all columns
- ✅ Row Level Security (RLS) policies
- ✅ Database indexes for performance
- ✅ `updated_at` trigger function
- ✅ All default values and constraints

### Safety Features:
- ✅ Uses `IF NOT EXISTS` clauses
- ✅ Safe to run multiple times
- ✅ Only runs once per session
- ✅ Graceful error handling

## 🛡️ Environment Variables Required

Make sure these are set in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://lxsbolsjavowlymvpyxo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🔄 Future Migrations

### For New Schema Changes:
1. **Update the migration SQL** in `app/api/migrate/route.ts`
2. **Commit and push** to git
3. **Vercel deploys** automatically
4. **Migration runs** on first user access

### Example: Adding New Column
```sql
-- Add to MIGRATION_SQL in migrate/route.ts
ALTER TABLE public.user_scene_configs 
ADD COLUMN new_feature JSONB DEFAULT '{}';
```

## 🧪 Testing Locally

### Test Migration API:
```bash
# Start your local app
docker compose --profile dev up

# Test migration endpoint
curl -X POST http://localhost:3000/api/migrate
```

### Test Auto-Migration:
1. Start local app
2. Login as a user
3. Check console logs for migration messages
4. Verify table exists in Supabase Dashboard

## 📊 Monitoring

### Check Migration Status:
```bash
# Check if migration API is ready
curl http://your-domain.com/api/migrate

# Response: {"status":"ready","message":"Migration API is ready"}
```

### Vercel Logs:
- Check Vercel Dashboard > Functions > Logs
- Look for migration messages
- Monitor for any errors

## ⚠️ Important Notes

1. **Service Role Key Required**: Migration needs `SUPABASE_SERVICE_ROLE_KEY`
2. **One-Time Migration**: Runs only once per deployment
3. **No Manual Steps**: Everything happens automatically
4. **Docker-Only**: No local tools needed
5. **Production-Ready**: Works on Vercel out of the box

## 🎉 Result

After this setup:
- ✅ **One git commit** triggers everything
- ✅ **Vercel deploys** automatically
- ✅ **Database migrates** on first user access
- ✅ **App works perfectly** in production
- ✅ **No manual intervention** needed

## 🔧 Troubleshooting

### If Migration Fails:
1. Check Vercel environment variables
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
3. Check Vercel function logs
4. Test migration API manually

### If Table Still Missing:
1. Check Supabase Dashboard > SQL Editor
2. Run migration SQL manually
3. Verify RLS policies are created
4. Test user login again

## 🚀 Ready to Deploy!

Your Docker-only migration system is ready. Just commit and push - everything else happens automatically! 🎉
