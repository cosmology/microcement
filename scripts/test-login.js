const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://kong:8000';
const supabaseAnonKey = 'SUPABASE_ANON_KEY_PLACEHOLDER';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  console.log('🧪 Testing login with existing users...');

  try {
    // Test User 1
    console.log('👤 Testing User 1: ivanprokic@gmail.com');
    const { data: user1, error: error1 } = await supabase.auth.signInWithPassword({
      email: 'ivanprokic@gmail.com',
      password: 'test12345'
    });

    if (error1) {
      console.error('❌ User 1 login failed:', error1.message);
    } else {
      console.log('✅ User 1 login successful:', user1.user.email);
    }

    // Test User 2 (not confirmed, should fail)
    console.log('👤 Testing User 2: ivanprokic@yahoo.com (should fail - not confirmed)');
    const { data: user2, error: error2 } = await supabase.auth.signInWithPassword({
      email: 'ivanprokic@yahoo.com',
      password: 'test12345'
    });

    if (error2) {
      console.log('❌ User 2 login failed (expected):', error2.message);
    } else {
      console.log('✅ User 2 login successful:', user2.user.email);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testLogin();
