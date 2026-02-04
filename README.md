# SerenAI Documentation

> Pay Per Call Agentic Commerce for public and private data

This repository generates documentation for [SerenAI](https://serendb.com). All output is **static HTML with no JavaScript** — fully readable by AI agents and humans alike.

## AI-First Documentation

SerenDB is an agentic commerce platform where AI agents are the primary API consumers. Our docs are designed for machine readability:

| Endpoint | Purpose |
|----------|---------|
| [docs.serendb.com](https://docs.serendb.com) | Static HTML API reference (no JS required) |
| [docs.serendb.com/openapi.json](https://docs.serendb.com/openapi.json) | Raw OpenAPI 3.0 spec for programmatic access |
| [docs.serendb.com/llms.txt](https://docs.serendb.com/llms.txt) | LLM-optimized context following [llmstxt.org](https://llmstxt.org) |
| [docs.serendb.com/skills.md](https://docs.serendb.com/skills.md) | Publisher skills reference |
| [docs.serendb.com/mcp/](https://docs.serendb.com/mcp/) | MCP server installation and tool reference |
| [docs.serendb.com/guides/](https://docs.serendb.com/guides/) | Step-by-step tutorials |

All endpoints include CORS headers for cross-origin access.

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Install dependencies
npm install

# Fetch the latest OpenAPI spec (requires ../serencore checkout)
npm run fetch:openapi

# Build everything
npm run build

# Preview locally
npm run dev
```

### Build Output

```
dist/
├── index.html      # Static HTML API docs (no JS)
├── openapi.json    # Raw OpenAPI spec
├── llms.txt        # LLM context (summary)
├── llms-full.txt   # LLM context (full endpoints)
├── skills.md       # Publisher skills (fetched from API)
├── install.sh      # Seren installer (macOS/Linux)
├── install.ps1     # Seren installer (Windows)
├── mcp/
│   ├── index.html  # MCP installation guide
│   ├── tools.html  # MCP tool reference
│   ├── tools.json  # MCP tools as JSON
│   └── llms.txt    # MCP-specific LLM context
└── guides/
    └── *.html      # Tutorial pages
```

### Project Structure

```
seren-docs/
├── scripts/
│   ├── build.js               # Main build orchestrator
│   ├── build-html-docs.js     # OpenAPI → static HTML (no JS)
│   ├── generate-llms-txt.js   # OpenAPI → llms.txt
│   ├── generate-mcp-docs.js   # MCP tool documentation
│   └── build-guides.js        # Markdown → HTML
├── manual/
│   └── guides/                # Hand-written tutorials
├── dist/                      # Generated output (gitignored)
└── openapi.json               # Fetched OpenAPI spec (gitignored)
```

## Automatic Updates

Documentation regenerates automatically when:

1. **OpenAPI spec changes** in [serencore](https://github.com/serenorg/serencore) → triggers `repository_dispatch`
2. **MCP tools change** in [seren](https://github.com/serenorg/seren) → triggers `repository_dispatch`
3. **Skills update** — fetched from `api.serendb.com/skill.md` on every build
4. **Manual guides change** — push to this repository
5. **Daily rebuild** — cron at midnight UTC

GitHub Actions builds and deploys to Cloudflare Pages.

## Contributing

1. **API docs** — Update OpenAPI spec in serencore
2. **Guides** — Edit files in `manual/guides/`
3. **MCP tools** — Update `scripts/generate-mcp-docs.js`
4. **Styling** — Edit `scripts/build-html-docs.js`

## License

MIT
