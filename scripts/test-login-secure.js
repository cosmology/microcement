const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'http://kong:8000';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  console.log('🧪 Testing login with existing users...');
  
  if (supabaseAnonKey === 'your-anon-key-here') {
    console.error('❌ Please set SUPABASE_ANON_KEY environment variable');
    console.log('   Get it from: Supabase Dashboard > Settings > API > anon public key');
    process.exit(1);
  }

  try {
    // Test User 1 login
    const { data: user1, error: error1 } = await supabase.auth.signInWithPassword({
      email: 'ivanprokic@gmail.com',
      password: 'testpassword123'
    });

    if (error1) {
      console.error('❌ User 1 login failed:', error1.message);
    } else {
      console.log('✅ User 1 login successful:', user1.user?.email);
    }

    // Test User 2 login
    const { data: user2, error: error2 } = await supabase.auth.signInWithPassword({
      email: 'ivanprokic@yahoo.com',
      password: 'testpassword123'
    });

    if (error2) {
      console.error('❌ User 2 login failed:', error2.message);
    } else {
      console.log('✅ User 2 login successful:', user2.user?.email);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testLogin();
