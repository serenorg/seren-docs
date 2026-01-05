# SerenAI Documentation

> Pay Per Call Agentic Commerce for public and private data

This repository contains the documentation infrastructure for [SerenAI](https://serendb.com), including:

- **API Documentation** - Interactive REST API docs powered by [Scalar](https://github.com/scalar/scalar)
- **llms.txt** - LLM-optimized context files following [llmstxt.org](https://llmstxt.org) spec
- **MCP Documentation** - Model Context Protocol server reference
- **Guides** - Step-by-step tutorials and how-to guides

## Live Documentation

- [docs.serendb.com](https://docs.serendb.com) - Primary documentation site
- [docs.serendb.com/llms.txt](https://docs.serendb.com/llms.txt) - LLM context
- [docs.serendb.com/mcp/](https://docs.serendb.com/mcp/) - MCP server docs

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Install dependencies
npm install

# Fetch the latest OpenAPI spec
npm run fetch:openapi

# Build everything
npm run build

# Preview locally with Scalar
npm run dev
```

### Project Structure

```
seren-docs/
├── scripts/
│   ├── build.js              # Main build orchestrator
│   ├── build-scalar.js       # Scalar API docs generator
│   ├── generate-llms-txt.js  # OpenAPI → llms.txt
│   ├── generate-mcp-docs.js  # MCP tool documentation
│   └── build-guides.js       # Markdown → HTML
├── manual/
│   └── guides/               # Hand-written tutorials
├── dist/                     # Generated output (gitignored)
└── openapi.json              # Fetched OpenAPI spec (gitignored)
```

## Automatic Updates

Documentation is automatically regenerated when:

1. The OpenAPI spec changes in [serencore](https://github.com/serenorg/serencore)
2. MCP tools change in [seren](https://github.com/serenorg/seren)
3. Manual guides are updated in this repository

GitHub Actions handles the build and deploys to Cloudflare Pages.

## Contributing

1. For API documentation changes, update the OpenAPI spec in serencore
2. For guide content, edit files in `manual/guides/`
3. For MCP tool docs, update `scripts/generate-mcp-docs.js` (until automated extraction is implemented)

## License

MIT
