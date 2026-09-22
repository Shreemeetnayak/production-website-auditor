const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

const PLUGIN_ROOT = path.join(__dirname, '..');

test('post-build.js exists and is executable', () => {
  const scriptPath = path.join(PLUGIN_ROOT, 'scripts', 'post-build.js');
  assert.ok(fs.existsSync(scriptPath), 'post-build.js should exist');
});

test('post-build.js runs without build dir', () => {
  const result = spawnSync('node', ['scripts/post-build.js'], {
    cwd: PLUGIN_ROOT,
    env: { ...process.env, BUILD_DIR: '/nonexistent/build/dir' },
    encoding: 'utf-8'
  });

  assert.strictEqual(result.status, 0, 'Should exit 0 when build dir not found');
  assert.ok(result.stdout.includes('Build directory not found'), 'Should warn about missing build dir');
});

test('post-build.js detects large JS bundle', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'));
  const buildDir = path.join(tmpDir, 'dist');
  fs.mkdirSync(buildDir, { recursive: true });

  // Create a large JS file (>500KB)
  const largeJs = Buffer.alloc(600 * 1024, 'x');
  fs.writeFileSync(path.join(buildDir, 'main.js'), largeJs);

  const result = spawnSync('node', ['scripts/post-build.js'], {
    cwd: PLUGIN_ROOT,
    env: { ...process.env, BUILD_DIR: buildDir },
    encoding: 'utf-8'
  });

  assert.ok(result.stdout.includes('Large JS bundle'), 'Should warn about large JS bundle');

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('post-build.js detects source maps', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'));
  const buildDir = path.join(tmpDir, 'dist');
  fs.mkdirSync(buildDir, { recursive: true });

  fs.writeFileSync(path.join(buildDir, 'main.js'), 'console.log("test")');
  fs.writeFileSync(path.join(buildDir, 'main.js.map'), '{"version":3}');

  const result = spawnSync('node', ['scripts/post-build.js'], {
    cwd: PLUGIN_ROOT,
    env: { ...process.env, BUILD_DIR: buildDir },
    encoding: 'utf-8'
  });

  assert.ok(result.stdout.includes('Source maps present'), 'Should warn about source maps');

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('post-build.js checks HTML meta tags', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'));
  const buildDir = path.join(tmpDir, 'dist');
  fs.mkdirSync(buildDir, { recursive: true });

  const html = `<!DOCTYPE html>
<html><head></head><body></body></html>`;
  fs.writeFileSync(path.join(buildDir, 'index.html'), html);

  const result = spawnSync('node', ['scripts/post-build.js'], {
    cwd: PLUGIN_ROOT,
    env: { ...process.env, BUILD_DIR: buildDir },
    encoding: 'utf-8'
  });

  assert.ok(result.stdout.includes('Missing <title>'), 'Should warn about missing title');
  assert.ok(result.stdout.includes('Missing meta description'), 'Should warn about missing meta description');

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('post-build.js passes with valid HTML', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'));
  const buildDir = path.join(tmpDir, 'dist');
  fs.mkdirSync(buildDir, { recursive: true });

  const html = `<!DOCTYPE html>
<html lang="en"><head>
  <title>Test Page</title>
  <meta name="description" content="A test page">
</head><body></body></html>`;
  fs.writeFileSync(path.join(buildDir, 'index.html'), html);

  const result = spawnSync('node', ['scripts/post-build.js'], {
    cwd: PLUGIN_ROOT,
    env: { ...process.env, BUILD_DIR: buildDir },
    encoding: 'utf-8'
  });

  assert.strictEqual(result.status, 0, 'Should exit 0 for valid HTML');
  assert.ok(result.stdout.includes('Post-build analysis complete'), 'Should complete successfully');

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});