#!/usr/bin/env node

/**
 * Script to verify users and scene configurations in Supabase
 * Run with: node scripts/verify-users.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://kong:8000';
const supabaseAnonKey = 'SUPABASE_ANON_KEY_PLACEHOLDER';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyUsers() {
  console.log('🔍 Verifying users and scene configurations...\n');

  try {
    // Check if we can connect to Supabase
    console.log('📡 Testing Supabase connection...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('user_scene_configs')
      .select('count')
      .limit(1);

    if (healthError) {
      console.error('❌ Supabase connection failed:', healthError.message);
      return;
    }

    console.log('✅ Supabase connection successful\n');

    // Get all users (this will only work if RLS allows it)
    console.log('👥 Checking for users...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.log('⚠️  Cannot list users (RLS protection) - this is expected');
      console.log('   Users can only be accessed through authentication\n');
    } else {
      console.log(`✅ Found ${users.users.length} users:`);
      users.users.forEach(user => {
        console.log(`   - ${user.email} (ID: ${user.id})`);
      });
      console.log('');
    }

    // Check scene configurations
    console.log('🎯 Checking scene configurations...');
    const { data: configs, error: configsError } = await supabase
      .from('user_scene_configs')
      .select('id, user_id, name, is_default, created_at')
      .limit(10);

    if (configsError) {
      console.error('❌ Error fetching scene configs:', configsError.message);
    } else {
      console.log(`✅ Found ${configs.length} scene configurations:`);
      configs.forEach(config => {
        console.log(`   - ${config.name} (User: ${config.user_id.substring(0, 8)}...) ${config.is_default ? '(Default)' : ''}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the verification
verifyUsers().catch(console.error);
