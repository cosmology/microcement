# 🚀 Vercel Production Deployment Guide

## ⚠️ Critical: Production Database Setup

**Your local migrations DO NOT automatically run in production!** You must manually create the database schema in your production Supabase.

## 📋 Pre-Deployment Checklist

### 1. ✅ Environment Variables Setup

**In Vercel Dashboard** (`vercel.com/dashboard` → Your Project → Settings → Environment Variables):

```bash
# Required for Production
NEXT_PUBLIC_SUPABASE_URL=https://lxsbolsjavowlymvpyxo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
NEXT_PUBLIC_SITE_URL=https://your-vercel-app.vercel.app

# Optional (for enhanced features)
NEXT_PUBLIC_VERCEL_ENV=production
```

### 2. ✅ Production Database Schema

**You MUST run this SQL in your production Supabase:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `lxsbolsjavowlymvpyxo`
3. Go to **SQL Editor**
4. Run this complete SQL script:

```sql
-- Create user_scene_configs table
CREATE TABLE IF NOT EXISTS public.user_scene_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    config_name VARCHAR(255) NOT NULL DEFAULT 'default',
    model_path VARCHAR(500) DEFAULT '/models/no-material.glb',
    
    -- Camera settings
    camera_fov INTEGER DEFAULT 75,
    camera_near DECIMAL DEFAULT 0.1,
    camera_far DECIMAL DEFAULT 1000,
    orbital_height DECIMAL DEFAULT 40,
    orbital_radius_multiplier DECIMAL DEFAULT 6,
    orbital_speed DECIMAL DEFAULT 0.2,
    
    -- Model transformations
    target_size DECIMAL DEFAULT 30,
    scale_multiplier DECIMAL DEFAULT 2,
    rotation_y DECIMAL DEFAULT 1.5707963267948966, -- Math.PI / 2
    
    -- Intro animation
    intro_duration INTEGER DEFAULT 3000,
    intro_start_pos JSONB DEFAULT '{"x": 0, "y": 20, "z": 0}',
    intro_end_pos JSONB DEFAULT '{"x": -6.554798188035982, "y": 7.001298362376955, "z": 26.293127720925533}',
    
    -- Hotspot settings
    hotspot_colors JSONB DEFAULT '{"normal": 9223167, "hover": 11722918, "pulse": 9223167}',
    pulse_animation JSONB DEFAULT '{"duration": 800, "scale": 1.5, "opacity": 0.8}',
    hotspot_focal_distances JSONB DEFAULT '{}',
    hotspot_categories JSONB DEFAULT '{}',
    
    -- Camera path data
    camera_points JSONB DEFAULT '[]',
    look_at_targets JSONB DEFAULT '[]',
    
    -- API settings
    api_hotspot_key_aliases JSONB DEFAULT '{}',
    
    -- Metadata
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_scene_configs_user_id ON public.user_scene_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scene_configs_config_name ON public.user_scene_configs(user_id, config_name);
CREATE INDEX IF NOT EXISTS idx_user_scene_configs_is_default ON public.user_scene_configs(user_id, is_default);

-- Enable Row Level Security
ALTER TABLE public.user_scene_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own scene configs" ON public.user_scene_configs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scene configs" ON public.user_scene_configs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scene configs" ON public.user_scene_configs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scene configs" ON public.user_scene_configs
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_scene_configs_updated_at
    BEFORE UPDATE ON public.user_scene_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 3. ✅ Supabase Auth Configuration

**In Supabase Dashboard** → Authentication → URL Configuration:

```bash
# Site URL
https://your-vercel-app.vercel.app

# Redirect URLs (add these)
https://your-vercel-app.vercel.app/auth/callback
https://your-vercel-app.vercel.app/**
```

## 🚀 Deployment Process

### Step 1: Push Code to Git
```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### Step 2: Deploy to Vercel
```bash
# Option A: Automatic (if connected to Git)
# Vercel will auto-deploy when you push to main

# Option B: Manual deployment
vercel --prod
```

### Step 3: Verify Deployment
1. **Check Vercel Dashboard** for successful build
2. **Test your live URL** for functionality
3. **Test user registration/login** flow
4. **Verify 3D scene loads** correctly

## 🔍 Post-Deployment Testing

### ✅ Authentication Flow
- [ ] User can sign up
- [ ] Email confirmation works
- [ ] User can sign in
- [ ] User can sign out

### ✅ 3D Scene Functionality
- [ ] Scene loads without errors
- [ ] Hotspots are interactive
- [ ] Marker panels show correctly
- [ ] Scene configs are created automatically

### ✅ Database Operations
- [ ] User scene configs are created
- [ ] RLS policies work correctly
- [ ] API endpoints respond properly

## 🐛 Common Production Issues

### Issue: "404 Not Found" for user_scene_configs
**Solution**: Run the SQL schema script above in production Supabase

### Issue: Authentication redirects fail
**Solution**: Update Supabase Auth URL configuration

### Issue: Environment variables not working
**Solution**: Check Vercel environment variables are set correctly

### Issue: Build fails
**Solution**: Check build logs in Vercel dashboard

## 📞 Support

If you encounter issues:
1. Check Vercel build logs
2. Check Supabase logs
3. Verify environment variables
4. Test locally first

## 🎯 Success Criteria

Your production deployment is successful when:
- ✅ App loads at your Vercel URL
- ✅ Users can register and login
- ✅ 3D scene loads and functions
- ✅ Database operations work
- ✅ No console errors

---

**Remember**: The database schema must be manually created in production Supabase - your local migrations don't automatically apply!
