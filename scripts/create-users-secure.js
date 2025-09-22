const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'http://kong:8000';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key-here';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

async function createUsers() {
  console.log('🔐 Creating users with service key...');
  
  if (supabaseServiceKey === 'your-service-key-here') {
    console.error('❌ Please set SUPABASE_SERVICE_KEY environment variable');
    console.log('   Get it from: Supabase Dashboard > Settings > API > service_role key');
    process.exit(1);
  }

  try {
    // Create User 1: Ivan Prokic
    const { data: user1, error: error1 } = await supabase.auth.admin.createUser({
      email: 'ivanprokic@gmail.com',
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        name: 'Ivan Prokic'
      }
    });

    if (error1) {
      console.error('❌ Error creating user 1:', error1.message);
    } else {
      console.log('✅ User 1 created:', user1.user?.email);
    }

    // Create User 2: Ema Prokic  
    const { data: user2, error: error2 } = await supabase.auth.admin.createUser({
      email: 'ivanprokic@yahoo.com',
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        name: 'Ema Prokic'
      }
    });

    if (error2) {
      console.error('❌ Error creating user 2:', error2.message);
    } else {
      console.log('✅ User 2 created:', user2.user?.email);
    }

    console.log('\n📋 Test Credentials:');
    console.log('User 1: ivanprokic@gmail.com / testpassword123 (has scene config)');
    console.log('User 2: ivanprokic@yahoo.com / testpassword123 (no scene config)');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

createUsers();
