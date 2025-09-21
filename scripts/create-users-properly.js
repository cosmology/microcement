const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://kong:8000';
const supabaseServiceKey = 'SUPABASE_SERVICE_ROLE_KEY_PLACEHOLDER';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

async function createTestUsers() {
  console.log('🔧 Creating test users via Supabase Auth API...');

  try {
    // Delete existing users first
    console.log('🗑️ Cleaning up existing test users...');
    
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    for (const user of existingUsers.users) {
      if (user.email === 'ivanporkic@gmail.com' || user.email === 'ivanprokic@yahoo.com') {
        console.log(`🗑️ Deleting existing user: ${user.email}`);
        await supabase.auth.admin.deleteUser(user.id);
      }
    }

    // Create User 1: Ivan Prokic
    console.log('👤 Creating User 1: Ivan Prokic (ivanporkic@gmail.com)...');
    const { data: user1, error: error1 } = await supabase.auth.admin.createUser({
      email: 'ivanprokic@gmail.com',
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        name: 'Ivan Prokic'
      }
    });

    if (error1) {
      console.error('❌ Error creating User 1:', error1.message);
    } else {
      console.log('✅ User 1 created successfully:', user1.user.email);
    }

    // Create User 2: Ema Prokic
    console.log('👤 Creating User 2: Ema Prokic (ivanprokic@yahoo.com)...');
    const { data: user2, error: error2 } = await supabase.auth.admin.createUser({
      email: 'ivanprokic@yahoo.com',
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        name: 'Ema Prokic'
      }
    });

    if (error2) {
      console.error('❌ Error creating User 2:', error2.message);
    } else {
      console.log('✅ User 2 created successfully:', user2.user.email);
    }

    // Create scene configuration for User 1
    if (user1 && !error1) {
      console.log('🎨 Creating scene configuration for User 1...');
      const { data: sceneConfig, error: configError } = await supabase
        .from('user_scene_configs')
        .insert({
          user_id: user1.user.id,
          config_name: 'Default Scene Config',
          model_path: '/models/no-material.glb',
          camera_fov: 75,
          camera_near: 0.1,
          camera_far: 1000,
          orbital_height: 40,
          orbital_radius_multiplier: 6,
          orbital_speed: 0.2,
          target_size: 30,
          scale_multiplier: 2,
          rotation_y: 1.5707963267948966,
          intro_duration: 3000,
          intro_start_pos: { x: 0, y: 20, z: 0 },
          intro_end_pos: { x: -6.554798188035982, y: 7.001298362376955, z: 26.293127720925533 },
          hotspot_colors: { normal: 9223167, hover: 11722918, pulse: 9223167 },
          pulse_animation: { duration: 800, scale: 1.5, opacity: 0.8 },
          hotspot_focal_distances: { kitchen: 15, bathroom: 12, living: 18 },
          hotspot_categories: { kitchen: 'Kitchen Area', bathroom: 'Bathroom', living: 'Living Space' },
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
          api_hotspot_key_aliases: { kitchen: 'kitchen_hotspot', bathroom: 'bathroom_hotspot', living: 'living_hotspot' },
          is_default: true
        });

      if (configError) {
        console.error('❌ Error creating scene config:', configError.message);
      } else {
        console.log('✅ Scene configuration created successfully');
      }
    }

    console.log('🎉 Test users creation completed!');
    console.log('\n📋 Test Credentials:');
    console.log('User 1: ivanprokic@gmail.com / testpassword123 (has scene config)');
    console.log('User 2: ivanprokic@yahoo.com / testpassword123 (no scene config)');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

createTestUsers();
