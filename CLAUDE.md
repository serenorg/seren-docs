# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

seren-docs is the documentation infrastructure for SerenAI, a "Pay Per Call Agentic Commerce" platform. It generates multiple documentation formats from OpenAPI specs and manual guides.

## Commands

```bash
npm install                    # Install dependencies
npm run fetch:openapi          # Fetch latest OpenAPI spec from serencore
npm run build                  # Build all documentation (orchestrates all steps)
npm run build:api              # Generate Scalar API documentation only
npm run build:llms             # Generate llms.txt files only
npm run build:mcp              # Generate MCP documentation only
npm run dev                    # Preview with Scalar on port 3000
npm run clean                  # Clean dist directory
```

## Architecture

**Documentation Pipeline:**

1. **Inputs:**
   - `openapi.json` - Fetched from serencore repository (gitignored)
   - `manual/guides/*.md` - Hand-written markdown tutorials
   - MCP tool definitions hardcoded in `scripts/generate-mcp-docs.js`

2. **Build Scripts (`scripts/`):**
   - `build.js` - Main orchestrator, runs all steps with graceful error handling
   - `build-scalar.js` - OpenAPI → Interactive Scalar HTML
   - `generate-llms-txt.js` - OpenAPI → LLM-optimized context files
   - `generate-mcp-docs.js` - Generates MCP tool schemas and docs (contains 31 tool definitions)
   - `build-guides.js` - Markdown → HTML with styling

3. **Outputs (`dist/`):**
   - `index.html` - Scalar API documentation
   - `llms.txt` & `llms-full.txt` - LLM context files
   - `mcp/tools.json` & `mcp/llms.txt` - MCP server reference
   - `guides/*.html` - Converted guide pages
   - `_redirects` & `_headers` - Cloudflare Pages config

## Key Points

- **Don't edit `dist/`** - All content is auto-generated. Modify source files instead.
- **API doc changes** - Update OpenAPI spec in serencore repository, not here.
- **Guide changes** - Edit markdown files in `manual/guides/`.
- **MCP tool changes** - Update `scripts/generate-mcp-docs.js` directly (31 tools in 7 categories).
- **Deployment** - GitHub Actions deploys to Cloudflare Pages on push, schedule, and webhook triggers.
- **OpenAPI spec is external** - Changes to serencore auto-trigger rebuilds via repository dispatch.
