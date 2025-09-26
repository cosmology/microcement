#!/usr/bin/env node

/**
 * Test script to verify ivanprokic@yahoo.com can authenticate
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'http://localhost:8000'
const SUPABASE_ANON_KEY = 'SUPABASE_ANON_KEY_PLACEHOLDER'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testYahooLogin() {
  console.log('🧪 Testing ivanprokic@yahoo.com authentication\n')

  try {
    // 1. Attempt to sign in
    console.log('🔐 Attempting to sign in...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'ivanprokic@yahoo.com',
      password: 'test12345'
    })

    if (authError) {
      console.error(`❌ Authentication failed: ${authError.message}`)
      return
    }

    console.log(`✅ Authentication successful!`)
    console.log(`   User ID: ${authData.user.id}`)
    console.log(`   Email: ${authData.user.email}`)
    console.log(`   Email confirmed: ${authData.user.email_confirmed_at ? 'Yes' : 'No'}`)
    console.log(`   Last sign in: ${authData.user.last_sign_in_at}`)

    // 2. Test scene configuration access
    console.log('\n📋 Testing scene configuration access...')
    const { data: configs, error: configError } = await supabase
      .from('scene_design_configs')
      .select('*')
      .eq('user_id', authData.user.id)

    if (configError) {
      console.error(`❌ Failed to fetch scene configs: ${configError.message}`)
    } else {
      console.log(`✅ Found ${configs.length} scene configuration(s)`)
      if (configs.length > 0) {
        const defaultConfig = configs.find(c => c.is_default)
        if (defaultConfig) {
          console.log(`   Default config: "${defaultConfig.config_name}"`)
          console.log(`   Model: ${defaultConfig.model_path}`)
        }
      }
    }

    // 3. Test follow paths access
    console.log('\n🛤️  Testing follow paths access...')
    if (configs && configs.length > 0) {
      const { data: followPaths, error: pathsError } = await supabase
        .from('scene_follow_paths')
        .select('*')
        .eq('scene_design_config_id', configs[0].id)

      if (pathsError) {
        console.error(`❌ Failed to fetch follow paths: ${pathsError.message}`)
      } else {
        console.log(`✅ Found ${followPaths.length} follow path(s)`)
        followPaths.forEach(path => {
          const status = path.is_active ? '🟢 ACTIVE' : '⚪ inactive'
          const pointsCount = path.camera_points?.length || 0
          const targetsCount = path.look_at_targets?.length || 0
          console.log(`   ${status} "${path.path_name}" (${pointsCount} points, ${targetsCount} targets)`)
        })
      }
    }

    // 4. Sign out
    await supabase.auth.signOut()
    console.log('\n👋 Signed out successfully')

    console.log('\n🎉 Yahoo user authentication test completed successfully!')

  } catch (error) {
    console.error(`❌ Unexpected error:`, error.message)
  }
}

// Run the test
testYahooLogin().catch(console.error)
