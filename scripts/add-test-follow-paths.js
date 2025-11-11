#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');

if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const rawLine of envLines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }
    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const supabaseUrl =
  process.env.SUPABASE_SERVICE_URL ||
  process.env.PLAYWRIGHT_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'http://kong:8000';

const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ Missing Supabase anon key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addTestFollowPaths() {
  try {
    console.log('🔍 Looking up user ivanprokic@gmail.com...');
    
    // Get user ID
    const { data: user, error: userError } = await supabase.auth.signInWithPassword({
      email: 'ivanprokic@gmail.com',
      password: 'test12345'
    });

    if (userError) {
      console.error('❌ Failed to authenticate user:', userError.message);
      return;
    }

    console.log('✅ User authenticated:', user.user.email);

    // Get user's scene design config
    const { data: configs, error: configError } = await supabase
      .from('scene_design_configs')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('is_default', true)
      .single();

    if (configError) {
      console.error('❌ Failed to get user config:', configError.message);
      return;
    }

    console.log('✅ Found scene design config:', configs.id);

    // First, deactivate all existing paths
    console.log('🔄 Deactivating existing paths...');
    const { error: deactivateError } = await supabase
      .from('scene_follow_paths')
      .update({ is_active: false })
      .eq('scene_design_config_id', configs.id);

    if (deactivateError) {
      console.error('❌ Failed to deactivate existing paths:', deactivateError.message);
      return;
    }

    // Add multiple test follow paths with original camera points
    const testPaths = [
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891',
        scene_design_config_id: configs.id,
        path_name: 'current',
        camera_points: [
          { x: 20, y: 5, z: 0 },
          { x: -8, y: 6.5, z: 2 },
          { x: -14, y: 6.75, z: 7 },
          { x: -8, y: 7, z: 24 },
          { x: -4, y: 7, z: 30 },
          { x: -2, y: 7.25, z: 32 },
          { x: 12, y: 7.5, z: 32 },
          { x: 20, y: 8, z: 25 },
          { x: 16, y: 8, z: 0 }
        ],
        look_at_targets: [
          { x: 0, y: 0, z: 0 },
          { x: 4, y: 3, z: 0 },
          { x: 6, y: 4, z: 0 },
          { x: 7, y: 5, z: 30 },
          { x: 10, y: 6, z: 50 },
          { x: 20, y: 7, z: 60 },
          { x: 30, y: 8, z: 40 },
          { x: 30, y: 8, z: 20 },
          { x: 0, y: 8, z: -40 }
        ],
        is_active: true
      },
      {
        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678912',
        scene_design_config_id: configs.id,
        path_name: 'bathroom_walkthrough',
        camera_points: [
          { x: 20, y: 5, z: 0 },    // Start position
          { x: 10, y: 5, z: -5 },   // Move towards bathroom
          { x: 0, y: 5, z: -10 },   // Enter bathroom area
          { x: -10, y: 5, z: -5 },  // Show bathroom features
          { x: -20, y: 5, z: 0 },   // Exit bathroom
          { x: -8, y: 6.5, z: 2 },  // Continue original path
          { x: -14, y: 6.75, z: 7 },
          { x: -8, y: 7, z: 24 },
          { x: -4, y: 7, z: 30 }
        ],
        look_at_targets: [
          { x: 0, y: 0, z: 0 },     // Start look at
          { x: 5, y: 2, z: -8 },    // Look at bathroom entrance
          { x: 0, y: 3, z: -15 },   // Look at bathroom center
          { x: -5, y: 2, z: -8 },   // Look at bathroom features
          { x: -10, y: 1, z: 0 },   // Look at bathroom exit
          { x: -8, y: 6.5, z: 2 },  // Continue original look at
          { x: -14, y: 6.75, z: 7 },
          { x: -8, y: 7, z: 24 },
          { x: -4, y: 7, z: 30 }
        ],
        is_active: false
      },
      {
        id: 'c3d4e5f6-a7b8-9012-cdef-123456789123',
        scene_design_config_id: configs.id,
        path_name: 'kitchen_tour',
        camera_points: [
          { x: 20, y: 5, z: 0 },    // Start position
          { x: 15, y: 5, z: 5 },    // Move towards kitchen
          { x: 10, y: 5, z: 10 },   // Kitchen entrance
          { x: 5, y: 5, z: 15 },    // Kitchen center
          { x: 0, y: 5, z: 20 },    // Kitchen features
          { x: -5, y: 5, z: 15 },   // Kitchen exit
          { x: -8, y: 6.5, z: 2 },  // Continue original path
          { x: -14, y: 6.75, z: 7 },
          { x: -8, y: 7, z: 24 }
        ],
        look_at_targets: [
          { x: 0, y: 0, z: 0 },     // Start look at
          { x: 8, y: 2, z: 8 },     // Look at kitchen entrance
          { x: 5, y: 3, z: 15 },    // Look at kitchen center
          { x: 0, y: 4, z: 25 },    // Look at kitchen features
          { x: -2, y: 3, z: 20 },   // Look at kitchen exit
          { x: -5, y: 2, z: 10 },   // Transition look at
          { x: -8, y: 6.5, z: 2 },  // Continue original look at
          { x: -14, y: 6.75, z: 7 },
          { x: -8, y: 7, z: 24 }
        ],
        is_active: false
      }
    ];

    console.log('🔄 Adding test follow paths...');
    
    for (const path of testPaths) {
      const { data, error } = await supabase
        .from('scene_follow_paths')
        .upsert(path, { onConflict: 'id' })
        .select();

      if (error) {
        console.error(`❌ Failed to add path "${path.path_name}":`, error.message);
      } else {
        console.log(`✅ Added path "${path.path_name}" with ${path.camera_points.length} points (active: ${path.is_active})`);
      }
    }

    // Verify the paths were added
    console.log('🔍 Verifying added paths...');
    const { data: allPaths, error: verifyError } = await supabase
      .from('scene_follow_paths')
      .select('*')
      .eq('scene_design_config_id', configs.id)
      .order('created_at', { ascending: false });

    if (verifyError) {
      console.error('❌ Failed to verify paths:', verifyError.message);
    } else {
      console.log('📊 All paths for user:');
      allPaths.forEach(path => {
        console.log(`  - "${path.path_name}" (active: ${path.is_active}) with ${path.camera_points?.length || 0} points`);
      });
    }

    console.log('✅ Test follow paths setup complete!');

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

addTestFollowPaths();
