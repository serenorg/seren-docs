#!/usr/bin/env node

/**
 * Generate individual HTML pages for each OpenAPI schema
 * This makes schemas accessible to AI tools that truncate large responses
 */

const fs = require('fs');
const path = require('path');

const OPENAPI_PATH = path.join(__dirname, '..', 'openapi.json');
const DIST_SCHEMAS = path.join(__dirname, '..', 'dist', 'schemas');

function kebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function renderSchemaFull(spec, schema, depth = 0, seen = new Set()) {
  if (!schema) return '<span class="type-null">null</span>';
  if (depth > 6) return '<span class="type-truncated">...</span>';

  if (schema.$ref) {
    const name = schema.$ref.split('/').pop();
    const slug = kebabCase(name);

    // Prevent infinite recursion
    if (seen.has(name)) {
      return `<a href="/schemas/${slug}" class="schema-link">${escapeHtml(name)}</a>`;
    }

    const resolved = resolveRef(spec, schema.$ref);
    if (resolved && depth < 2) {
      seen.add(name);
      return `<div class="ref-schema">
        <span class="ref-label">→ <a href="/schemas/${slug}" class="schema-link">${escapeHtml(name)}</a></span>
        ${renderSchemaFull(spec, resolved, depth + 1, seen)}
      </div>`;
    }
    return `<a href="/schemas/${slug}" class="schema-link">${escapeHtml(name)}</a>`;
  }

  if (schema.oneOf || schema.anyOf || schema.allOf) {
    const variants = schema.oneOf || schema.anyOf || schema.allOf;
    const label = schema.oneOf ? 'oneOf' : schema.anyOf ? 'anyOf' : 'allOf';
    return `<div class="union-type">
      <span class="union-label">${label}:</span>
      <ul class="union-variants">
        ${variants.map(v => `<li>${renderSchemaFull(spec, v, depth + 1, seen)}</li>`).join('')}
      </ul>
    </div>`;
  }

  if (schema.type === 'array') {
    return `<span class="type-array">Array&lt;${renderSchemaFull(spec, schema.items, depth + 1, seen)}&gt;</span>`;
  }

  if (schema.type === 'object' || schema.properties) {
    const props = schema.properties || {};
    const required = schema.required || [];
    const entries = Object.entries(props);

    if (entries.length === 0 && schema.additionalProperties) {
      return `<span class="type-object">Record&lt;string, ${renderSchemaFull(spec, schema.additionalProperties, depth + 1, seen)}&gt;</span>`;
    }

    if (entries.length === 0) {
      return '<span class="type-object">object</span>';
    }

    return `<table class="props-table">
      <thead><tr><th>Property</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
      <tbody>
        ${entries.map(([key, val]) => {
          const isRequired = required.includes(key);
          let typeStr = val.type || 'any';
          if (val.$ref) {
            const refName = val.$ref.split('/').pop();
            typeStr = `<a href="/schemas/${kebabCase(refName)}" class="schema-link">${escapeHtml(refName)}</a>`;
          } else if (val.type === 'array' && val.items) {
            if (val.items.$ref) {
              const refName = val.items.$ref.split('/').pop();
              typeStr = `Array&lt;<a href="/schemas/${kebabCase(refName)}" class="schema-link">${escapeHtml(refName)}</a>&gt;`;
            } else {
              typeStr = `Array&lt;${escapeHtml(val.items.type || 'any')}&gt;`;
            }
          } else if (val.enum) {
            typeStr = `enum: ${val.enum.slice(0, 3).map(e => `"${escapeHtml(e)}"`).join(', ')}${val.enum.length > 3 ? '...' : ''}`;
          }
          return `<tr>
            <td><code>${escapeHtml(key)}</code></td>
            <td>${typeStr}</td>
            <td>${isRequired ? '<span class="required">Yes</span>' : 'No'}</td>
            <td>${escapeHtml(val.description || '')}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  }

  if (schema.enum) {
    return `<div class="enum-type">
      <span class="type-enum">${escapeHtml(schema.type || 'string')}</span>
      <ul class="enum-values">
        ${schema.enum.map(e => `<li><code>"${escapeHtml(e)}"</code></li>`).join('')}
      </ul>
    </div>`;
  }

  let typeStr = schema.type || 'any';
  if (schema.format) typeStr += ` (${schema.format})`;
  return `<span class="type-primitive">${escapeHtml(typeStr)}</span>`;
}

function generateSchemaPage(spec, name, schema) {
  const slug = kebabCase(name);
  const description = schema.description || '';
  const schemaHtml = renderSchemaFull(spec, schema, 0);
  const jsonSchema = JSON.stringify(schema, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(name)} Schema - SerenAI API</title>
  <meta name="description" content="Schema definition for ${escapeHtml(name)} in the SerenAI API">
  <script>(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);})();</script>
  <style>
    :root {
      --primary: #0066cc;
      --bg: #ffffff;
      --bg-secondary: #f8f9fa;
      --text: #1a1a1a;
      --text-muted: #666;
      --border: #e0e0e0;
    }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --primary: #4da3ff;
        --bg: #0d1117;
        --bg-secondary: #161b22;
        --text: #e6edf3;
        --text-muted: #8b949e;
        --border: #30363d;
      }
    }
    [data-theme="dark"] {
      --primary: #4da3ff;
      --bg: #0d1117;
      --bg-secondary: #161b22;
      --text: #e6edf3;
      --text-muted: #8b949e;
      --border: #30363d;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
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
    .seren-header h1 { margin: 0; font-size: 1.25rem; font-weight: 600; border: none; color: white; padding: 0; }
    .seren-header .tagline { opacity: 0.9; font-size: 0.875rem; margin-left: 16px; }
    .seren-header nav a { color: white; text-decoration: none; margin-left: 24px; font-size: 0.875rem; opacity: 0.9; }
    .seren-header nav a:hover { opacity: 1; }
    .theme-toggle { background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.875rem; margin-left: 24px; opacity: 0.9; }
    .theme-toggle:hover { opacity: 1; background: rgba(255,255,255,0.3); }
    .content { max-width: 1000px; margin: 0 auto; padding: 2rem; }
    .breadcrumb { font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem; }
    .breadcrumb a { color: var(--primary); text-decoration: none; }
    h1.schema-name { color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 0.5rem; margin-top: 0; }
    .description { color: var(--text-muted); margin-bottom: 2rem; font-size: 1.1rem; }
    .props-table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    .props-table th, .props-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border); }
    .props-table th { background: var(--bg-secondary); font-weight: 600; font-size: 0.85rem; }
    .props-table code { background: var(--bg-secondary); padding: 2px 6px; border-radius: 3px; }
    .required { color: #dc3545; font-weight: 600; }
    .schema-link { color: var(--primary); text-decoration: none; }
    .schema-link:hover { text-decoration: underline; }
    .type-primitive, .type-array, .type-object { font-family: monospace; }
    .union-type { margin: 0.5rem 0; }
    .union-label { font-weight: 600; }
    .union-variants { margin: 0.5rem 0 0.5rem 1.5rem; }
    .enum-type { margin: 0.5rem 0; }
    .enum-values { margin: 0.5rem 0 0.5rem 1.5rem; }
    .enum-values li { margin: 0.25rem 0; }
    .ref-schema { margin-left: 1rem; padding-left: 1rem; border-left: 2px solid var(--border); }
    .ref-label { color: var(--text-muted); font-size: 0.9rem; }
    .json-schema { margin-top: 2rem; }
    .json-schema summary { cursor: pointer; color: var(--primary); font-weight: 500; }
    .json-schema pre { background: var(--bg-secondary); padding: 1rem; border-radius: 5px; overflow-x: auto; font-size: 0.85rem; }
    @media (max-width: 768px) {
      .seren-header { flex-direction: column; padding: 12px 16px; gap: 8px; }
      .seren-header .tagline { display: none; }
      .seren-header nav { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
      .seren-header nav a { margin-left: 8px; margin-right: 8px; }
      .content { padding: 1rem; }
    }
  </style>
</head>
<body>
  <div class="seren-header">
    <div style="display: flex; align-items: center;">
      <a href="https://serendb.com" style="color: white; text-decoration: none;"><h1>SerenAI</h1></a>
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
  </div>

  <div class="content">
    <div class="breadcrumb">
      <a href="/">API Docs</a> / <a href="/schemas/">Schemas</a> / ${escapeHtml(name)}
    </div>

    <h1 class="schema-name">${escapeHtml(name)}</h1>
    ${description ? `<p class="description">${escapeHtml(description)}</p>` : ''}

    <h2>Properties</h2>
    ${schemaHtml}

    <details class="json-schema">
      <summary>View JSON Schema</summary>
      <pre><code>${escapeHtml(jsonSchema)}</code></pre>
    </details>
  </div>

  <script>
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
  updateToggleIcon();
  </script>
</body>
</html>`;
}

function generateIndexPage(spec, schemas) {
  const schemaList = Object.keys(schemas).sort();
  const categories = {};

  // Categorize schemas by prefix
  schemaList.forEach(name => {
    const prefix = name.match(/^[A-Z][a-z]+/)?.[0] || 'Other';
    if (!categories[prefix]) categories[prefix] = [];
    categories[prefix].push(name);
  });

  const categoryHtml = Object.entries(categories)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, names]) => `
      <div class="category">
        <h3>${escapeHtml(cat)} <span class="count">(${names.length})</span></h3>
        <ul>
          ${names.map(name => `<li><a href="/schemas/${kebabCase(name)}">${escapeHtml(name)}</a></li>`).join('')}
        </ul>
      </div>
    `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Schemas - SerenAI</title>
  <meta name="description" content="All ${schemaList.length} schema definitions for the SerenAI API">
  <script>(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);})();</script>
  <style>
    :root {
      --primary: #0066cc;
      --bg: #ffffff;
      --bg-secondary: #f8f9fa;
      --text: #1a1a1a;
      --text-muted: #666;
      --border: #e0e0e0;
    }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --primary: #4da3ff;
        --bg: #0d1117;
        --bg-secondary: #161b22;
        --text: #e6edf3;
        --text-muted: #8b949e;
        --border: #30363d;
      }
    }
    [data-theme="dark"] {
      --primary: #4da3ff;
      --bg: #0d1117;
      --bg-secondary: #161b22;
      --text: #e6edf3;
      --text-muted: #8b949e;
      --border: #30363d;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
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
    .seren-header h1 { margin: 0; font-size: 1.25rem; font-weight: 600; border: none; color: white; padding: 0; }
    .seren-header .tagline { opacity: 0.9; font-size: 0.875rem; margin-left: 16px; }
    .seren-header nav a { color: white; text-decoration: none; margin-left: 24px; font-size: 0.875rem; opacity: 0.9; }
    .seren-header nav a:hover { opacity: 1; }
    .theme-toggle { background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.875rem; margin-left: 24px; opacity: 0.9; }
    .theme-toggle:hover { opacity: 1; background: rgba(255,255,255,0.3); }
    .content { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    h1.page-title { color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 0.5rem; }
    .intro { color: var(--text-muted); margin-bottom: 2rem; }
    .machine-links { background: var(--bg-secondary); padding: 1rem; border-radius: 5px; margin-bottom: 2rem; }
    .machine-links a { color: var(--primary); margin-right: 1.5rem; }
    .categories { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem; }
    .category { background: var(--bg-secondary); padding: 1rem; border-radius: 5px; }
    .category h3 { margin: 0 0 0.5rem 0; color: var(--primary); font-size: 1rem; }
    .category .count { color: var(--text-muted); font-weight: normal; font-size: 0.85rem; }
    .category ul { margin: 0; padding-left: 1.2rem; font-size: 0.9rem; }
    .category li { margin: 0.25rem 0; }
    .category a { color: var(--text); text-decoration: none; }
    .category a:hover { color: var(--primary); }
    @media (max-width: 768px) {
      .seren-header { flex-direction: column; padding: 12px 16px; gap: 8px; }
      .seren-header .tagline { display: none; }
      .seren-header nav { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
      .seren-header nav a { margin-left: 8px; margin-right: 8px; }
      .content { padding: 1rem; }
      .categories { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="seren-header">
    <div style="display: flex; align-items: center;">
      <a href="https://serendb.com" style="color: white; text-decoration: none;"><h1>SerenAI</h1></a>
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
  </div>

  <div class="content">
    <h1 class="page-title">API Schemas</h1>
    <p class="intro">${schemaList.length} schema definitions for the SerenAI API. Each schema has its own page for easy AI/LLM access.</p>

    <div class="machine-links">
      <strong>Machine Readable:</strong>
      <a href="/schemas/index.json">index.json</a>
      <a href="/openapi.json">openapi.json</a>
      <a href="/llms.txt">llms.txt</a>
    </div>

    <div class="categories">
      ${categoryHtml}
    </div>
  </div>

  <script>
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
  updateToggleIcon();
  </script>
</body>
</html>`;
}

function main() {
  console.log('Building schema pages...');

  // Load OpenAPI spec
  if (!fs.existsSync(OPENAPI_PATH)) {
    console.error('openapi.json not found. Run npm run build:api first.');
    process.exit(1);
  }

  const spec = JSON.parse(fs.readFileSync(OPENAPI_PATH, 'utf-8'));
  const schemas = spec.components?.schemas || {};
  const schemaNames = Object.keys(schemas);

  console.log(`Found ${schemaNames.length} schemas`);

  // Ensure output directory exists
  if (!fs.existsSync(DIST_SCHEMAS)) {
    fs.mkdirSync(DIST_SCHEMAS, { recursive: true });
  }

  // Generate individual schema pages
  for (const name of schemaNames) {
    const slug = kebabCase(name);
    const html = generateSchemaPage(spec, name, schemas[name]);
    fs.writeFileSync(path.join(DIST_SCHEMAS, `${slug}.html`), html);
  }
  console.log(`Generated ${schemaNames.length} schema pages`);

  // Generate index page
  const indexHtml = generateIndexPage(spec, schemas);
  fs.writeFileSync(path.join(DIST_SCHEMAS, 'index.html'), indexHtml);
  console.log('Generated schemas/index.html');

  // Generate index.json for programmatic access
  const indexJson = {
    totalSchemas: schemaNames.length,
    schemas: schemaNames.sort().map(name => ({
      name,
      slug: kebabCase(name),
      url: `/schemas/${kebabCase(name)}`,
      jsonUrl: `/schemas/${kebabCase(name)}.json`
    }))
  };
  fs.writeFileSync(path.join(DIST_SCHEMAS, 'index.json'), JSON.stringify(indexJson, null, 2));
  console.log('Generated schemas/index.json');

  // Generate individual JSON files for each schema
  for (const name of schemaNames) {
    const slug = kebabCase(name);
    fs.writeFileSync(
      path.join(DIST_SCHEMAS, `${slug}.json`),
      JSON.stringify(schemas[name], null, 2)
    );
  }
  console.log(`Generated ${schemaNames.length} schema JSON files`);

  console.log('Done!');
}

main();
