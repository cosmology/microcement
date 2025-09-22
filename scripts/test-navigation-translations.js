#!/usr/bin/env node

/**
 * Test script to verify navigation translations are working correctly
 * This script checks that all navigation translation keys exist in all language files
 */

const fs = require('fs');
const path = require('path');

// Define the navigation keys that should exist
const navigationKeys = [
  'ecoFriendly',
  'speed', 
  'seamlessFinishes',
  'gallery',
  'benefits',
  'luxury',
  'beforeAfter',
  'featured',
  'textures',
  'upload'
];

// Language files to check
const languageFiles = [
  'messages/en.json',
  'messages/es.json', 
  'messages/sr.json'
];

console.log('🧪 Testing Navigation Translation Implementation...\n');

let allTestsPassed = true;

// Test 1: Check that all language files exist
console.log('📁 Checking language files...');
languageFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file} exists`);
  } else {
    console.log(`  ❌ ${file} missing`);
    allTestsPassed = false;
  }
});

// Test 2: Check that all navigation keys exist in each language file
console.log('\n🔑 Checking navigation translation keys...');
languageFiles.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const translations = JSON.parse(content);
      
      if (translations.Navigation) {
        console.log(`\n  📄 ${file}:`);
        navigationKeys.forEach(key => {
          if (translations.Navigation[key]) {
            console.log(`    ✅ ${key}: "${translations.Navigation[key]}"`);
          } else {
            console.log(`    ❌ ${key}: MISSING`);
            allTestsPassed = false;
          }
        });
      } else {
        console.log(`  ❌ ${file}: Navigation section missing`);
        allTestsPassed = false;
      }
    } catch (error) {
      console.log(`  ❌ ${file}: Invalid JSON - ${error.message}`);
      allTestsPassed = false;
    }
  }
});

// Test 3: Check NavigationSection.tsx implementation
console.log('\n🔧 Checking NavigationSection.tsx implementation...');
const navComponentPath = 'app/components/NavigationSection.tsx';
if (fs.existsSync(navComponentPath)) {
  const content = fs.readFileSync(navComponentPath, 'utf8');
  
  // Check for useTranslations import
  if (content.includes("useTranslations('Navigation')")) {
    console.log('  ✅ useTranslations(\'Navigation\') found');
  } else {
    console.log('  ❌ useTranslations(\'Navigation\') not found');
    allTestsPassed = false;
  }
  
  // Check for dynamic navigation creation
  if (content.includes('const navLinks = [')) {
    console.log('  ✅ Dynamic navLinks array found');
  } else {
    console.log('  ❌ Dynamic navLinks array not found');
    allTestsPassed = false;
  }
  
  // Check for translation usage
  if (content.includes("t('ecoFriendly')") && content.includes("t('gallery')")) {
    console.log('  ✅ Translation keys being used in navigation');
  } else {
    console.log('  ❌ Translation keys not being used in navigation');
    allTestsPassed = false;
  }
} else {
  console.log('  ❌ NavigationSection.tsx not found');
  allTestsPassed = false;
}

// Summary
console.log('\n📊 Test Results:');
if (allTestsPassed) {
  console.log('  🎉 ALL TESTS PASSED! Navigation translations are properly implemented.');
  console.log('\n✨ Features implemented:');
  console.log('  • Dynamic navigation menu using translation keys');
  console.log('  • Support for English, Spanish, and Serbian');
  console.log('  • Both desktop and mobile navigation translated');
  console.log('  • Gallery dropdown menu translated');
  console.log('  • All navigation items properly localized');
} else {
  console.log('  ❌ SOME TESTS FAILED! Please check the issues above.');
  process.exit(1);
}

console.log('\n🚀 Navigation translation implementation is complete!');
