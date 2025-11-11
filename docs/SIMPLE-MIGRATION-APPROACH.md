# 🎯 Simple Manual Migration Approach

## 🚀 The Right Way: Manual Migration After Deployment

### **Step 1: Deploy Your Code**
```bash
git add .
git commit -m "Add user_scene_configs table schema"
git push origin main
```

### **Step 2: Run Migration Manually**
After Vercel deployment completes, run the migration in Supabase Dashboard:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/lxsbolsjavowlymvpyxo
2. **Navigate to SQL Editor** (left sidebar)
3. **Copy and paste** the SQL from `supabase/production-migration.sql`
4. **Click "Run"** to execute

### **Step 3: Verify Migration**
```sql
-- Check if table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'user_scene_configs';

-- Check if policies exist
SELECT policyname FROM pg_policies 
WHERE tablename = 'user_scene_configs';
```

## 🔄 Alternative: Vercel Deploy Hook (More Automated)

### **Setup Deploy Hook:**
1. **Vercel Dashboard** → Your Project → Settings → Git
2. **Create Deploy Hook** for production branch
3. **Copy the webhook URL**

### **Use Deploy Hook Workflow:**
```bash
# After code deployment
curl -X POST "https://api.vercel.com/v1/integrations/deploy/your-webhook-url"
```

## 📋 Migration SQL (Ready to Use)

The migration SQL is in `supabase/production-migration.sql` - just copy and paste it into Supabase Dashboard.

## ✅ Benefits of This Approach

- ✅ **Simple and reliable** - no complex auto-migration logic
- ✅ **Manual control** - you decide when to run migrations
- ✅ **No build dependencies** - Vercel builds cleanly
- ✅ **Easy to debug** - clear separation of concerns
- ✅ **Industry standard** - follows best practices

## 🎯 Your Workflow

1. **Commit and push** your code changes
2. **Wait for Vercel deployment** to complete
3. **Run migration** in Supabase Dashboard
4. **Test your app** - it should work perfectly

**Simple, clean, and reliable!** 🎉
