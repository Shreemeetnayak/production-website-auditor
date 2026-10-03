---
name: production-website-auditor
description: Audits web applications across 33 production-readiness dimensions (routing, SEO, accessibility, responsive design, security, performance, forms, error handling, content trust) and safely applies deterministic fixes without imposing generic AI template design patterns.
---

# Production Website Auditor

A Claude Code plugin and CLI tool that audits an existing web project and applies safe, deterministic fixes to make it production-ready.

## Purpose

Websites built with AI tools or quick prototypes often look functional at first glance but fail on production requirements: broken 404 routes, missing meta/canonical tags, missing image alt attributes, unlabelled form inputs, unbounded API calls, exposed secrets, and generic buzzword copy.

This plugin inspects the codebase, checks 33 audit categories, and outputs an actionable report. In fix mode (`--fix`), it applies safe, non-destructive fixes without replacing genuine content with placeholder data.

## Core Rules

1. **No Content Fabrication**: Never invent reviews, testimonials, business addresses, or fake certifications. If information is missing, it is flagged for human review.
2. **Preserve Architecture**: Do not rewrite existing frameworks or routing structures.
3. **Smallest Safe Diff**: Fixes only apply deterministic corrections (e.g., adding missing lang attributes, viewport tags, removing console.logs, adding missing basic meta structures).
4. **Verification**: Always run lint, typecheck, tests, and build verification after modifications.

## Supported Commands

- `/product-polish` or `production-website-auditor audit` — Run full multi-category audit
- `/product-polish fix` or `production-website-auditor audit --fix` — Run audit and apply safe fixes
- `/product-polish verify` or `production-website-auditor verify` — Run project verification suite
- `production-website-auditor audit --category=<category>` — Run a single audit category
