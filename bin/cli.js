#!/usr/bin/env node
/**
 * Production Website Auditor - CLI Entry Point
 * Called by: npm bin, global install, plugin.json cli.entry
 * API: Parses args, dispatches to audit/verify/pre-build/post-build
 * Data: Reads process.argv, sets env vars, spawns scripts
 */
const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts');
const PKG = require(path.join(__dirname, '..', 'package.json'));

function showHelp() {
  console.log(`
${PKG.name} v${PKG.version}
${PKG.description}

Usage:
  production-website-auditor <command> [options]

Commands:
  audit [options]        Run full production audit (default)
  verify                 Run verification (lint, typecheck, test, build)
  pre-build              Pre-build validation hook
  post-build             Post-build validation hook
  help                   Show this help

Audit Options:
  --fix                  Apply safe auto-fixes (deterministic only)
  --category <name>      Run single category (seo, accessibility, performance, security, legal, content, routing, images, forms, structuredData, mobile, errors, codeQuality, payments, api, apiLimits, analytics, thirdParty)
  --project-root <path>  Project directory to audit (default: cwd)
  --json                 Output JSON only (for CI)

Examples:
  production-website-auditor audit
  production-website-auditor audit --fix
  production-website-auditor audit --category=seo
  production-website-auditor audit --project-root ./my-app
  production-website-auditor verify
`);
}

function runScript(scriptName, args = []) {
  const scriptPath = path.join(SCRIPTS_DIR, `${scriptName}.js`);
  const result = spawnSync('node', [scriptPath, ...args], {
    stdio: 'inherit',
    env: { ...process.env }
  });
  return result.status;
}

const args = process.argv.slice(2);
const command = args[0] || 'audit';

switch (command) {
  case 'audit': {
    const fixIdx = args.indexOf('--fix');
    const categoryIdx = args.indexOf('--category');
    const rootIdx = args.indexOf('--project-root');
    const jsonIdx = args.indexOf('--json');

    if (fixIdx !== -1) process.env.AUDIT_FIX = 'true';
    if (categoryIdx !== -1 && args[categoryIdx + 1]) {
      process.env.AUDIT_CATEGORY = args[categoryIdx + 1];
    }
    if (rootIdx !== -1 && args[rootIdx + 1]) {
      process.env.PROJECT_ROOT = path.resolve(args[rootIdx + 1]);
    }
    if (jsonIdx !== -1) process.env.AUDIT_JSON = 'true';

    const code = runScript('audit');
    process.exit(code ?? 1);
  }

  case 'verify': {
    const code = runScript('verify');
    process.exit(code ?? 1);
  }

  case 'pre-build': {
    const code = runScript('pre-build');
    process.exit(code ?? 1);
  }

  case 'post-build': {
    const code = runScript('post-build');
    process.exit(code ?? 1);
  }

  case 'help':
  case '--help':
  case '-h': {
    showHelp();
    process.exit(0);
  }

  default: {
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
  }
}