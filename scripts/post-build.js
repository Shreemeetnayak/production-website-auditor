#!/usr/bin/env node
/**
 * Production Website Auditor - Post-build analysis
 * Called by: plugin.json hooks.post-build, npm scripts.postbuild
 * API: Analyzes build output, checks bundle sizes, source maps, etc.
 * Data: Build output directory, outputs warnings/recommendations
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.env.PROJECT_ROOT || '.';
const BUILD_DIR = process.env.BUILD_DIR || path.join(PROJECT_ROOT, 'dist');

console.log('🔍 Post-build analysis...');
console.log(`📁 Build directory: ${BUILD_DIR}`);

if (!fs.existsSync(BUILD_DIR)) {
  console.log('  ⚠️  Build directory not found (expected at dist/)');
  process.exit(0);
}

const results = {
  warnings: [],
  info: [],
  errors: []
};

function walk(dir, callback) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, callback);
      } else {
        callback(full, entry.name);
      }
    }
  } catch {}
}

let totalJsSize = 0;
let totalCssSize = 0;
let jsFiles = 0;
let cssFiles = 0;
let hasSourceMaps = false;
let hasHtml = false;

walk(BUILD_DIR, (full, name) => {
  const stats = fs.statSync(full);
  const size = stats.size;
  const rel = path.relative(PROJECT_ROOT, full);

  if (name.endsWith('.js')) {
    jsFiles++;
    totalJsSize += size;
    if (size > 500 * 1024) {
      results.warnings.push(`Large JS bundle: ${rel} (${Math.round(size/1024)}KB)`);
    }
    if (fs.existsSync(full + '.map')) {
      hasSourceMaps = true;
    }
  } else if (name.endsWith('.css')) {
    cssFiles++;
    totalCssSize += size;
    if (size > 100 * 1024) {
      results.warnings.push(`Large CSS bundle: ${rel} (${Math.round(size/1024)}KB)`);
    }
  } else if (name.endsWith('.html')) {
    hasHtml = true;
    const content = fs.readFileSync(full, 'utf-8');
    if (!/<title>[^<]*<\/title>/.test(content)) {
      results.warnings.push(`Missing <title> in built HTML: ${rel}`);
    }
    if (!/<meta name="description"/.test(content)) {
      results.warnings.push(`Missing meta description in built HTML: ${rel}`);
    }
  }
});

console.log(`  📦 JS bundles: ${jsFiles} files, ${Math.round(totalJsSize/1024)}KB total`);
console.log(`  🎨 CSS bundles: ${cssFiles} files, ${Math.round(totalCssSize/1024)}KB total`);
console.log(`  📄 HTML files: ${hasHtml ? 'found' : 'none'}`);
console.log(`  🗺️  Source maps: ${hasSourceMaps ? 'yes (consider disabling for production)' : 'no'}`);

if (hasSourceMaps) {
  results.warnings.push('Source maps present in production build (security/performance concern)');
}

if (totalJsSize > 1024 * 1024) {
  results.warnings.push(`Total JS size ${Math.round(totalJsSize/1024/1024)}MB > 1MB (consider code splitting)`);
}

if (results.warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  for (const w of results.warnings) console.log(`  - ${w}`);
}

if (results.errors.length > 0) {
  console.log('\n❌ Errors:');
  for (const e of results.errors) console.log(`  - ${e}`);
  process.exit(1);
}

console.log('\n✅ Post-build analysis complete');