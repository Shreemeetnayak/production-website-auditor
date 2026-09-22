#!/usr/bin/env node
/**
 * Production Website Auditor - Main Audit Script
 * Called by: bin/cli.js audit command
 * API: Orchestrates all audit categories, produces JSON report
 * Data: Scans project files, outputs .audit-report/audit-report.json
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();
const FIX_MODE = process.env.AUDIT_FIX === 'true';
const SINGLE_CATEGORY = process.env.AUDIT_CATEGORY;
const JSON_ONLY = process.env.AUDIT_JSON === 'true';

const REPORT_DIR = path.join(PROJECT_ROOT, '.audit-report');
const REPORT_FILE = path.join(REPORT_DIR, 'audit-report.json');

const CATEGORIES = [
  'routing', 'seo', 'structuredData', 'images', 'accessibility',
  'forms', 'payments', 'api', 'apiLimits', 'analytics',
  'thirdParty', 'legal', 'contentTrust', 'mobile', 'errors',
  'performance', 'security', 'codeQuality'
];

function log(msg) {
  if (!JSON_ONLY) console.log(msg);
}

function logCategory(cat, status, issues = 0, files = 0) {
  if (!JSON_ONLY) {
    const icon = status === 'pass' ? '✅' : status === 'flagged' ? '⚠️' : '❌';
    const extra = issues ? ` (${issues} issues${files ? `, ${files} files` : ''})` : '';
    console.log(`  ${icon} ${cat}${extra}`);
  }
}

function scanProject() {
  const htmlFiles = [];
  const jsFiles = [];
  const cssFiles = [];
  const jsonFiles = [];

  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '.git') {
            walk(full);
          }
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (ext === '.html' || ext === '.htm') htmlFiles.push(full);
          else if (ext === '.js' || ext === '.ts' || ext === '.jsx' || ext === '.tsx') jsFiles.push(full);
          else if (ext === '.css' || ext === '.scss' || ext === '.sass') cssFiles.push(full);
          else if (ext === '.json') jsonFiles.push(full);
        }
      }
    } catch {}
  }

  walk(PROJECT_ROOT);
  return { htmlFiles, jsFiles, cssFiles, jsonFiles };
}

function readFileSafe(filepath) {
  try { return fs.readFileSync(filepath, 'utf-8'); } catch { return ''; }
}

function writeFileSafe(filepath, content) {
  try { fs.writeFileSync(filepath, content, 'utf-8'); return true; } catch { return false; }
}

function runCategory(category, files) {
  const { htmlFiles, jsFiles, cssFiles, jsonFiles } = files;
  const issues = [];
  const fixed = [];

  switch (category) {
    case 'routing': {
      // Check for 404 page
      const has404 = htmlFiles.some(f => path.basename(f) === '404.html') ||
                     jsFiles.some(f => /404\.(jsx?|tsx?)$/.test(f)) ||
                     fs.existsSync(path.join(PROJECT_ROOT, 'public', '404.html'));
      if (!has404) {
        issues.push('Missing custom 404 page');
      }

      // Check for framework default pages
      for (const f of htmlFiles) {
        const content = readFileSafe(f);
        if (/Vite|React|Create React App|Next\.js|Vue\.js|Svelte/.test(content) &&
            /default|template|welcome/i.test(content)) {
          issues.push(`Possible framework default page: ${path.relative(PROJECT_ROOT, f)}`);
        }
      }

      // Check page titles
      let missingTitle = 0;
      for (const f of htmlFiles) {
        const content = readFileSafe(f);
        if (!/<title>[^<]*<\/title>/.test(content)) missingTitle++;
      }
      if (missingTitle > 0) issues.push(`${missingTitle} HTML file(s) missing <title>`);
      break;
    }

    case 'seo': {
      // Check titles, meta descriptions, canonical, OG, Twitter
      for (const f of htmlFiles) {
        const content = readFileSafe(f);
        const rel = path.relative(PROJECT_ROOT, f);

        if (!/<title>[^<]*<\/title>/.test(content)) {
          issues.push(`Missing <title> in ${rel}`);
        } else if (/<title>\s*<\/title>/.test(content)) {
          issues.push(`Empty <title> in ${rel}`);
        }

        if (!/<meta name="description"/.test(content)) {
          issues.push(`Missing meta description in ${rel}`);
        }

        if (!/<link rel="canonical"/.test(content)) {
          issues.push(`Missing canonical URL in ${rel}`);
        }

        if (!/<meta property="og:/.test(content)) {
          issues.push(`Missing Open Graph tags in ${rel}`);
        }

        if (!/<meta name="twitter:/.test(content)) {
          issues.push(`Missing Twitter/X card tags in ${rel}`);
        }
      }

      // Check for robots.txt
      const robotsPath = path.join(PROJECT_ROOT, 'robots.txt');
      if (!fs.existsSync(robotsPath)) {
        issues.push('Missing robots.txt');
      } else {
        const robots = readFileSafe(robotsPath);
        if (/Disallow:\s*\//.test(robots) && !/Allow:/.test(robots)) {
          issues.push('robots.txt may block all crawling');
        }
      }

      // Check for sitemap.xml
      const sitemapPath = path.join(PROJECT_ROOT, 'sitemap.xml');
      if (!fs.existsSync(sitemapPath)) {
        issues.push('Missing sitemap.xml');
      }

      // Check for llms.txt
      const llmsPath = path.join(PROJECT_ROOT, 'llms.txt');
      if (!fs.existsSync(llmsPath)) {
        issues.push('Missing llms.txt (optional but recommended for AI crawlers)');
      }

      // Check lang attribute
      for (const f of htmlFiles) {
        const content = readFileSafe(f);
        if (!/<html[^>]*\blang=/.test(content)) {
          issues.push(`Missing lang attribute on <html> in ${path.relative(PROJECT_ROOT, f)}`);
        }
      }
      break;
    }

    case 'structuredData': {
      // Check for JSON-LD
      let hasStructuredData = false;
      for (const f of htmlFiles) {
        const content = readFileSafe(f);
        if (/application\/ld\+json/.test(content)) hasStructuredData = true;
      }
      if (!hasStructuredData && htmlFiles.length > 0) {
        issues.push('No JSON-LD structured data found on any page');
      }

      // Flag potential fabricated LocalBusiness data
      for (const f of htmlFiles) {
        const content = readFileSafe(f);
        if (/"@type"\s*:\s*"LocalBusiness"/.test(content)) {
          if (!/streetAddress|addressLocality|addressRegion|postalCode/.test(content)) {
            issues.push(`LocalBusiness schema in ${path.relative(PROJECT_ROOT, f)} missing address details (may be fabricated)`);
          }
        }
        if (/"@type"\s*:\s*"Organization"/.test(content)) {
          if (!/name|url|logo/.test(content)) {
            issues.push(`Organization schema in ${path.relative(PROJECT_ROOT, f)} may lack verified info`);
          }
        }
      }
      break;
    }

    case 'images': {
      // Scan for images referenced in HTML
      for (const f of htmlFiles) {
        const content = readFileSafe(f);
        const rel = path.relative(PROJECT_ROOT, f);
        const imgMatches = content.match(/<img[^>]*>/g) || [];
        for (const img of imgMatches) {
          if (!/alt\s*=/.test(img)) {
            issues.push(`Missing alt attribute in ${rel}: ${img.slice(0, 100)}`);
          } else if (/alt\s*=\s*["']["']/.test(img)) {
            issues.push(`Empty alt attribute in ${rel}: ${img.slice(0, 100)}`);
          }
        }
      }

      // Check image file sizes
      const maxSize = 500 * 1024; // 500KB default
      const imgExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg'];
      function checkImageSizes(dir) {
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              if (!entry.name.startsWith('.') && entry.name !== 'node_modules') checkImageSizes(full);
            } else if (imgExtensions.includes(path.extname(entry.name).toLowerCase())) {
              const stats = fs.statSync(full);
              if (stats.size > maxSize) {
                issues.push(`Large image: ${path.relative(PROJECT_ROOT, full)} (${Math.round(stats.size/1024)}KB > ${maxSize/1024}KB)`);
              }
            }
          }
        } catch {}
      }
      checkImageSizes(PROJECT_ROOT);
      break;
    }

    case 'accessibility': {
      // Check color contrast (basic - need actual CSS for real check)
      // Check keyboard navigation - focus styles
      for (const f of cssFiles) {
        const content = readFileSafe(f);
        if (!/:focus/.test(content) && !/:focus-visible/.test(content)) {
          issues.push(`No :focus or :focus-visible styles in ${path.relative(PROJECT_ROOT, f)}`);
        }
      }

      // Check form labels
      for (const f of htmlFiles) {
        const content = readFileSafe(f);
        const rel = path.relative(PROJECT_ROOT, f);
        // Inputs without labels
        const inputs = content.match(/<input[^>]*>/g) || [];
        for (const input of inputs) {
          const hasId = /id\s*=/.test(input);
          const hasAriaLabel = /aria-label\s*=/.test(input);
          const hasAriaLabelledby = /aria-labelledby\s*=/.test(input);
          const type = input.match(/type\s*=\s*["']([^"']+)["']/)?.[1] || 'text';
          if (type !== 'hidden' && type !== 'submit' && type !== 'button' && !hasId && !hasAriaLabel && !hasAriaLabelledby) {
            issues.push(`Input without label in ${rel}: ${input.slice(0, 100)}`);
          }
        }
      }

      // Check heading hierarchy
      for (const f of htmlFiles) {
        const content = readFileSafe(f);
        const headings = content.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi) || [];
        let lastLevel = 0;
        for (const h of headings) {
          const level = parseInt(h.match(/<h(\d)/)?.[1] || '0');
          if (level > lastLevel + 1) {
            issues.push(`Heading level skip in ${path.relative(PROJECT_ROOT, f)}: h${lastLevel} → h${level}`);
            break;
          }
          lastLevel = level;
        }
        const h1Count = (content.match(/<h1[^>]*>/gi) || []).length;
        if (h1Count === 0) {
          issues.push(`No H1 found in ${path.relative(PROJECT_ROOT, f)}`);
        } else if (h1Count > 1) {
          issues.push(`Multiple H1 elements (${h1Count}) in ${path.relative(PROJECT_ROOT, f)}`);
        }
      }
      break;
    }

    case 'forms': {
      for (const f of htmlFiles) {
        const content = readFileSafe(f);
        const rel = path.relative(PROJECT_ROOT, f);
        const forms = content.match(/<form[^>]*>[\s\S]*?<\/form>/gi) || [];
        for (const form of forms) {
          // Check for loading state handling
          if (!/disabled|loading|aria-busy/.test(form)) {
            issues.push(`Form in ${rel} may lack loading state handling`);
          }
          // Check for required field indicators
          const requiredInputs = form.match(/<input[^>]*required[^>]*>/gi) || [];
          if (requiredInputs.length > 0) {
            const hasIndicator = requiredInputs.some(i => /aria-required|aria-describedby|required/.test(i));
            if (!hasIndicator) {
              issues.push(`Required fields in ${rel} may lack clear indication`);
            }
          }
        }
      }
      break;
    }

    case 'payments': {
      // Check for duplicate submission prevention
      for (const f of jsFiles) {
        const content = readFileSafe(f);
        if (/stripe|payment|checkout/i.test(content)) {
          if (!/preventDefault|submitting|isSubmitting|disabled/.test(content)) {
            issues.push(`Payment code in ${path.relative(PROJECT_ROOT, f)} may lack duplicate submission prevention`);
          }
        }
      }
      break;
    }

    case 'api': {
      for (const f of jsFiles) {
        const content = readFileSafe(f);
        if (/fetch\(|axios\.|api\//.test(content)) {
          const rel = path.relative(PROJECT_ROOT, f);
          if (!/try\s*\{|catch\s*\(/.test(content)) {
            issues.push(`API call in ${rel} may lack error handling`);
          }
          if (!/timeout|AbortController|signal/.test(content)) {
            issues.push(`API call in ${rel} may lack timeout handling`);
          }
        }
      }
      break;
    }

    case 'apiLimits': {
      for (const f of jsFiles) {
        const content = readFileSafe(f);
        if (/openai|anthropic|api.*key|usage|token/i.test(content)) {
          const rel = path.relative(PROJECT_ROOT, f);
          if (!/limit|max|budget|cap|throttle/i.test(content)) {
            issues.push(`Potential unbounded API usage in ${rel}`);
          }
        }
      }
      break;
    }

    case 'analytics': {
      const trackers = ['gtag', 'ga(', 'gtm', 'fbq', 'hj(', 'clarity', 'mixpanel', 'segment', 'amplitude'];
      for (const f of htmlFiles) {
        const content = readFileSafe(f);
        const found = trackers.filter(t => content.includes(t));
        if (found.length > 0) {
          logCategory(category, 'flagged', found.length, 1);
          return { issues: [`Tracking detected in ${path.relative(PROJECT_ROOT, f)}: ${found.join(', ')}`], fixed: [] };
        }
      }
      break;
    }

    case 'thirdParty': {
      const thirdParty = ['maps.googleapis.com', 'youtube.com', 'vimeo.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'unpkg.com'];
      for (const f of htmlFiles) {
        const content = readFileSafe(f);
        const found = thirdParty.filter(t => content.includes(t));
        if (found.length > 0) {
          logCategory(category, 'flagged', found.length, 1);
          return { issues: [`Third-party scripts in ${path.relative(PROJECT_ROOT, f)}: ${found.join(', ')}`], fixed: [] };
        }
      }
      for (const f of jsFiles) {
        const content = readFileSafe(f);
        const found = thirdParty.filter(t => content.includes(t));
        if (found.length > 0) {
          logCategory(category, 'flagged', found.length, 1);
          return { issues: [`Third-party imports in ${path.relative(PROJECT_ROOT, f)}: ${found.join(', ')}`], fixed: [] };
        }
      }
      break;
    }

    case 'legal': {
      const required = ['privacy', 'terms', 'cookie'];
      const htmlNames = htmlFiles.map(f => path.basename(f, '.html').toLowerCase());
      for (const req of required) {
        const hasPage = htmlNames.some(n => n.includes(req));
        if (!hasPage) {
          issues.push(`Missing ${req} policy page`);
        }
      }
      break;
    }

    case 'contentTrust': {
      const fakePatterns = [
        /testimonial/i, /review.*\d+\/5/i, /customer.*logo/i, /case stud/i,
        /trusted by/i, /\d+\+ customers/i, /\d+[kK]\+ users/i, /award/i,
        /certif/i, /featured in/i, /as seen in/i
      ];
      for (const f of htmlFiles) {
        const content = readFileSafe(f);
        const rel = path.relative(PROJECT_ROOT, f);
        for (const pattern of fakePatterns) {
          if (pattern.test(content)) {
            issues.push(`Potential fabricated content in ${rel} (matches: ${pattern.source})`);
          }
        }
      }
      break;
    }

    case 'mobile': {
      for (const f of htmlFiles) {
        const content = readFileSafe(f);
        const rel = path.relative(PROJECT_ROOT, f);
        if (!/<meta name="viewport"/.test(content)) {
          issues.push(`Missing viewport meta in ${rel}`);
        }
        if (!/width=device-width/.test(content)) {
          issues.push(`Viewport missing width=device-width in ${rel}`);
        }
      }
      // Check touch target sizes in CSS
      for (const f of cssFiles) {
        const content = readFileSafe(f);
        if (/min-height:\s*44px|min-height:\s*2\.75rem|touch-action/.test(content)) {
          // good
        } else if (/button|\[role="button"\]|a\.btn/.test(content)) {
          issues.push(`Buttons in ${path.relative(PROJECT_ROOT, f)} may lack minimum touch target (44px)`);
        }
      }
      break;
    }

    case 'errors': {
      for (const f of jsFiles) {
        const content = readFileSafe(f);
        if (/console\.error\(/.test(content) && !/production/.test(content)) {
          issues.push(`console.error in ${path.relative(PROJECT_ROOT, f)} (ensure production filtering)`);
        }
        if (/throw new Error\(/.test(content) && !/try\s*\{|catch\s*\(/.test(content)) {
          issues.push(`Uncaught throw in ${path.relative(PROJECT_ROOT, f)}`);
        }
      }
      break;
    }

    case 'performance': {
      for (const f of jsonFiles) {
        const content = readFileSafe(f);
        if (f.endsWith('package.json')) {
          const pkg = JSON.parse(content);
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          const heavy = ['moment', 'lodash', 'jquery', 'bootstrap', 'chart.js', 'three', 'd3'];
          for (const h of heavy) {
            if (deps[h]) issues.push(`Heavy dependency: ${h} (${deps[h]})`);
          }
        }
      }
      // Check for unused dependencies (basic)
      if (htmlFiles.length > 0) {
        const firstHtml = readFileSafe(htmlFiles[0]);
        if (!/React|Vue|Svelte|Angular/.test(firstHtml)) {
          issues.push('No framework detected - verify if all deps are needed');
        }
      }
      break;
    }

    case 'security': {
      // Check for secrets in source
      const secretPatterns = [
        /api[_-]?key\s*[:=]\s*["'][^"']+["']/i,
        /secret\s*[:=]\s*["'][^"']+["']/i,
        /password\s*[:=]\s*["'][^"']+["']/i,
        /token\s*[:=]\s*["'][^"']+["']/i,
        /private[_-]?key\s*[:=]\s*["'][^"']+["']/i
      ];
      for (const f of jsFiles) {
        const content = readFileSafe(f);
        const rel = path.relative(PROJECT_ROOT, f);
        for (const pattern of secretPatterns) {
          if (pattern.test(content)) {
            issues.push(`Potential secret in ${rel}`);
          }
        }
      }

      // Check for debug mode
      for (const f of jsonFiles) {
        const content = readFileSafe(f);
        if (f.endsWith('package.json') && /"debug":\s*true/.test(content)) {
          issues.push('Debug mode enabled in package.json');
        }
      }
      break;
    }

    case 'codeQuality': {
      for (const f of jsFiles) {
        const content = readFileSafe(f);
        const rel = path.relative(PROJECT_ROOT, f);
        const consoleLogs = (content.match(/console\.(log|debug|info)\s*\(/g) || []).length;
        if (consoleLogs > 0) {
          issues.push(`${consoleLogs} console.log/debug/info in ${rel}`);
        }
        const todos = (content.match(/\/\/\s*TODO|\/\*\s*TODO/g) || []).length;
        if (todos > 0) {
          issues.push(`${todos} TODO comment(s) in ${rel}`);
        }
      }
      break;
    }
  }

  return { issues, fixed };
}

function main() {
  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

  const files = scanProject();
  log(`🔍 Production Website Auditor v1.0.0`);
  log(`📁 Project: ${PROJECT_ROOT}`);
  log(`🔧 Fix mode: ${FIX_MODE ? 'ON' : 'OFF'}`);
  log(`📄 HTML: ${files.htmlFiles.length} | JS/TS: ${files.jsFiles.length} | CSS: ${files.cssFiles.length}`);
  if (SINGLE_CATEGORY) log(`🎯 Single category: ${SINGLE_CATEGORY}`);
  log('');

  const categoriesToRun = SINGLE_CATEGORY ? [SINGLE_CATEGORY] : CATEGORIES;
  const results = [];
  const allFixed = [];
  const allFlagged = [];
  const allNotChanged = [];

  for (const cat of categoriesToRun) {
    const { issues, fixed } = runCategory(cat, files);
    const status = issues.length === 0 ? 'pass' : FIX_MODE && fixed.length > 0 ? 'pass' : 'flagged';
    logCategory(cat, status, issues.length, files.htmlFiles.length);

    results.push({ name: cat, status, issues: issues.length, htmlFiles: files.htmlFiles.length });

    for (const issue of issues) {
      allFlagged.push({ category: cat, message: issue });
    }
    for (const fix of fixed) {
      allFixed.push({ category: cat, message: fix });
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    projectRoot: PROJECT_ROOT,
    fixMode: FIX_MODE,
    categories: results,
    fixed: allFixed,
    flagged: allFlagged,
    notChanged: allNotChanged,
    summary: {
      fixed: allFixed.length,
      flagged: allFlagged.length,
      notChanged: allNotChanged.length
    }
  };

  writeFileSafe(REPORT_FILE, JSON.stringify(report, null, 2));

  if (!JSON_ONLY) {
    log('');
    log(`📊 Summary: ${allFixed.length} fixed | ${allFlagged.length} flagged | ${allNotChanged.length} not changed`);
    log(`📄 Report: ${REPORT_FILE}`);
  }

  process.exit(allFlagged.length > 0 ? 1 : 0);
}

main();