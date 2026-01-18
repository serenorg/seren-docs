#!/usr/bin/env node
// ABOUTME: Builds manual markdown guides into HTML
// ABOUTME: Uses marked for markdown parsing with minimal styling

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const MANUAL_DIR = path.join(__dirname, '..', 'manual');
const GUIDES_DIR = path.join(MANUAL_DIR, 'guides');
const MCP_DIR = path.join(MANUAL_DIR, 'mcp');
const DIST_GUIDES = path.join(__dirname, '..', 'dist', 'guides');

const HTML_TEMPLATE = (title, content) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - SerenAI Documentation</title>
  <style>
    :root {
      --primary: #0066cc;
      --bg: #ffffff;
      --text: #333333;
      --code-bg: #f5f5f5;
      --border: #e0e0e0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.7;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: var(--text);
      background: var(--bg);
    }
    h1 { color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 0.5rem; }
    h2 { margin-top: 2rem; color: var(--primary); }
    h3 { margin-top: 1.5rem; }
    a { color: var(--primary); }
    code {
      background: var(--code-bg);
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-size: 0.9em;
    }
    pre {
      background: var(--code-bg);
      padding: 1rem;
      border-radius: 5px;
      overflow-x: auto;
      border: 1px solid var(--border);
    }
    pre code { padding: 0; background: none; }
    blockquote {
      border-left: 4px solid var(--primary);
      margin-left: 0;
      padding-left: 1rem;
      color: #666;
    }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid var(--border); padding: 0.5rem; text-align: left; }
    th { background: var(--code-bg); }
    nav {
      background: var(--code-bg);
      padding: 1rem;
      border-radius: 5px;
      margin-bottom: 2rem;
    }
    nav a { margin-right: 1rem; }
    .breadcrumb { color: #666; margin-bottom: 1rem; }
    .breadcrumb a { color: #666; }
  </style>
</head>
<body>
  <nav>
    <a href="/">API Docs</a>
    <a href="/mcp/">MCP Server</a>
    <a href="/guides/">Guides</a>
    <a href="https://console.serendb.com/login" target="_blank">Seren Console</a>
  </nav>
  <div class="breadcrumb">
    <a href="/">Home</a> / <a href="/guides/">Guides</a> / ${title}
  </div>
  ${content}
</body>
</html>`;

function buildGuide(inputPath, outputPath, title) {
  const markdown = fs.readFileSync(inputPath, 'utf-8');
  const html = marked(markdown);

  // Extract title from first h1 if not provided
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const pageTitle = title || (titleMatch ? titleMatch[1] : 'Guide');

  fs.writeFileSync(outputPath, HTML_TEMPLATE(pageTitle, html));
  return pageTitle;
}

function buildGuidesIndex(guides) {
  const content = `
    <h1>SerenAI Guides</h1>
    <p>Step-by-step tutorials and documentation for SerenAI.</p>

    <h2>Getting Started</h2>
    <ul>
      ${guides.map(g => `<li><a href="/guides/${g.slug}.html">${g.title}</a></li>`).join('\n      ')}
    </ul>

    <h2>Additional Resources</h2>
    <ul>
      <li><a href="/">API Reference</a> - Complete REST API documentation</li>
      <li><a href="/mcp/">MCP Server</a> - AI assistant integration</li>
      <li><a href="/llms.txt">llms.txt</a> - LLM-optimized context</li>
    </ul>
  `;

  fs.writeFileSync(
    path.join(DIST_GUIDES, 'index.html'),
    HTML_TEMPLATE('Guides', content)
  );
}

function main() {
  console.log('Building manual guides...');

  // Ensure output directory exists
  if (!fs.existsSync(DIST_GUIDES)) {
    fs.mkdirSync(DIST_GUIDES, { recursive: true });
  }

  const guides = [];

  // Process guides directory
  if (fs.existsSync(GUIDES_DIR)) {
    const files = fs.readdirSync(GUIDES_DIR).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const slug = file.replace('.md', '');
      const inputPath = path.join(GUIDES_DIR, file);
      const outputPath = path.join(DIST_GUIDES, `${slug}.html`);

      const title = buildGuide(inputPath, outputPath);
      guides.push({ slug, title });
      console.log(`  Built: ${file} -> ${slug}.html`);
    }
  }

  // Build guides index
  buildGuidesIndex(guides);
  console.log('  Built: index.html');

  console.log(`Generated ${guides.length} guide(s)`);
}

main();
