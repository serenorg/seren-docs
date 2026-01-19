#!/usr/bin/env node
// ABOUTME: Generates Scalar API documentation from OpenAPI spec
// ABOUTME: Creates a standalone HTML page with embedded Scalar viewer

const fs = require('fs');
const path = require('path');

const OPENAPI_URL = 'https://api.serendb.com/openapi.json';
const OPENAPI_PATH = path.join(__dirname, '..', 'openapi.json');
const DIST_PATH = path.join(__dirname, '..', 'dist');
const OUTPUT_PATH = path.join(DIST_PATH, 'index.html');

async function fetchOpenApiSpec() {
  // Try local file first, then fetch from API
  if (fs.existsSync(OPENAPI_PATH)) {
    console.log('Using local openapi.json');
    return fs.readFileSync(OPENAPI_PATH, 'utf-8');
  }

  console.log(`Fetching OpenAPI spec from ${OPENAPI_URL}...`);
  const headers = {};
  if (process.env.SEREN_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.SEREN_API_KEY}`;
    console.log('Using SEREN_API_KEY for authentication');
  }
  const response = await fetch(OPENAPI_URL, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec: ${response.status}`);
  }
  const spec = await response.text();
  console.log(`Fetched OpenAPI spec (${spec.length} bytes)`);
  return spec;
}

async function generateScalarHtml() {
  // Read OpenAPI spec and embed it inline for better performance
  let specContent = '{}';
  try {
    const rawSpec = await fetchOpenApiSpec();
    const spec = JSON.parse(rawSpec);

    // Override branding to SerenAI
    if (spec.info) {
      spec.info.title = 'SerenAI API';
      spec.info.description = 'Pay Per Call Agentic Commerce for public and private data';
    }

    // Reorder tags to put "agent" first (most important for AI agent users)
    if (spec.tags && Array.isArray(spec.tags)) {
      const agentTag = spec.tags.find(t => t.name === 'agent');
      const otherTags = spec.tags.filter(t => t.name !== 'agent');
      if (agentTag) {
        spec.tags = [agentTag, ...otherTags];
        console.log('Reordered tags: agent moved to first position');
      }
    }

    // Override server URL to point to production API
    spec.servers = [
      {
        url: 'https://api.serendb.com',
        description: 'Seren API'
      }
    ];

    specContent = JSON.stringify(spec);
  } catch (err) {
    console.error(`Warning: Could not load OpenAPI spec: ${err.message}`);
    console.log('Using placeholder spec');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SerenAI API Documentation</title>
  <meta name="description" content="Pay Per Call Agentic Commerce for public and private data">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌊</text></svg>">
  <style>
    body {
      margin: 0;
      padding: 0;
    }
    /* Custom header bar */
    .seren-header {
      background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
      color: white;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    .seren-header h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }
    .seren-header .tagline {
      opacity: 0.9;
      font-size: 0.875rem;
      margin-left: 16px;
    }
    .seren-header nav a {
      color: white;
      text-decoration: none;
      margin-left: 24px;
      font-size: 0.875rem;
      opacity: 0.9;
      transition: opacity 0.2s;
    }
    .seren-header nav a:hover {
      opacity: 1;
    }
    /* Mobile responsiveness */
    @media (max-width: 768px) {
      .seren-header {
        flex-direction: column;
        padding: 12px 16px;
        gap: 8px;
      }
      .seren-header .tagline {
        display: none;
      }
      .seren-header nav {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
      }
      .seren-header nav a {
        margin-left: 8px;
        margin-right: 8px;
        font-size: 0.8rem;
      }
    }
    /* Scalar container */
    #scalar-root {
      height: calc(100vh - 52px);
    }
    @media (max-width: 768px) {
      #scalar-root {
        height: calc(100vh - 80px);
      }
    }
  </style>
</head>
<body>
  <div class="seren-header">
    <div style="display: flex; align-items: center;">
      <a href="https://serendb.com" target="_blank" style="color: white; text-decoration: none;"><h1>SerenAI</h1></a>
      <span class="tagline">Pay Per Call Agentic Commerce</span>
    </div>
    <nav>
      <a href="/">API Docs</a>
      <a href="/mcp/">Install MCP</a>
      <a href="/guides/">Guides</a>
      <a href="/llms.txt">llms.txt</a>
      <a href="https://console.serendb.com/login" target="_blank">Seren Console</a>
    </nav>
  </div>

  <div id="scalar-root"></div>

  <script id="openapi-spec" type="application/json">
${specContent}
  </script>

  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  <script>
    const spec = JSON.parse(document.getElementById('openapi-spec').textContent);

    Scalar.createApiReference('#scalar-root', {
      spec: {
        content: spec
      },
      theme: 'bluePlanet',
      layout: 'modern',
      hideModels: false,
      hideDownloadButton: false,
      showSidebar: true,
      searchHotKey: 'k',
      metaData: {
        title: 'SerenAI API Documentation',
        description: 'Pay Per Call Agentic Commerce for public and private data'
      }
    });
  </script>
</body>
</html>`;
}

async function main() {
  console.log('Generating Scalar API documentation...');

  // Ensure dist directory exists
  if (!fs.existsSync(DIST_PATH)) {
    fs.mkdirSync(DIST_PATH, { recursive: true });
  }

  const html = await generateScalarHtml();
  fs.writeFileSync(OUTPUT_PATH, html);

  const stats = fs.statSync(OUTPUT_PATH);
  console.log(`Generated index.html (${(stats.size / 1024).toFixed(1)}KB)`);
}

main().catch(err => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
