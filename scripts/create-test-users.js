#!/usr/bin/env node

/**
 * Script to create test users for Supabase authentication
 * Run with: node scripts/create-test-users.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://kong:8000';
const supabaseServiceKey = 'SUPABASE_SERVICE_ROLE_KEY_PLACEHOLDER';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const testUsers = [
  {
    email: 'user1@example.com',
    password: 'password123',
    name: 'Test User 1'
  },
  {
    email: 'user2@example.com', 
    password: 'password123',
    name: 'Test User 2'
  },
  {
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Admin User'
  }
];

async function createTestUsers() {
  console.log('🚀 Creating test users...\n');

  for (const user of testUsers) {
    try {
      console.log(`📝 Creating user: ${user.email}`);
      
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: user.name
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`⚠️  User ${user.email} already exists`);
        } else {
          console.error(`❌ Error creating ${user.email}:`, error.message);
        }
      } else {
        console.log(`✅ User ${user.email} created successfully`);
        console.log(`   User ID: ${data.user.id}`);
      }
    } catch (err) {
      console.error(`❌ Unexpected error for ${user.email}:`, err.message);
    }
    console.log('');
  }

  console.log('🎉 Test user creation completed!');
  console.log('\n📋 Test Users:');
  testUsers.forEach(user => {
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${user.password}`);
    console.log(`   Name: ${user.name}`);
    console.log('');
  });
}

// Run the script
createTestUsers().catch(console.error);
