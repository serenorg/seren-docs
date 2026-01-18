# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

seren-docs generates documentation for SerenAI from OpenAPI specs and manual guides. Output formats include interactive API docs (Scalar), llms.txt files, and MCP tool schemas.

## Commands

```bash
npm install                    # Install dependencies
npm run fetch:openapi          # Copy OpenAPI spec from ../serencore (requires sibling checkout)
npm run build                  # Build all documentation (runs all steps below)
npm run build:api              # Generate Scalar API docs → dist/index.html
npm run build:llms             # Generate llms.txt → dist/llms.txt, dist/llms-full.txt
npm run build:mcp              # Generate MCP docs → dist/mcp/tools.json, dist/mcp/llms.txt
npm run dev                    # Preview Scalar docs on port 3000
npm run clean                  # Delete and recreate dist/
```

**No lint or test commands** - this is a pure documentation generator.

## Local Development Prerequisite

`npm run fetch:openapi` copies from `../serencore/seren-core/openapi.json`. For local development, either:

1. Clone serencore as a sibling directory, or
2. Manually place `openapi.json` in the project root

CI handles this automatically by checking out the private serencore repo.

## Architecture

```text
openapi.json ─────────────┬──→ build-scalar.js ──→ dist/index.html
(from serencore)          ├──→ generate-llms-txt.js ──→ dist/llms.txt, dist/llms-full.txt
                          │
manual/guides/*.md ───────┴──→ build-guides.js ──→ dist/guides/*.html

scripts/generate-mcp-docs.js ──→ dist/mcp/tools.json, dist/mcp/llms.txt
(31 hardcoded tool definitions)
```

**build.js** orchestrates all steps with graceful error handling (continues on failures).

## Key Files

| File                           | Purpose                                                                    |
| ------------------------------ | -------------------------------------------------------------------------- |
| `scripts/generate-mcp-docs.js` | Contains all 31 MCP tool definitions inline - edit this to update MCP docs |
| `scripts/generate-llms-txt.js` | `llms.txt` is mostly static; `llms-full.txt` parses OpenAPI endpoints      |
| `manual/guides/quickstart.md`  | Only manual guide currently - add more `.md` files here                    |
| `static/`                      | Optional - any files here are copied to `dist/` root                       |

## Update Workflows

- **API docs change**: Update OpenAPI in serencore → triggers `repository_dispatch: openapi-updated`
- **MCP tools change**: Edit `scripts/generate-mcp-docs.js` directly → push triggers rebuild
- **Guide changes**: Edit `manual/guides/*.md` → push triggers rebuild
- **Static assets**: Add to `static/` directory → copied during build

## Deployment

GitHub Actions deploys to Cloudflare Pages on:

- Push to main (paths: scripts/, templates/, manual/)
- `repository_dispatch` events from serencore/seren repos
- Daily cron at midnight UTC
