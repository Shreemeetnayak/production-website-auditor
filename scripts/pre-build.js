#!/usr/bin/env node
/**
 * Production Website Auditor - Pre-build hook
 * Called by: plugin.json hooks.pre-build, npm scripts.prebuild
 * API: Validates environment, checks for required files before build
 * Data: package.json, env files, warns about missing config
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.env.PROJECT_ROOT || '.';

console.log('🔍 Pre-build validation...');

const pkgPath = path.join(PROJECT_ROOT, 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.log('  ⚠️  No package.json found');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

// Check for required env files
const envExample = path.join(PROJECT_ROOT, '.env.example');
const envLocal = path.join(PROJECT_ROOT, '.env.local');
const env = path.join(PROJECT_ROOT, '.env');

if (!fs.existsSync(envExample)) {
  console.log('  ⚠️  Missing .env.example (document required env vars)');
} else {
  console.log('  ✅ .env.example exists');
}

// Check for node version
const nodeVersion = process.version;
const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0], 10);
if (nodeMajor < 18) {
  console.log(`  ⚠️  Node version ${nodeVersion} < 18 (LTS)`);
} else {
  console.log(`  ✅ Node ${nodeVersion}`);
}

// Check package.json basics
if (!pkg.name) console.log('  ⚠️  Missing name in package.json');
if (!pkg.version) console.log('  ⚠️  Missing version in package.json');
if (!pkg.description) console.log('  ⚠️  Missing description in package.json');
if (!pkg.license) console.log('  ⚠️  Missing license in package.json');
if (!pkg.repository) console.log('  ⚠️  Missing repository in package.json');
if (!pkg.author) console.log('  ⚠️  Missing author in package.json');

if (!pkg.scripts?.build) console.log('  ⚠️  Missing build script in package.json');
if (!pkg.scripts?.test) console.log('  ⚠️  Missing test script in package.json');
if (!pkg.scripts?.lint) console.log('  ⚠️  Missing lint script in package.json');

if (pkg.private !== true) {
  console.log('  ℹ️  Package is public (private: false)');
}

console.log('✅ Pre-build validation complete');