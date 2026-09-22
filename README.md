# Production Website Auditor

A production-quality Claude Code plugin that audits an existing website and, where safe, fixes the issues it finds. It makes the site feel like a deliberately designed, production-ready website rather than an AI/vibe-coded template.

## Overview

This plugin performs a comprehensive audit across 17+ categories including:
- Routing and page quality
- SEO (titles, meta descriptions, canonical tags, Open Graph, sitemap, robots.txt)
- Structured data (JSON-LD for Organization, LocalBusiness, etc.)
- Images (alt text, sizes, formats, lazy loading)
- Accessibility (WCAG-oriented checks)
- Forms (validation, loading states, error handling)
- Payments (duplicate prevention, error handling)
- API reliability (loading states, error handling, timeouts)
- Analytics and third-party scripts
- Legal/trust pages (privacy, terms, cookie policy)
- Content trust (removing fake reviews/testimonials)
- Mobile UX
- Error handling
- Performance (bundle sizes, code splitting, lazy loading)
- Security (secrets exposure, XSS/CSRF risks)
- Code quality (dead code, unused dependencies)

## Installation

1. Copy this entire `production-website-auditor` directory into your Claude Code plugins folder:
   ```
   cp -r production-website-auditor ~/.claude/plugins/
   ```

2. The plugin will be automatically available in Claude Code under the "Plugins" menu.

## Usage

### Via Claude Code UI
1. Open Claude Code
2. Go to Plugins → Production Website Auditor
3. Select an action (Audit, Verify, Pre-build, Post-build)
4. Configure options if needed
5. Run the plugin

### Via Command Line
You can also run the plugin directly using Node.js:

```bash
# Run a full audit
node bin/cli.js audit

# Run audit in fix mode (where safe)
node bin/cli.js audit --fix

# Run a single category audit
node bin/cli.js audit --category seo

# Run verification (lint, typecheck, test, build)
node bin/cli.js verify

# Run pre-build validation
node bin/cli.js pre-build

# Run post-build analysis
node bin/cli.js post-build

# Show help
node bin/cli.js --help
```

## Configuration

The plugin can be configured via environment variables:

- `AUDIT_FIX=true` - Enable auto-fixing where safe
- `AUDIT_CATEGORY=seo` - Run only a specific category
- `AUDIT_JSON=true` - Output JSON report only (no console logs)
- `PROJECT_ROOT=/path/to/project` - Specify project root (defaults to current directory)

## Output

After running an audit, a detailed report is generated in `.audit-report/audit-report.json` containing:
- Timestamp of audit
- Project root path
- Fix mode status
- Results per category (pass/flagged/failed)
- List of issues fixed
- List of issues flagged for manual review
- List of items intentionally left unchanged
- Summary counts

## Safety Guarantees

This plugin follows strict safety principles:
- 🚫 Never invents business information, customer reviews, testimonials, statistics, or legal facts
- 🚫 Never replaces real content with AI-generated filler
- ✅ Flags missing information instead of fabricating it
- ✅ Makes changes directly only when deterministic and safe
- ✅ Preserves existing design, branding, functionality, routes, and business logic
- ✅ Verifies results after making changes
- ✅ Implements technical safeguards for legal/compliance matters and flags items requiring human review

## Categories Audited

1. **Project Discovery** - Identifies framework, router, build system, package manager, entry points
2. **Routing + Page Quality** - Checks for proper 404 pages, unique titles, meta descriptions, headings
3. **SEO** - Audits titles, descriptions, canonical tags, Open Graph, Twitter cards, sitemap, robots.txt
4. **Structured Data** - Validates JSON-LD for Organization, LocalBusiness, WebSite, etc.
5. **Local SEO** - Checks for location-based business details (only if verifiable)
6. **Images + Media** - Audits alt text, image sizes, formats, lazy loading
7. **Favicon + Branding** - Ensures proper favicon and no framework-default branding
8. **Accessibility** - WCAG-oriented checks (color contrast, keyboard navigation, semantic HTML)
9. **Forms** - Validates labels, required fields, validation errors, loading states
10. **Payments** - Checks duplicate submission prevention, error handling
11. **API + Backend Reliability** - Audits loading states, error states, timeout handling
12. **API Limits + Spending** - Identifies potentially expensive API calls
13. **Analytics + Tracking** - Audits analytics scripts and tracking mechanisms
14. **Third-Party Services** - Reviews analytics, maps, social embeds, payment providers, etc.
15. **Legal / Trust Pages** - Checks for privacy policy, terms & conditions, cookie policy
16. **Content Trust** - Removes or flags fake reviews, testimonials, unsupported claims
17. **Case Studies + FAQ** - Creates sections only if real information exists
18. **Response-Time Promises** - Exposes real SLAs only if they exist
19. **Mobile UX** - Audits mobile layouts, touch targets, navigation
20. **Error Handling** - Implements custom 404, API error states, loading states
21. **Performance** - Audits bundle sizes, code splitting, lazy loading, unused dependencies
22. **Console + Build** - Ensures clean browser console and build output
23. **Database** - Audits slow queries, missing indexes, N+1 queries (if applicable)
24. **File Uploads** - Checks file size limits, type validation, safe storage
25. **Caching** - Identifies repeated expensive operations, recommends caching
26. **Monitoring + Logging** - Recommends appropriate monitoring where absent
27. **Backups** - Flags missing backups, unknown retention/restore procedures
28. **Concurrency** - Tests for race conditions, duplicate submissions, shared mutable state
29. **Security** - Basic production security audit (secrets, CORS, auth flaws, injection risks)
30. **Business Details** - Verifies presence and consistency of legitimate business information
31. **Source Code Quality** - Removes default boilerplate, placeholder comments, dead code
32. **Final Verification** - Runs linting, type checking, tests, production build, and manual checks
33. **Output** - Produces concise report with Fixed, Flagged, Not Changed, and Verification sections

## Development

To modify this plugin:

1. Edit the source files in the `src/` directory
2. Update `bin/cli.js` if changing command-line interface
3. Update `plugin.json` if changing metadata or hooks
4. Test with `node bin/cli.js audit` on a sample project
5. Ensure verification passes with `node bin/cli.js verify`

## License

MIT

## Credits

Built with Claude Code.