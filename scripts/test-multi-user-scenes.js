#!/usr/bin/env node

/**
 * Test script to verify multi-user scene configurations
 * Tests both ivanprokic@gmail.com and ivanprokic@yahoo.com users
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'http://localhost:8000'
const SUPABASE_ANON_KEY = 'SUPABASE_ANON_KEY_PLACEHOLDER'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testUserScenes() {
  console.log('🧪 Testing Multi-User Scene Configurations\n')

  // Test users
  const users = [
    { email: 'ivanprokic@gmail.com', password: 'test12345', expectedModel: '/models/no-material.glb' },
    { email: 'ivanprokic@yahoo.com', password: 'test12345', expectedModel: '/models/ema.glb' }
  ]

  for (const user of users) {
    console.log(`\n👤 Testing user: ${user.email}`)
    console.log('=' .repeat(50))

    try {
      // 1. Sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password
      })

      if (authError) {
        console.error(`❌ Auth failed: ${authError.message}`)
        continue
      }

      console.log(`✅ Signed in successfully`)
      console.log(`   User ID: ${authData.user.id}`)

      // 2. Get user's scene configs
      const { data: configs, error: configError } = await supabase
        .from('scene_design_configs')
        .select('*')
        .eq('user_id', authData.user.id)

      if (configError) {
        console.error(`❌ Failed to fetch configs: ${configError.message}`)
        continue
      }

      console.log(`📋 Found ${configs.length} scene configuration(s)`)

      if (configs.length === 0) {
        console.log(`⚠️  No scene configurations found for ${user.email}`)
        continue
      }

      // 3. Check default config
      const defaultConfig = configs.find(c => c.is_default)
      if (defaultConfig) {
        console.log(`🎯 Default config: "${defaultConfig.config_name}"`)
        console.log(`   Model: ${defaultConfig.model_path}`)
        console.log(`   Expected: ${user.expectedModel}`)
        
        if (defaultConfig.model_path === user.expectedModel) {
          console.log(`✅ Model path matches expected value`)
        } else {
          console.log(`❌ Model path mismatch!`)
        }

        // 4. Get follow paths for this config
        const { data: followPaths, error: pathsError } = await supabase
          .from('scene_follow_paths')
          .select('*')
          .eq('scene_design_config_id', defaultConfig.id)

        if (pathsError) {
          console.error(`❌ Failed to fetch follow paths: ${pathsError.message}`)
        } else {
          console.log(`🛤️  Found ${followPaths.length} follow path(s):`)
          followPaths.forEach(path => {
            const status = path.is_active ? '🟢 ACTIVE' : '⚪ inactive'
            const pointsCount = path.camera_points?.length || 0
            const targetsCount = path.look_at_targets?.length || 0
            console.log(`   ${status} "${path.path_name}" (${pointsCount} points, ${targetsCount} targets)`)
          })
        }
      } else {
        console.log(`⚠️  No default configuration found`)
      }

      // 5. Sign out
      await supabase.auth.signOut()
      console.log(`👋 Signed out`)

    } catch (error) {
      console.error(`❌ Unexpected error for ${user.email}:`, error.message)
    }
  }

  console.log('\n🎉 Multi-user scene test completed!')
}

// Run the test
testUserScenes().catch(console.error)
