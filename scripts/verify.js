#!/usr/bin/env node
/**
 * Production Website Auditor - Verification Script
 * Called by: bin/cli.js verify command, plugin.json scripts.verify
 * API: Runs lint, typecheck, test, build - all must pass
 * Data: package.json scripts, outputs PASS/FAIL per check
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

function run(cmd, args, label) {
  console.log(`  🔧 ${label}...`);
  const result = spawnSync(cmd, args, {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, CI: 'true' }
  });
  const pass = result.status === 0;
  console.log(`  ${pass ? '✅' : '❌'} ${label}: ${pass ? 'PASS' : 'FAIL'}`);
  return pass;
}

function hasScript(name) {
  const pkgPath = path.join(PROJECT_ROOT, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  return !!pkg.scripts?.[name];
}

console.log('🔍 Production verification...');
console.log(`📁 Project: ${PROJECT_ROOT}`);
console.log('');

const checks = [];

// Lint
const lintScript = hasScript('lint') ? 'lint' : hasScript('lint:fix') ? 'lint:fix' : null;
if (lintScript) {
  checks.push(run('npm', ['run', lintScript], `Lint (${lintScript})`));
} else {
  console.log('  ⏭️  Lint: No lint script in package.json');
  checks.push(true); // Not a failure, just skipped
}

// Typecheck
const typecheckScript = hasScript('typecheck') ? 'typecheck' : hasScript('check-types') ? 'check-types' : hasScript('tsc') ? 'tsc' : null;
if (typecheckScript) {
  checks.push(run('npm', ['run', typecheckScript], `Typecheck (${typecheckScript})`));
} else if (fs.existsSync(path.join(PROJECT_ROOT, 'tsconfig.json'))) {
  checks.push(run('npx', ['tsc', '--noEmit'], 'Typecheck (tsc --noEmit)'));
} else {
  console.log('  ⏭️  Typecheck: No TypeScript config or script');
  checks.push(true);
}

// Tests
const testScript = hasScript('test') ? 'test' : hasScript('test:run') ? 'test:run' : hasScript('vitest') ? 'vitest' : hasScript('jest') ? 'jest' : null;
if (testScript) {
  checks.push(run('npm', ['run', testScript], `Tests (${testScript})`));
} else if (fs.existsSync(path.join(PROJECT_ROOT, 'vitest.config.ts')) || fs.existsSync(path.join(PROJECT_ROOT, 'vitest.config.js'))) {
  checks.push(run('npx', ['vitest', 'run'], 'Tests (vitest run)'));
} else if (fs.existsSync(path.join(PROJECT_ROOT, 'jest.config.js')) || fs.existsSync(path.join(PROJECT_ROOT, 'jest.config.ts'))) {
  checks.push(run('npx', ['jest', '--ci'], 'Tests (jest --ci)'));
} else {
  console.log('  ⏭️  Tests: No test script or config found');
  checks.push(true);
}

// Build
const buildScript = hasScript('build') ? 'build' : null;
if (buildScript) {
  checks.push(run('npm', ['run', buildScript], `Build (${buildScript})`));
} else {
  console.log('  ⏭️  Build: No build script in package.json');
  checks.push(true);
}

console.log('');
const allPass = checks.every(c => c);
console.log(allPass ? '✅ All verification checks PASSED' : '❌ Some verification checks FAILED');
process.exit(allPass ? 0 : 1);