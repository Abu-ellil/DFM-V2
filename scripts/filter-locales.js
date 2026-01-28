#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Locales to keep (English US and Arabic only)
const KEEP_LOCALES = ['en-US.pak', 'ar.pak'];

/**
 * Filter Electron locales to only keep English and Arabic
 * @param {string} appOutDir - Path to the app output directory
 */
async function filterLocales(appOutDir) {
  const localesPath = path.join(appOutDir, 'locales');

  console.log('Filtering Electron locales...');
  console.log('Locales path:', localesPath);

  if (!fs.existsSync(localesPath)) {
    console.log('Locales folder not found, skipping...');
    return;
  }

  const locales = fs.readdirSync(localesPath);
  console.log(`Found ${locales.length} locale files`);

  let removed = 0;
  let kept = 0;

  for (const locale of locales) {
    if (!KEEP_LOCALES.includes(locale)) {
      const localePath = path.join(localesPath, locale);
      fs.unlinkSync(localePath);
      removed++;
      console.log(`Removed: ${locale}`);
    } else {
      kept++;
      console.log(`Kept: ${locale}`);
    }
  }

  console.log(`\nSummary: Kept ${kept} locales, removed ${removed} locales`);
  console.log(`Space saved: ~${(removed * 1).toFixed(1)} MB (approximately)`);
}

/**
 * Main function called by electron-builder
 */
async function main(context) {
  const { appOutDir, electronPlatformName, arch } = context;

  console.log('Platform:', electronPlatformName);
  console.log('Arch:', arch);
  console.log('Output dir:', appOutDir);

  await filterLocales(appOutDir);
}

// Export for electron-builder afterPack hook
module.exports = async function (context) {
  try {
    await main(context);
  } catch (error) {
    console.error('Error filtering locales:', error);
    throw error;
  }
};

// Allow running this script directly for testing
if (require.main === module) {
  main({
    appOutDir: process.argv[2] || 'release/win-unpacked',
    electronPlatformName: 'win32',
    arch: 'x64'
  }).catch(console.error);
}
