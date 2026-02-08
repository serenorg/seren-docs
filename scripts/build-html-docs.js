#!/usr/bin/env node
// ABOUTME: Generates static HTML API documentation from OpenAPI spec
// ABOUTME: No JavaScript required - fully readable by AI agents and humans

const fs = require('fs');
const path = require('path');

const OPENAPI_URL = 'https://raw.githubusercontent.com/serenorg/serencore/main/openapi/openapi.json';
const OPENAPI_PATH = path.join(__dirname, '..', 'openapi.json');
const DIST_PATH = path.join(__dirname, '..', 'dist');
const OUTPUT_PATH = path.join(DIST_PATH, 'index.html');

async function fetchOpenApiSpec() {
  if (fs.existsSync(OPENAPI_PATH)) {
    console.log('Using local openapi.json');
    return JSON.parse(fs.readFileSync(OPENAPI_PATH, 'utf-8'));
  }

  console.log(`Fetching OpenAPI spec from ${OPENAPI_URL}...`);
  const headers = {};
  const token = process.env.GH_PAT || process.env.GITHUB_TOKEN;
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  const response = await fetch(OPENAPI_URL, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec: ${response.status}`);
  }
  const spec = await response.json();
  fs.writeFileSync(OPENAPI_PATH, JSON.stringify(spec, null, 2));
  return spec;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getMethodClass(method) {
  const classes = {
    get: 'method-get',
    post: 'method-post',
    put: 'method-put',
    patch: 'method-patch',
    delete: 'method-delete'
  };
  return classes[method.toLowerCase()] || 'method-default';
}

function resolveRef(spec, ref) {
  if (!ref || !ref.startsWith('#/')) return null;
  const parts = ref.slice(2).split('/');
  let current = spec;
  for (const part of parts) {
    current = current?.[part];
  }
  return current;
}

function renderSchema(spec, schema, depth = 0) {
  if (!schema) return '<span class="schema-null">null</span>';
  if (depth > 3) return '<span class="schema-truncated">...</span>';

  if (schema.$ref) {
    const resolved = resolveRef(spec, schema.$ref);
    const name = schema.$ref.split('/').pop();
    if (resolved) {
      return `<details class="schema-ref"><summary>${escapeHtml(name)}</summary>${renderSchema(spec, resolved, depth + 1)}</details>`;
    }
    return `<span class="schema-ref-name">${escapeHtml(name)}</span>`;
  }

  if (schema.oneOf || schema.anyOf) {
    const variants = schema.oneOf || schema.anyOf;
    return `<span class="schema-union">oneOf: [${variants.map(v => renderSchema(spec, v, depth + 1)).join(' | ')}]</span>`;
  }

  if (schema.type === 'array') {
    return `<span class="schema-array">Array&lt;${renderSchema(spec, schema.items, depth + 1)}&gt;</span>`;
  }

  if (schema.type === 'object' || schema.properties) {
    const props = schema.properties || {};
    const required = schema.required || [];
    const entries = Object.entries(props);
    if (entries.length === 0) {
      return '<span class="schema-object">object</span>';
    }
    const propLines = entries.slice(0, 10).map(([key, val]) => {
      const isRequired = required.includes(key);
      const type = val.type || (val.$ref ? val.$ref.split('/').pop() : 'any');
      return `<div class="schema-prop"><span class="prop-name">${escapeHtml(key)}${isRequired ? '<span class="required">*</span>' : ''}</span>: <span class="prop-type">${escapeHtml(type)}</span>${val.description ? ` <span class="prop-desc">— ${escapeHtml(val.description.slice(0, 80))}</span>` : ''}</div>`;
    });
    if (entries.length > 10) {
      propLines.push(`<div class="schema-prop">... and ${entries.length - 10} more properties</div>`);
    }
    return `<div class="schema-object-props">${propLines.join('')}</div>`;
  }

  if (schema.enum) {
    return `<span class="schema-enum">${escapeHtml(schema.type || 'string')} (${schema.enum.slice(0, 5).map(e => `"${escapeHtml(e)}"`).join(' | ')}${schema.enum.length > 5 ? ' | ...' : ''})</span>`;
  }

  return `<span class="schema-primitive">${escapeHtml(schema.type || 'any')}${schema.format ? ` (${escapeHtml(schema.format)})` : ''}</span>`;
}

function renderEndpoint(spec, method, path, operation) {
  const summary = operation.summary || '';
  const description = operation.description || '';
  const operationId = operation.operationId || '';
  const tags = operation.tags || ['Other'];

  // Parameters
  const params = operation.parameters || [];
  let paramsHtml = '';
  if (params.length > 0) {
    paramsHtml = `
      <div class="params">
        <h4>Parameters</h4>
        <table class="params-table">
          <thead><tr><th>Name</th><th>In</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
          <tbody>
            ${params.map(p => `
              <tr>
                <td><code>${escapeHtml(p.name)}</code></td>
                <td>${escapeHtml(p.in)}</td>
                <td>${escapeHtml(p.schema?.type || 'string')}</td>
                <td>${p.required ? 'Yes' : 'No'}</td>
                <td>${escapeHtml(p.description || '')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Request body
  let requestBodyHtml = '';
  if (operation.requestBody) {
    const content = operation.requestBody.content;
    const jsonContent = content?.['application/json'];
    if (jsonContent?.schema) {
      requestBodyHtml = `
        <div class="request-body">
          <h4>Request Body ${operation.requestBody.required ? '<span class="required">(required)</span>' : ''}</h4>
          <div class="schema-container">${renderSchema(spec, jsonContent.schema)}</div>
        </div>
      `;
    }
  }

  // Responses
  const responses = operation.responses || {};
  const responsesHtml = Object.entries(responses).map(([code, resp]) => {
    const content = resp.content?.['application/json'];
    return `
      <div class="response response-${code.startsWith('2') ? 'success' : code.startsWith('4') ? 'client-error' : 'server-error'}">
        <span class="response-code">${escapeHtml(code)}</span>
        <span class="response-desc">${escapeHtml(resp.description || '')}</span>
        ${content?.schema ? `<div class="schema-container">${renderSchema(spec, content.schema)}</div>` : ''}
      </div>
    `;
  }).join('');

  const anchorId = `${method}-${path.replace(/[^a-zA-Z0-9]/g, '-')}`;

  return `
    <article class="endpoint" id="${anchorId}">
      <div class="endpoint-header">
        <span class="method ${getMethodClass(method)}">${method.toUpperCase()}</span>
        <code class="path">${escapeHtml(path)}</code>
      </div>
      ${summary ? `<p class="summary">${escapeHtml(summary)}</p>` : ''}
      ${description ? `<div class="description">${escapeHtml(description).replace(/\n/g, '<br>')}</div>` : ''}
      ${operationId ? `<p class="operation-id">Operation: <code>${escapeHtml(operationId)}</code></p>` : ''}
      ${paramsHtml}
      ${requestBodyHtml}
      ${responsesHtml ? `<div class="responses"><h4>Responses</h4>${responsesHtml}</div>` : ''}
    </article>
  `;
}

function generateHtml(spec) {
  // Override branding
  spec.info.title = 'SerenAI API';
  spec.info.description = 'Pay Per Call Agentic Commerce for public and private data';
  spec.servers = [{ url: 'https://api.serendb.com', description: 'Seren API' }];

  // Group endpoints by tag
  const endpointsByTag = {};
  const tagOrder = [];

  // Initialize with defined tags
  if (spec.tags) {
    for (const tag of spec.tags) {
      endpointsByTag[tag.name] = { description: tag.description || '', endpoints: [] };
      tagOrder.push(tag.name);
    }
  }

  // Move 'agent' to front if it exists
  const agentIdx = tagOrder.indexOf('agent');
  if (agentIdx > 0) {
    tagOrder.splice(agentIdx, 1);
    tagOrder.unshift('agent');
  }

  // Collect endpoints
  for (const [path, methods] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(methods)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
        const tags = operation.tags || ['Other'];
        for (const tag of tags) {
          if (!endpointsByTag[tag]) {
            endpointsByTag[tag] = { description: '', endpoints: [] };
            tagOrder.push(tag);
          }
          endpointsByTag[tag].endpoints.push({ method, path, operation });
        }
      }
    }
  }

  // Generate tag sections
  const sectionsHtml = tagOrder.map(tag => {
    const group = endpointsByTag[tag];
    if (!group || group.endpoints.length === 0) return '';

    const tagId = tag.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    return `
      <section class="tag-section" id="tag-${tagId}">
        <h2>${escapeHtml(tag)}</h2>
        ${group.description ? `<p class="tag-description">${escapeHtml(group.description)}</p>` : ''}
        <div class="endpoints">
          ${group.endpoints.map(e => renderEndpoint(spec, e.method, e.path, e.operation)).join('')}
        </div>
      </section>
    `;
  }).join('');

  // Generate navigation
  const navHtml = tagOrder.filter(tag => endpointsByTag[tag]?.endpoints.length > 0).map(tag => {
    const tagId = tag.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const count = endpointsByTag[tag].endpoints.length;
    return `<a href="#tag-${tagId}">${escapeHtml(tag)} <span class="count">(${count})</span></a>`;
  }).join('');

  const totalEndpoints = Object.values(endpointsByTag).reduce((sum, g) => sum + g.endpoints.length, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SerenAI API Documentation</title>
  <meta name="description" content="Pay Per Call Agentic Commerce for public and private data. ${totalEndpoints} API endpoints.">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌊</text></svg>">
  <script>(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);})();</script>
  <style>
    :root {
      --primary: #0066cc;
      --primary-dark: #004499;
      --bg: #ffffff;
      --bg-secondary: #f8f9fa;
      --text: #1a1a1a;
      --text-muted: #666;
      --border: #e0e0e0;
      --success: #28a745;
      --warning: #ffc107;
      --danger: #dc3545;
      --info: #17a2b8;
    }

    /* Dark mode - system preference */
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --primary: #4da3ff;
        --primary-dark: #0066cc;
        --bg: #0d1117;
        --bg-secondary: #161b22;
        --text: #e6edf3;
        --text-muted: #8b949e;
        --border: #30363d;
        --success: #3fb950;
        --warning: #d29922;
        --danger: #f85149;
        --info: #58a6ff;
      }
    }

    /* Dark mode - manual toggle */
    [data-theme="dark"] {
      --primary: #4da3ff;
      --primary-dark: #0066cc;
      --bg: #0d1117;
      --bg-secondary: #161b22;
      --text: #e6edf3;
      --text-muted: #8b949e;
      --border: #30363d;
      --success: #3fb950;
      --warning: #d29922;
      --danger: #f85149;
      --info: #58a6ff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      color: var(--text);
      background: var(--bg);
    }

    /* Header */
    .seren-header {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
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
    }
    .seren-header h1 a {
      color: white;
      text-decoration: none;
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

    /* Layout */
    .container {
      display: flex;
      min-height: calc(100vh - 52px);
    }

    /* Sidebar */
    .sidebar {
      width: 260px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      padding: 20px 0;
      position: sticky;
      top: 52px;
      height: calc(100vh - 52px);
      overflow-y: auto;
    }
    .sidebar h3 {
      margin: 0 20px 12px;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
    }
    .sidebar a {
      display: block;
      padding: 8px 20px;
      color: var(--text);
      text-decoration: none;
      font-size: 0.875rem;
    }
    .sidebar a:hover {
      background: var(--border);
    }
    .sidebar .count {
      color: var(--text-muted);
      font-size: 0.75rem;
    }
    .sidebar .machine-links {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    .sidebar .machine-links a {
      color: var(--primary);
    }

    /* Main content */
    main {
      flex: 1;
      padding: 32px 48px;
      max-width: 900px;
    }

    /* Hero */
    .hero {
      margin-bottom: 48px;
      padding-bottom: 32px;
      border-bottom: 1px solid var(--border);
    }
    .hero h1 {
      margin: 0 0 8px;
      font-size: 2rem;
    }
    .hero .description {
      color: var(--text-muted);
      font-size: 1.1rem;
      margin: 0 0 16px;
    }
    .hero .stats {
      display: flex;
      gap: 24px;
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .hero .stats strong {
      color: var(--text);
    }

    /* Tag sections */
    .tag-section {
      margin-bottom: 48px;
    }
    .tag-section h2 {
      font-size: 1.5rem;
      margin: 0 0 8px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--primary);
    }
    .tag-description {
      color: var(--text-muted);
      margin: 0 0 24px;
    }

    /* Endpoints */
    .endpoint {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .endpoint-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .method {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .method-get { background: #e8f5e9; color: #2e7d32; }
    .method-post { background: #e3f2fd; color: #1565c0; }
    .method-put { background: #fff3e0; color: #ef6c00; }
    .method-patch { background: #f3e5f5; color: #7b1fa2; }
    .method-delete { background: #ffebee; color: #c62828; }

    /* Dark mode method colors */
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) .method-get { background: #1a3d2e; color: #3fb950; }
      :root:not([data-theme="light"]) .method-post { background: #1a2d4e; color: #58a6ff; }
      :root:not([data-theme="light"]) .method-put { background: #3d2e1a; color: #d29922; }
      :root:not([data-theme="light"]) .method-patch { background: #2e1a3d; color: #bc8cff; }
      :root:not([data-theme="light"]) .method-delete { background: #3d1a1a; color: #f85149; }
    }
    [data-theme="dark"] .method-get { background: #1a3d2e; color: #3fb950; }
    [data-theme="dark"] .method-post { background: #1a2d4e; color: #58a6ff; }
    [data-theme="dark"] .method-put { background: #3d2e1a; color: #d29922; }
    [data-theme="dark"] .method-patch { background: #2e1a3d; color: #bc8cff; }
    [data-theme="dark"] .method-delete { background: #3d1a1a; color: #f85149; }
    .path {
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.95rem;
      color: var(--text);
    }
    .summary {
      font-weight: 500;
      margin: 0 0 8px;
    }
    .description {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-bottom: 16px;
    }
    .operation-id {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin: 8px 0;
    }
    .operation-id code {
      background: var(--bg-secondary);
      padding: 2px 6px;
      border-radius: 3px;
    }

    /* Parameters */
    .params, .request-body, .responses {
      margin-top: 16px;
    }
    .params h4, .request-body h4, .responses h4 {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin: 0 0 8px;
    }
    .params-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .params-table th, .params-table td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    .params-table th {
      background: var(--bg-secondary);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
    }
    .params-table code {
      background: var(--bg-secondary);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.85rem;
    }

    /* Schema */
    .schema-container {
      background: var(--bg-secondary);
      border-radius: 4px;
      padding: 12px;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.8rem;
      overflow-x: auto;
    }
    .schema-object-props {
      padding-left: 16px;
    }
    .schema-prop {
      margin: 4px 0;
    }
    .prop-name {
      color: #0550ae;
    }
    .prop-type {
      color: #6f42c1;
    }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) .prop-name { color: #79c0ff; }
      :root:not([data-theme="light"]) .prop-type { color: #d2a8ff; }
    }
    [data-theme="dark"] .prop-name { color: #79c0ff; }
    [data-theme="dark"] .prop-type { color: #d2a8ff; }
    .prop-desc {
      color: var(--text-muted);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .required {
      color: var(--danger);
      margin-left: 2px;
    }
    .schema-ref summary {
      cursor: pointer;
      color: var(--primary);
    }
    .schema-ref-name {
      color: var(--primary);
    }

    /* Responses */
    .response {
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .response-success { background: #e8f5e9; }
    .response-client-error { background: #fff3e0; }
    .response-server-error { background: #ffebee; }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) .response-success { background: #1a3d2e; }
      :root:not([data-theme="light"]) .response-client-error { background: #3d2e1a; }
      :root:not([data-theme="light"]) .response-server-error { background: #3d1a1a; }
    }
    [data-theme="dark"] .response-success { background: #1a3d2e; }
    [data-theme="dark"] .response-client-error { background: #3d2e1a; }
    [data-theme="dark"] .response-server-error { background: #3d1a1a; }
    .response-code {
      font-weight: 700;
      margin-right: 8px;
    }
    .response-desc {
      color: var(--text-muted);
    }
    .response .schema-container {
      margin-top: 8px;
    }

    /* Mobile */
    @media (max-width: 900px) {
      .seren-header {
        flex-direction: column;
        padding: 12px 16px;
        gap: 8px;
      }
      .seren-header .tagline { display: none; }
      .seren-header nav {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
      }
      .seren-header nav a {
        margin-left: 8px;
        margin-right: 8px;
      }
      .container {
        flex-direction: column;
      }
      .sidebar {
        width: 100%;
        height: auto;
        position: relative;
        top: 0;
        border-right: none;
        border-bottom: 1px solid var(--border);
        display: flex;
        flex-wrap: wrap;
        padding: 12px;
        gap: 4px;
      }
      .sidebar h3 { display: none; }
      .sidebar a {
        padding: 6px 12px;
        background: var(--bg);
        border-radius: 4px;
        border: 1px solid var(--border);
      }
      .sidebar .machine-links {
        width: 100%;
        margin-top: 8px;
        padding-top: 8px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      main {
        padding: 20px 16px;
      }
    }
  </style>
</head>
<body>
  <header class="seren-header">
    <div style="display: flex; align-items: center;">
      <h1><a href="https://serendb.com">SerenAI</a></h1>
      <span class="tagline">Pay Per Call Agentic Commerce</span>
    </div>
    <nav>
      <a href="/">API Docs</a>
      <a href="/install-seren/">Install Seren</a>
      <a href="/guides/">Guides</a>
      <a href="/schemas/">Schemas</a>
      <a href="/skills.md">Skills</a>
      <a href="/llms.txt">llms.txt</a>
      <a href="https://console.serendb.com/login" target="_blank">Seren Console</a>
      <button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle dark mode">☀️</button>
    </nav>
  </header>

  <div class="container">
    <aside class="sidebar">
      <h3>Endpoints</h3>
      ${navHtml}
      <div class="machine-links">
        <h3>Machine Readable</h3>
        <a href="/openapi.json">openapi.json</a>
        <a href="/llms.txt">llms.txt</a>
        <a href="/llms-full.txt">llms-full.txt</a>
        <a href="/install-seren/tools.json">install-seren/tools.json</a>
      </div>
    </aside>

    <main>
      <div class="hero">
        <h1>${escapeHtml(spec.info.title)}</h1>
        <p class="description">${escapeHtml(spec.info.description)}</p>
        <div class="stats">
          <span><strong>${totalEndpoints}</strong> endpoints</span>
          <span><strong>${tagOrder.filter(t => endpointsByTag[t]?.endpoints.length > 0).length}</strong> categories</span>
          <span>Base URL: <code>${escapeHtml(spec.servers[0]?.url || '/')}</code></span>
        </div>
      </div>

      ${sectionsHtml}
    </main>
  </div>
  <script>
    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      let newTheme;
      if (current === 'dark') newTheme = 'light';
      else if (current === 'light') newTheme = 'dark';
      else newTheme = prefersDark ? 'light' : 'dark';
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateToggleIcon();
    }
    function updateToggleIcon() {
      const btn = document.querySelector('.theme-toggle');
      const theme = document.documentElement.getAttribute('data-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = theme === 'dark' || (theme !== 'light' && prefersDark);
      btn.textContent = isDark ? '☀️' : '🌙';
    }
    (function() {
      const saved = localStorage.getItem('theme');
      if (saved) document.documentElement.setAttribute('data-theme', saved);
      updateToggleIcon();
    })();
  </script>
</body>
</html>`;
}

async function main() {
  console.log('Generating static HTML API documentation...');

  if (!fs.existsSync(DIST_PATH)) {
    fs.mkdirSync(DIST_PATH, { recursive: true });
  }

  const spec = await fetchOpenApiSpec();

  // Copy openapi.json to dist for direct access
  const distOpenapiPath = path.join(DIST_PATH, 'openapi.json');
  const modifiedSpec = { ...spec };
  modifiedSpec.info.title = 'SerenAI API';
  modifiedSpec.info.description = 'Pay Per Call Agentic Commerce for public and private data';
  modifiedSpec.servers = [{ url: 'https://api.serendb.com', description: 'Seren API' }];
  fs.writeFileSync(distOpenapiPath, JSON.stringify(modifiedSpec, null, 2));
  console.log('Copied openapi.json to dist/');

  const html = generateHtml(spec);
  fs.writeFileSync(OUTPUT_PATH, html);

  const stats = fs.statSync(OUTPUT_PATH);
  console.log(`Generated index.html (${(stats.size / 1024).toFixed(1)}KB)`);
}

main().catch(err => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
