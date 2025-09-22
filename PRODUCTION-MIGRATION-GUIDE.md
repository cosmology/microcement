# Production Supabase Migration Guide

## 🚨 Current Issue
Your production Supabase database is missing the `user_scene_configs` table, causing 404 errors when users try to access their scene configurations.

## 🔧 Immediate Fix

### Step 1: Run Production Migration
1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard/project/lxsbolsjavowlymvpyxo
2. **Navigate to SQL Editor**: Left sidebar > SQL Editor
3. **Copy and paste** the contents of `supabase/production-migration.sql`
4. **Click "Run"** to execute the migration

### Step 2: Verify Migration
After running the migration, verify it worked:
```sql
-- Check if table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'user_scene_configs';

-- Check if policies exist
SELECT policyname FROM pg_policies 
WHERE tablename = 'user_scene_configs';
```

## 📋 Proper Production Migration Workflow

### Option 1: Supabase CLI (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref lxsbolsjavowlymvpyxo

# Run migrations
supabase db push
```

### Option 2: Manual SQL Execution
1. Create migration files in `supabase/migrations/`
2. Copy SQL to Supabase Dashboard > SQL Editor
3. Execute manually

### Option 3: Supabase Dashboard Migrations
1. Go to Database > Migrations
2. Create new migration
3. Paste your SQL
4. Apply migration

## 🔄 Future Migration Workflow

### For New Changes:
1. **Create migration file**: `supabase/migrations/YYYYMMDD_description.sql`
2. **Test locally**: Run with `supabase db reset`
3. **Deploy to production**: Use Supabase CLI or Dashboard

### Example Migration File:
```sql
-- Migration: 20250122_add_new_feature.sql
-- Description: Add new feature to user_scene_configs

ALTER TABLE public.user_scene_configs 
ADD COLUMN new_feature JSONB DEFAULT '{}';

-- Add index if needed
CREATE INDEX IF NOT EXISTS idx_user_scene_configs_new_feature 
ON public.user_scene_configs USING GIN (new_feature);
```

## 🛡️ Best Practices

### 1. Always Backup Before Migrations
```sql
-- Create backup table
CREATE TABLE user_scene_configs_backup AS 
SELECT * FROM public.user_scene_configs;
```

### 2. Use Transactions for Complex Migrations
```sql
BEGIN;
-- Your migration SQL here
COMMIT;
-- Or ROLLBACK; if something goes wrong
```

### 3. Test Migrations Locally First
```bash
# Reset local database
supabase db reset

# Test your migration
supabase db push
```

### 4. Use IF EXISTS/IF NOT EXISTS
```sql
-- Safe to run multiple times
CREATE TABLE IF NOT EXISTS ...
DROP POLICY IF EXISTS ...
CREATE INDEX IF NOT EXISTS ...
```

## 🚀 Quick Fix Commands

### Check Current Schema:
```sql
-- List all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check user_scene_configs specifically
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_scene_configs';
```

### Create Default Config for Existing Users:
```sql
-- After running the main migration, create default configs for existing users
INSERT INTO public.user_scene_configs (user_id, config_name, is_default)
SELECT 
    id as user_id,
    'Default Scene Config' as config_name,
    true as is_default
FROM auth.users 
WHERE id NOT IN (
    SELECT DISTINCT user_id FROM public.user_scene_configs
);
```

## ⚠️ Important Notes

1. **Local migrations don't sync to production automatically**
2. **Always test migrations locally first**
3. **Use Supabase CLI for better migration management**
4. **Keep migration files in version control**
5. **Document all schema changes**

## 🔍 Troubleshooting

### If Migration Fails:
1. Check for syntax errors
2. Verify permissions
3. Check for existing objects
4. Use `IF EXISTS`/`IF NOT EXISTS` clauses

### If Table Still Missing:
1. Verify you're in the correct project
2. Check database permissions
3. Try running migration in smaller chunks
4. Contact Supabase support if needed

## 📞 Next Steps

1. **Run the production migration** (immediate fix)
2. **Set up Supabase CLI** for future migrations
3. **Create migration workflow** for your team
4. **Test the application** after migration
