import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Ensure this API route runs during build
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Migration SQL
const MIGRATION_SQL = `
-- Create the user_scene_configs table
CREATE TABLE IF NOT EXISTS public.user_scene_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_name VARCHAR(255) NOT NULL DEFAULT 'Default Scene Config',
  model_path VARCHAR(500) DEFAULT '/models/no-material.glb',
  camera_fov INTEGER DEFAULT 75,
  camera_near DECIMAL(10,2) DEFAULT 0.1,
  camera_far DECIMAL(10,2) DEFAULT 1000,
  orbital_height DECIMAL(10,2) DEFAULT 40,
  orbital_radius_multiplier DECIMAL(10,2) DEFAULT 6,
  orbital_speed DECIMAL(10,2) DEFAULT 0.2,
  target_size DECIMAL(10,2) DEFAULT 30,
  scale_multiplier DECIMAL(10,2) DEFAULT 2,
  rotation_y DECIMAL(10,2) DEFAULT 1.5707963267948966,
  intro_duration INTEGER DEFAULT 3000,
  intro_start_pos JSONB DEFAULT '{"x": 0, "y": 20, "z": 0}',
  intro_end_pos JSONB DEFAULT '{"x": -6.554798188035982, "y": 7.001298362376955, "z": 26.293127720925533}',
  hotspot_colors JSONB DEFAULT '{"normal": 9223167, "hover": 11722918, "pulse": 9223167}',
  pulse_animation JSONB DEFAULT '{"duration": 800, "scale": 1.5, "opacity": 0.8}',
  hotspot_focal_distances JSONB DEFAULT '{"kitchen": 15, "bathroom": 12, "living": 18}',
  hotspot_categories JSONB DEFAULT '{"kitchen": "Kitchen Area", "bathroom": "Bathroom", "living": "Living Space"}',
  camera_points JSONB DEFAULT '[
    {"x": 20, "y": 5, "z": 0},
    {"x": -8, "y": 6.5, "z": 2},
    {"x": -14, "y": 6.75, "z": 7},
    {"x": -8, "y": 7, "z": 24},
    {"x": -4, "y": 7, "z": 30},
    {"x": -2, "y": 7.25, "z": 32},
    {"x": 12, "y": 7.5, "z": 32},
    {"x": 20, "y": 8, "z": 25},
    {"x": 16, "y": 8, "z": 0}
  ]',
  look_at_targets JSONB DEFAULT '[
    {"x": 0, "y": 0, "z": 0},
    {"x": 4, "y": 3, "z": 0},
    {"x": 6, "y": 4, "z": 0},
    {"x": 7, "y": 5, "z": 30},
    {"x": 10, "y": 6, "z": 50},
    {"x": 20, "y": 7, "z": 60},
    {"x": 30, "y": 8, "z": 40},
    {"x": 30, "y": 8, "z": 20},
    {"x": 0, "y": 8, "z": -40}
  ]',
  api_hotspot_key_aliases JSONB DEFAULT '{"kitchen": "kitchen_hotspot", "bathroom": "bathroom_hotspot", "living": "living_hotspot"}',
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_scene_configs_user_id ON public.user_scene_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scene_configs_is_default ON public.user_scene_configs(is_default);
CREATE INDEX IF NOT EXISTS idx_user_scene_configs_created_at ON public.user_scene_configs(created_at);

-- Enable RLS
ALTER TABLE public.user_scene_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own scene configs" ON public.user_scene_configs;
CREATE POLICY "Users can view their own scene configs" ON public.user_scene_configs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own scene configs" ON public.user_scene_configs;
CREATE POLICY "Users can insert their own scene configs" ON public.user_scene_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own scene configs" ON public.user_scene_configs;
CREATE POLICY "Users can update their own scene configs" ON public.user_scene_configs
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own scene configs" ON public.user_scene_configs;
CREATE POLICY "Users can delete their own scene configs" ON public.user_scene_configs
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_scene_configs_updated_at ON public.user_scene_configs;
CREATE TRIGGER update_user_scene_configs_updated_at
  BEFORE UPDATE ON public.user_scene_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting production migration...')
    
    // Check if table already exists by trying to query it
    try {
      const { data, error } = await supabase
        .from('user_scene_configs')
        .select('id')
        .limit(1)
      
      if (!error) {
        console.log('✅ user_scene_configs table already exists')
        return NextResponse.json({ 
          success: true, 
          message: 'Table already exists',
          action: 'skipped'
        })
      }
    } catch (checkError) {
      console.log('📋 Table does not exist, proceeding with migration...')
    }

    // Execute migration using raw SQL
    const { error: migrationError } = await supabase.rpc('exec', { 
      sql: MIGRATION_SQL 
    })

    if (migrationError) {
      console.error('❌ Error running migration:', migrationError)
      return NextResponse.json({ 
        success: false, 
        error: migrationError.message 
      }, { status: 500 })
    }

    console.log('✅ Migration completed successfully')

    return NextResponse.json({ 
      success: true, 
      message: 'Migration completed successfully',
      action: 'created'
    })

  } catch (error) {
    console.error('❌ Migration failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Also handle GET requests for health checks
export async function GET() {
  return NextResponse.json({ 
    status: 'ready',
    message: 'Migration API is ready'
  })
}
