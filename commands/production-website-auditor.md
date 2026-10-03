---
description: Run a production-readiness audit of the current web project.
argument-hint: "[audit|fix|verify|seo|accessibility|performance|security|legal]"
---

# Production Website Auditor

Interpret `$ARGUMENTS` as a mode:

| Mode | Required behavior |
| --- | --- |
| `audit` or empty | Inspect first, then audit every applicable category. Do not modify source files. |
| `fix` | Audit first. List proposed safe fixes, apply only deterministic fixes, then verify. |
| `verify` | Do not modify files. Run lint, typecheck, tests, and build where scripts exist. |
| `seo` | Audit titles, descriptions, canonical URLs, Open Graph, sitemap, robots.txt, llms.txt, and structured data. |
| `accessibility` | Audit semantic HTML, headings, focus states, labels, alt text, keyboard access, contrast, and touch targets. |
| `performance` | Audit bundles, source maps, images, dependencies, client rendering, and third-party scripts. |
| `security` | Audit secrets, CORS, unsafe HTML, input validation, auth boundaries, files, and dependency risks. |
| `legal` | Audit technical legal/trust surfaces and flag items that require human or legal review. |

## Required workflow

1. **Discover the project before changing it**: framework, package manager, routes, entry points, static assets, SEO setup, APIs, forms, payments, database/auth integrations, third-party scripts, environment files, and deployment configuration.
2. **Audit only applicable areas** and report missing context instead of inventing business facts.
3. In `fix` mode, change only deterministic, safe items. Never fabricate reviews, business data, legal claims, addresses, photos, customer logos, or performance claims.
4. Run the project verification commands that actually exist after any modification.
5. Report exactly:
   - Fixed
   - Flagged for human/legal/business review
   - Not changed and why
   - Verification evidence (build, tests, lint, typecheck, console/browser if available)

## Command-line helper

When shell execution is appropriate, the bundled CLI is available from the plugin root:

```bash
node bin/cli.js audit
```

For safe fixes:

```bash
node bin/cli.js audit --fix
```

For verification:

```bash
node bin/cli.js verify
```
