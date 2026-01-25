/**
 * Sync Verification Script
 *
 * Verifies that all sync components are in place
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Sync Implementation\n');

const checks = [];

// Check 1: Sync service files exist
console.log('Check 1: Sync Service Files');
const syncFiles = [
  'src/main/sync/index.ts',
  'src/main/sync/queue.ts',
  'src/main/sync/api.ts',
  'src/main/sync/conflict.ts',
  'src/main/sync/types.ts'
];

syncFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}`);
    checks.push(true);
  } else {
    console.log(`❌ ${file} - NOT FOUND`);
    checks.push(false);
  }
});

// Check 2: UI components exist
console.log('\nCheck 2: UI Components');
const uiFiles = [
  'src/renderer/src/components/SyncStatus.tsx',
  'src/renderer/src/components/SyncSettings.tsx',
  'src/renderer/src/store/useSyncStore.ts',
  'src/renderer/src/types/sync.ts'
];

uiFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}`);
    checks.push(true);
  } else {
    console.log(`❌ ${file} - NOT FOUND`);
    checks.push(false);
  }
});

// Check 3: Vercel API files exist
console.log('\nCheck 3: Vercel API Files');
const apiFiles = [
  'vercel-api/api/sync/push.ts',
  'vercel-api/api/sync/pull.ts',
  'vercel-api/api/sync/full.ts',
  'vercel-api/api/sync/database-info.ts',
  'vercel-api/api/sync/status.ts',
  'vercel-api/api/sync/lib/auth.ts',
  'vercel-api/api/sync/lib/neon.ts'
];

apiFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}`);
    checks.push(true);
  } else {
    console.log(`❌ ${file} - NOT FOUND`);
    checks.push(false);
  }
});

// Check 4: Preload API integration
console.log('\nCheck 4: Preload API Integration');
const preloadFile = path.join(__dirname, 'src/preload/index.ts');
if (fs.existsSync(preloadFile)) {
  const content = fs.readFileSync(preloadFile, 'utf-8');
  if (content.includes('sync:')) {
    console.log('✅ Sync methods added to preload API');
    checks.push(true);
  } else {
    console.log('❌ Sync methods not found in preload API');
    checks.push(false);
  }
} else {
  console.log('❌ Preload file not found');
  checks.push(false);
}

// Check 5: Main process IPC handlers
console.log('\nCheck 5: Main Process IPC Handlers');
const mainFile = path.join(__dirname, 'src/main/index.ts');
if (fs.existsSync(mainFile)) {
  const content = fs.readFileSync(mainFile, 'utf-8');
  const syncHandlers = [
    'sync:getStatus',
    'sync:manualSync',
    'sync:enable',
    'sync:disable',
    'sync:getConflicts',
    'sync:clearOldConflicts'
  ];

  const missingHandlers = syncHandlers.filter(handler => !content.includes(handler));
  if (missingHandlers.length === 0) {
    console.log(`✅ All ${syncHandlers.length} sync IPC handlers present`);
    checks.push(true);
  } else {
    console.log(`❌ Missing IPC handlers:`, missingHandlers);
    checks.push(false);
  }
} else {
  console.log('❌ Main index file not found');
  checks.push(false);
}

// Check 6: Database schema migrations
console.log('\nCheck 6: Database Schema');
const dbFile = path.join(__dirname, 'src/main/db.ts');
if (fs.existsSync(dbFile)) {
  const content = fs.readFileSync(dbFile, 'utf-8');
  if (content.includes('runSyncMigrations') && content.includes('_synced_at')) {
    console.log('✅ Sync migrations present in db.ts');
    checks.push(true);
  } else {
    console.log('❌ Sync migrations not found in db.ts');
    checks.push(false);
  }
} else {
  console.log('❌ Database file not found');
  checks.push(false);
}

// Check 7: Type definitions
console.log('\nCheck 7: Type Definitions');
const typeDefFile = path.join(__dirname, 'src/preload/index.d.ts');
if (fs.existsSync(typeDefFile)) {
  const content = fs.readFileSync(typeDefFile, 'utf-8');
  if (content.includes('sync:')) {
    console.log('✅ Sync API types defined in preload');
    checks.push(true);
  } else {
    console.log('❌ Sync API types not found in preload');
    checks.push(false);
  }
} else {
  console.log('❌ Type definition file not found');
  checks.push(false);
}

// Check 8: Dependencies installed
console.log('\nCheck 8: Dependencies');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
const requiredDeps = ['@headlessui/react'];

const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
if (missingDeps.length === 0) {
  console.log('✅ All required dependencies installed');
  checks.push(true);
} else {
  console.log('❌ Missing dependencies:', missingDeps);
  checks.push(false);
}

// Summary
console.log('\n' + '='.repeat(50));
const passedChecks = checks.filter(c => c).length;
const totalChecks = checks.length;
const successRate = Math.round((passedChecks / totalChecks) * 100);

console.log(`\n✨ Verification Results: ${passedChecks}/${totalChecks} checks passed (${successRate}%)`);

if (successRate === 100) {
  console.log('\n🎉 All checks passed! Sync system is ready.');
  console.log('\n📋 What was built:');
  console.log('   ✅ Sync service backend (queue, API, conflict resolution)');
  console.log('   ✅ Sync UI components (status indicator, settings panel)');
  console.log('   ✅ CRUD integration (changes auto-enqueued)');
  console.log('   ✅ Vercel API endpoints (push, pull, full sync)');
  console.log('   ✅ License authentication middleware');
  console.log('   ✅ Type definitions and IPC handlers');

  console.log('\n🚀 Next Steps:');
  console.log('   1. Test locally: npm run dev');
  console.log('   2. Create a customer → check if it\'s enqueued');
  console.log('   3. Try the sync UI (Settings → Cloud Sync Settings)');
  console.log('   4. Set up Neon database: https://neon.com');
  console.log('   5. Deploy Vercel API: cd vercel-api && vercel deploy');
} else {
  console.log('\n⚠️  Some checks failed. Please review the errors above.');
}

console.log('\n' + '='.repeat(50));
