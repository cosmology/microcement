-- Migration Script: Transform user_scene_configs to scene_design_configs + scene_follow_paths
-- This script migrates data from the old Supabase migration structure to the new Liquibase structure

-- Step 1: Create the new tables (if they don't exist)
-- This should match your Liquibase init-0001.yaml

-- Create scene_design_configs table
CREATE TABLE IF NOT EXISTS public.scene_design_configs (
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
    rotation_y DECIMAL DEFAULT 1.5707963267948966,
    
    -- Intro animation
    intro_duration INTEGER DEFAULT 3000,
    intro_start_pos JSONB DEFAULT '{"x": 0, "y": 20, "z": 0}',
    intro_end_pos JSONB DEFAULT '{"x": -6.554798188035982, "y": 7.001298362376955, "z": 26.293127720925533}',
    
    -- Hotspot settings
    hotspot_colors JSONB DEFAULT '{"normal": 9223167, "hover": 11722918, "pulse": 9223167}',
    pulse_animation JSONB DEFAULT '{"duration": 800, "scale": 1.5, "opacity": 0.8}',
    hotspot_focal_distances JSONB DEFAULT '{}',
    hotspot_categories JSONB DEFAULT '{}',
    
    -- Look at targets (moved from camera_points)
    look_at_targets JSONB DEFAULT '[]',
    
    -- API settings
    api_hotspot_key_aliases JSONB DEFAULT '{}',
    
    -- Metadata
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scene_follow_paths table
CREATE TABLE IF NOT EXISTS public.scene_follow_paths (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scene_design_config_id UUID REFERENCES public.scene_design_configs(id) ON DELETE CASCADE NOT NULL,
    path_name VARCHAR(255) NOT NULL DEFAULT 'default',
    camera_points JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Migrate data from old table to new tables
-- Only run this if you have existing data in user_scene_configs

DO $$
DECLARE
    old_config RECORD;
    new_config_id UUID;
BEGIN
    -- Check if old table exists and has data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_scene_configs' AND table_schema = 'public') THEN
        
        -- Migrate each config from user_scene_configs
        FOR old_config IN 
            SELECT * FROM public.user_scene_configs 
        LOOP
            -- Insert into scene_design_configs (without camera_points)
            INSERT INTO public.scene_design_configs (
                id, user_id, config_name, model_path,
                camera_fov, camera_near, camera_far,
                orbital_height, orbital_radius_multiplier, orbital_speed,
                target_size, scale_multiplier, rotation_y,
                intro_duration, intro_start_pos, intro_end_pos,
                hotspot_colors, pulse_animation, hotspot_focal_distances,
                hotspot_categories, look_at_targets, api_hotspot_key_aliases,
                is_default, created_at, updated_at
            ) VALUES (
                old_config.id, old_config.user_id, old_config.config_name, old_config.model_path,
                old_config.camera_fov, old_config.camera_near, old_config.camera_far,
                old_config.orbital_height, old_config.orbital_radius_multiplier, old_config.orbital_speed,
                old_config.target_size, old_config.scale_multiplier, old_config.rotation_y,
                old_config.intro_duration, old_config.intro_start_pos, old_config.intro_end_pos,
                old_config.hotspot_colors, old_config.pulse_animation, old_config.hotspot_focal_distances,
                old_config.hotspot_categories, old_config.look_at_targets, old_config.api_hotspot_key_aliases,
                old_config.is_default, old_config.created_at, old_config.updated_at
            ) ON CONFLICT (id) DO NOTHING
            RETURNING id INTO new_config_id;
            
            -- If no conflict, use the old ID
            IF new_config_id IS NULL THEN
                new_config_id := old_config.id;
            END IF;
            
            -- Insert camera_points into scene_follow_paths
            INSERT INTO public.scene_follow_paths (
                scene_design_config_id, path_name, camera_points, is_active, created_at, updated_at
            ) VALUES (
                new_config_id, 'default', old_config.camera_points, true, old_config.created_at, old_config.updated_at
            ) ON CONFLICT DO NOTHING;
            
        END LOOP;
        
        RAISE NOTICE 'Migration completed. Migrated % records from user_scene_configs to new structure.', 
            (SELECT COUNT(*) FROM public.user_scene_configs);
    ELSE
        RAISE NOTICE 'No user_scene_configs table found. Skipping data migration.';
    END IF;
END $$;

-- Step 3: Create indexes and constraints (if not exists)
CREATE INDEX IF NOT EXISTS idx_scene_design_configs_user_id ON public.scene_design_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_scene_design_configs_config_name ON public.scene_design_configs(user_id, config_name);
CREATE INDEX IF NOT EXISTS idx_scene_design_configs_is_default ON public.scene_design_configs(user_id, is_default);

CREATE INDEX IF NOT EXISTS idx_scene_follow_paths_config_id ON public.scene_follow_paths(scene_design_config_id);
CREATE INDEX IF NOT EXISTS idx_scene_follow_paths_active ON public.scene_follow_paths(scene_design_config_id, is_active);

-- Step 4: Enable RLS and create policies
ALTER TABLE public.scene_design_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_follow_paths ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view their own scene configs" ON public.scene_design_configs;
DROP POLICY IF EXISTS "Users can insert their own scene configs" ON public.scene_design_configs;
DROP POLICY IF EXISTS "Users can update their own scene configs" ON public.scene_design_configs;
DROP POLICY IF EXISTS "Users can delete their own scene configs" ON public.scene_design_configs;

-- Create new policies using JWT-based auth
CREATE POLICY "Users can access their own scene design configs" ON public.scene_design_configs
    FOR ALL USING ((auth.jwt() ->> 'sub')::uuid = user_id)
    WITH CHECK ((auth.jwt() ->> 'sub')::uuid = user_id);

CREATE POLICY "Users can access scene follow paths for their configs" ON public.scene_follow_paths
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.scene_design_configs sdc
            WHERE sdc.id = scene_design_config_id
            AND (auth.jwt() ->> 'sub')::uuid = sdc.user_id
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.scene_design_configs sdc
            WHERE sdc.id = scene_design_config_id
            AND (auth.jwt() ->> 'sub')::uuid = sdc.user_id
        )
    );

-- Step 5: Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS 
'BEGIN NEW.updated_at = NOW(); RETURN NEW; END' language 'plpgsql';

CREATE TRIGGER update_scene_design_configs_updated_at
    BEFORE UPDATE ON public.scene_design_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scene_follow_paths_updated_at
    BEFORE UPDATE ON public.scene_follow_paths
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Verification queries
-- Run these to verify the migration worked correctly

-- Check table counts
SELECT 
    'scene_design_configs' as table_name, 
    COUNT(*) as record_count 
FROM public.scene_design_configs
UNION ALL
SELECT 
    'scene_follow_paths' as table_name, 
    COUNT(*) as record_count 
FROM public.scene_follow_paths;

-- Check if old table still exists (for cleanup later)
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_scene_configs' AND table_schema = 'public')
        THEN 'user_scene_configs table still exists - can be dropped after verification'
        ELSE 'user_scene_configs table does not exist'
    END as status;
