#!/usr/bin/env node
// ABOUTME: Builds manual markdown guides into HTML
// ABOUTME: Uses marked for markdown parsing with minimal styling

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Configure marked to generate heading IDs for anchor links
marked.use({
  renderer: {
    heading(text, level) {
      // Generate slug from heading text (lowercase, spaces to hyphens, remove special chars)
      const slug = text.toLowerCase()
        .replace(/<[^>]+>/g, '')  // Remove HTML tags
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')     // Replace spaces with hyphens
        .replace(/-+/g, '-')      // Replace multiple hyphens with single
        .trim();
      return `<h${level} id="${slug}">${text}</h${level}>\n`;
    }
  }
});

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
  <script>(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);})();</script>
  <style>
    :root {
      --primary: #0066cc;
      --bg: #ffffff;
      --text: #333333;
      --code-bg: #f5f5f5;
      --border: #e0e0e0;
    }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --primary: #4da3ff;
        --bg: #0d1117;
        --text: #e6edf3;
        --code-bg: #161b22;
        --border: #30363d;
      }
    }
    [data-theme="dark"] {
      --primary: #4da3ff;
      --bg: #0d1117;
      --text: #e6edf3;
      --code-bg: #161b22;
      --border: #30363d;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.7;
      margin: 0;
      padding: 0;
      color: var(--text);
      background: var(--bg);
    }
    .seren-header {
      background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
      color: white;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    .seren-header h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      border: none;
      color: white;
      padding: 0;
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
    .seren-header nav a:hover { opacity: 1; }
    .theme-toggle {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      padding: 6px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      margin-left: 24px;
      opacity: 0.9;
    }
    .theme-toggle:hover { opacity: 1; background: rgba(255,255,255,0.3); }
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
    .content {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    @media (max-width: 768px) {
      .content {
        padding: 1rem;
      }
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
      position: relative;
    }
    pre code { padding: 0; background: none; }
    .copy-btn {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 4px;
      padding: 0.4rem 0.8rem;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      transition: all 0.2s;
    }
    .copy-btn:hover { background: #0052a3; }
    .copy-btn.copied { background: #28a745; }
    @media (max-width: 768px) {
      pre {
        padding-bottom: 3rem;
      }
      pre code {
        word-break: break-all;
        white-space: pre-wrap;
      }
      .copy-btn {
        top: auto;
        bottom: 0.5rem;
        right: 0.5rem;
      }
    }
    blockquote {
      border-left: 4px solid var(--primary);
      margin-left: 0;
      padding-left: 1rem;
      color: #666;
    }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid var(--border); padding: 0.5rem; text-align: left; }
    th { background: var(--code-bg); }
    .breadcrumb { color: #666; margin-bottom: 1rem; }
    .breadcrumb a { color: #666; }
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
      <a href="/install-seren/">Install Seren</a>
      <a href="/guides/">Guides</a>
      <a href="/schemas/">Schemas</a>
      <a href="/llms.txt">llms.txt</a>
      <a href="https://console.serendb.com/login" target="_blank">Seren Console</a>
      <button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle dark mode">☀️</button>
    </nav>
  </div>
  <div class="content">
    <div class="breadcrumb">
      <a href="/">Home</a> / <a href="/guides/">Guides</a> / ${title}
    </div>
    ${content}
  </div>
  <script>
  document.querySelectorAll('pre').forEach(pre => {
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.onclick = () => {
      const code = pre.querySelector('code') || pre;
      navigator.clipboard.writeText(code.textContent).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      });
    };
    pre.appendChild(btn);
  });

  function toggleTheme() {
    var html = document.documentElement;
    var current = html.getAttribute('data-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var newTheme;
    if (current === 'dark') newTheme = 'light';
    else if (current === 'light') newTheme = 'dark';
    else newTheme = prefersDark ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateToggleIcon();
  }
  function updateToggleIcon() {
    var btn = document.querySelector('.theme-toggle');
    var theme = document.documentElement.getAttribute('data-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = theme === 'dark' || (theme !== 'light' && prefersDark);
    btn.textContent = isDark ? '☀️' : '🌙';
  }
  (function() {
    var saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    updateToggleIcon();
  })();
  </script>
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
      <li><a href="/install-seren/">Install Seren</a> - AI assistant integration</li>
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
