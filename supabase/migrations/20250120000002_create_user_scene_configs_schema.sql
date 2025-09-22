-- Migration 0002: Create user_scene_configs table schema
-- This migration creates the user_scene_configs table with all necessary columns, indexes, and RLS policies

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

-- Insert default scene configs for existing users (if any)
-- This will be handled by the application when users first log in
