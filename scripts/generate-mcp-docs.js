#!/usr/bin/env node
// ABOUTME: Generates MCP tool documentation from seren-mcp source
// ABOUTME: Creates tools.json schema, llms.txt, and HTML pages for MCP tools

const fs = require('fs');
const path = require('path');

const DIST_PATH = path.join(__dirname, '..', 'dist', 'mcp');

// MCP tool definitions extracted from seren-mcp
// These are manually maintained until we have automated extraction
const MCP_TOOLS = [
  // Project Management
  {
    name: 'list_projects',
    description: 'List all Seren projects accessible to the authenticated user',
    category: 'Projects',
    parameters: {}
  },
  {
    name: 'create_project',
    description: 'Create a new Seren project',
    category: 'Projects',
    parameters: {
      name: { type: 'string', required: true, description: 'Project name' },
      region: { type: 'string', required: true, description: 'Deployment region' }
    }
  },
  {
    name: 'describe_project',
    description: 'Get detailed information about a specific project',
    category: 'Projects',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true }
    }
  },
  {
    name: 'delete_project',
    description: 'Delete a Seren project',
    category: 'Projects',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true }
    }
  },

  // Branch Management
  {
    name: 'list_branches',
    description: 'List branches for a project',
    category: 'Branches',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true }
    }
  },
  {
    name: 'create_branch',
    description: 'Create a new branch in a project',
    category: 'Branches',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      name: { type: 'string', required: true },
      parent_branch_id: { type: 'string', format: 'uuid', required: false }
    }
  },
  {
    name: 'describe_branch',
    description: 'Get details about a specific branch',
    category: 'Branches',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true }
    }
  },
  {
    name: 'delete_branch',
    description: 'Delete a branch',
    category: 'Branches',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true }
    }
  },

  // SQL Execution
  {
    name: 'run_sql',
    description: 'Execute a SQL query against a database',
    category: 'SQL',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      database: { type: 'string', required: true },
      query: { type: 'string', required: true }
    }
  },
  {
    name: 'run_sql_transaction',
    description: 'Execute multiple SQL statements in a single transaction',
    category: 'SQL',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      database: { type: 'string', required: true },
      queries: { type: 'array', items: { type: 'string' }, required: true }
    }
  },
  {
    name: 'explain_sql_statement',
    description: 'Explain a SQL statement (FORMAT JSON)',
    category: 'SQL',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      database: { type: 'string', required: true },
      query: { type: 'string', required: true }
    }
  },

  // Database Schema
  {
    name: 'list_databases',
    description: 'List all databases in a branch',
    category: 'Schema',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true }
    }
  },
  {
    name: 'get_database_tables',
    description: 'List tables in a database schema',
    category: 'Schema',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      database: { type: 'string', required: true },
      schema: { type: 'string', required: false, default: 'public' }
    }
  },
  {
    name: 'describe_table_schema',
    description: 'Get schema information for a table',
    category: 'Schema',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      database: { type: 'string', required: true },
      table_name: { type: 'string', required: true },
      schema: { type: 'string', required: false, default: 'public' }
    }
  },

  // Endpoints (Compute)
  {
    name: 'list_endpoints',
    description: 'List all endpoints for a branch',
    category: 'Endpoints',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true }
    }
  },
  {
    name: 'create_endpoint',
    description: 'Create a new endpoint for a branch',
    category: 'Endpoints',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      autoscaling_min: { type: 'integer', required: false },
      autoscaling_max: { type: 'integer', required: false }
    }
  },
  {
    name: 'start_endpoint',
    description: 'Start a suspended endpoint',
    category: 'Endpoints',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      endpoint_id: { type: 'string', format: 'uuid', required: true }
    }
  },
  {
    name: 'suspend_endpoint',
    description: 'Suspend an endpoint',
    category: 'Endpoints',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      endpoint_id: { type: 'string', format: 'uuid', required: true }
    }
  },

  // Agent Marketplace
  {
    name: 'list_agent_publishers',
    description: 'List all active publishers in the agent marketplace',
    category: 'Marketplace',
    parameters: {
      search: { type: 'string', required: false },
      is_verified: { type: 'boolean', required: false },
      limit: { type: 'integer', required: false },
      offset: { type: 'integer', required: false }
    }
  },
  {
    name: 'get_agent_publisher',
    description: 'Get details about a specific publisher including pricing info',
    category: 'Marketplace',
    parameters: {
      slug: { type: 'string', required: true }
    }
  },
  {
    name: 'execute_paid_query',
    description: 'Execute a paid SQL query against a publisher database',
    category: 'Marketplace',
    parameters: {
      publisher: { type: 'string', required: true, description: 'Publisher slug or UUID' },
      query: { type: 'string', required: true },
      database: { type: 'string', required: false },
      confirm: { type: 'boolean', required: false, default: false }
    }
  },
  {
    name: 'execute_paid_api',
    description: 'Execute a paid API request against a publisher endpoint',
    category: 'Marketplace',
    parameters: {
      publisher: { type: 'string', required: true },
      method: { type: 'string', required: false, default: 'POST' },
      path: { type: 'string', required: false },
      body: { type: 'object', required: false },
      confirm: { type: 'boolean', required: false, default: false }
    }
  },
  {
    name: 'estimate_query_cost',
    description: 'Estimate the cost of a SQL query without executing it',
    category: 'Marketplace',
    parameters: {
      publisher: { type: 'string', required: true },
      query: { type: 'string', required: true }
    }
  },

  // Payments & Balance
  {
    name: 'get_prepaid_balance',
    description: 'Get your SerenBucks balance',
    category: 'Payments',
    parameters: {}
  },
  {
    name: 'get_transaction_history',
    description: 'Get transaction history (deposits, charges, refunds)',
    category: 'Payments',
    parameters: {
      limit: { type: 'integer', required: false, default: 50 },
      offset: { type: 'integer', required: false }
    }
  },
  {
    name: 'create_prepaid_deposit',
    description: 'Deposit SerenBucks with a credit card via Stripe',
    category: 'Payments',
    parameters: {
      amount_usd: { type: 'number', required: true, description: 'Amount in USD (minimum $5.00)' }
    }
  }
];

const COMMON_STYLES = `
    :root {
      --primary: #0066cc;
      --bg: #ffffff;
      --text: #333333;
      --code-bg: #f5f5f5;
      --border: #e0e0e0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      color: var(--text);
      background: var(--bg);
    }
    h1 { color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 0.5rem; }
    h2 { margin-top: 2rem; }
    h3 { margin-top: 1.5rem; }
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
    }
    pre code { padding: 0; background: none; }
    nav { background: var(--code-bg); padding: 1rem; border-radius: 5px; margin-bottom: 2rem; }
    nav a { margin-right: 1rem; }
    .tool {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem 0;
    }
    .tool h4 { margin: 0 0 0.5rem 0; color: var(--primary); }
    .params { margin-left: 1rem; }
    .param { margin: 0.3rem 0; }
    .required { color: #cc0000; font-size: 0.8em; }
    .optional { color: #666; font-size: 0.8em; }
`;

function generateToolsJson() {
  return {
    name: 'seren-mcp',
    version: '1.0.0',
    description: 'SerenAI MCP Server - Manage serverless Postgres and query the agent marketplace',
    tools: MCP_TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(tool.parameters).map(([key, param]) => [
            key,
            {
              type: param.type,
              description: param.description || '',
              ...(param.format && { format: param.format }),
              ...(param.default !== undefined && { default: param.default }),
              ...(param.items && { items: param.items })
            }
          ])
        ),
        required: Object.entries(tool.parameters)
          .filter(([_, param]) => param.required)
          .map(([key]) => key)
      }
    }))
  };
}

function generateMcpLlmsTxt() {
  const categories = {};
  for (const tool of MCP_TOOLS) {
    if (!categories[tool.category]) {
      categories[tool.category] = [];
    }
    categories[tool.category].push(tool);
  }

  let content = `# SerenAI MCP Server

> Model Context Protocol server for SerenAI - Pay Per Call Agentic Commerce

The SerenAI MCP server enables AI assistants to manage serverless Postgres databases and query the agent marketplace with SerenBucks micropayments.

## Quick Install (90 seconds)

One command configures all your MCP clients automatically.

### macOS / Linux
\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/serenorg/seren-installer/main/src/scripts/install.sh | bash
\`\`\`

### Windows (PowerShell)
\`\`\`powershell
irm https://raw.githubusercontent.com/serenorg/seren-installer/main/src/scripts/install.ps1 | iex
\`\`\`

The installer auto-detects and configures: Claude Code, Claude Desktop, Cursor, Windsurf, OpenCode, Codex, and Gemini CLI.

**[Full Installation Guide](/guides/mcp-install.html)** — Manual setup and troubleshooting.

## Available Tools

`;

  for (const [category, tools] of Object.entries(categories).sort()) {
    content += `### ${category}\n\n`;

    for (const tool of tools) {
      content += `#### \`${tool.name}\`\n\n`;
      content += `${tool.description}\n\n`;

      const params = Object.entries(tool.parameters);
      if (params.length > 0) {
        content += `**Parameters:**\n`;
        for (const [name, param] of params) {
          const req = param.required ? '(required)' : '(optional)';
          content += `- \`${name}\`: ${param.type} ${req}`;
          if (param.description) {
            content += ` - ${param.description}`;
          }
          content += '\n';
        }
        content += '\n';
      }
    }
  }

  content += `## Authentication

The MCP server supports three authentication modes:

1. **API Key (stdio)**: Set \`API_KEY\` environment variable
2. **Bearer Token (HTTP)**: Set \`AUTH_TOKEN\` for simple auth
3. **OAuth 2.1 (HTTP)**: Full OAuth flow with PKCE

## Read-Only Mode

Set \`READ_ONLY=true\` to block write operations (useful for shared deployments).

## More Information

- [Full API Documentation](https://docs.serendb.com/)
- [Tool Schemas](/mcp/tools.json)
- [GitHub Repository](https://github.com/serenorg/seren)
`;

  return content;
}

// Installation page - clean and focused
function generateInstallHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Install Seren MCP Server</title>
  <style>${COMMON_STYLES}
    .install-box {
      background: var(--code-bg);
      border: 2px solid var(--primary);
      border-radius: 8px;
      padding: 1.5rem;
      margin: 1.5rem 0;
    }
    .install-box h3 { margin-top: 0; color: var(--primary); }
    .platforms {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 1rem 0;
    }
    .platform {
      background: var(--code-bg);
      padding: 0.3rem 0.8rem;
      border-radius: 20px;
      font-size: 0.9em;
      border: 1px solid var(--border);
    }
  </style>
</head>
<body>
  <h1>Install Seren MCP Server</h1>
  <p>Get Seren running in your AI assistant in under 90 seconds.</p>

  <nav>
    <a href="/mcp/tools.html">Tools Reference</a>
    <a href="/mcp/tools.json">tools.json</a>
    <a href="/mcp/llms.txt">llms.txt</a>
    <a href="/">API Docs</a>
  </nav>

  <div class="install-box">
    <h3>macOS / Linux</h3>
    <pre><code>curl -fsSL https://raw.githubusercontent.com/serenorg/seren-installer/main/src/scripts/install.sh | bash</code></pre>
  </div>

  <div class="install-box">
    <h3>Windows (PowerShell)</h3>
    <pre><code>irm https://raw.githubusercontent.com/serenorg/seren-installer/main/src/scripts/install.ps1 | iex</code></pre>
  </div>

  <h2>Supported Platforms</h2>
  <p>The installer auto-detects and configures all installed clients:</p>
  <div class="platforms">
    <span class="platform">Claude Code</span>
    <span class="platform">Claude Desktop</span>
    <span class="platform">Cursor</span>
    <span class="platform">Windsurf</span>
    <span class="platform">OpenCode</span>
    <span class="platform">Codex</span>
    <span class="platform">Gemini CLI</span>
  </div>

  <h2>What Happens Next</h2>
  <ol>
    <li>The installer detects which AI tools you have installed</li>
    <li>It configures each one to connect to <code>mcp.serendb.com</code></li>
    <li>Restart your AI tool to activate Seren</li>
    <li>On first use, you'll authenticate via OAuth at serendb.com</li>
  </ol>

  <h2>Need Manual Setup?</h2>
  <p>If you prefer to configure manually or need troubleshooting help, see the <a href="/guides/mcp-install.html">Full Installation Guide</a>.</p>

  <h2>After Installation</h2>
  <p>Once installed, you'll have access to <a href="/mcp/tools.html">26 tools</a> for:</p>
  <ul>
    <li>Managing serverless Postgres databases</li>
    <li>Querying the agent marketplace with SerenBucks</li>
    <li>Executing paid API calls to publishers like Firecrawl and Perplexity</li>
  </ul>
</body>
</html>`;
}

// Tools reference page - comprehensive listing
function generateToolsHtml(toolsJson) {
  const categories = {};
  for (const tool of MCP_TOOLS) {
    if (!categories[tool.category]) {
      categories[tool.category] = [];
    }
    categories[tool.category].push(tool);
  }

  const categoryNav = Object.keys(categories).sort().map(cat =>
    `<a href="#${cat.toLowerCase()}">${cat}</a>`
  ).join(' · ');

  const toolsHtml = Object.entries(categories).sort().map(([category, tools]) => `
    <h2 id="${category.toLowerCase()}">${category}</h2>
    ${tools.map(tool => `
    <div class="tool">
      <h4><code>${tool.name}</code></h4>
      <p>${tool.description}</p>
      ${Object.keys(tool.parameters).length > 0 ? `
      <div class="params">
        <strong>Parameters:</strong>
        ${Object.entries(tool.parameters).map(([name, param]) => `
        <div class="param">
          <code>${name}</code>: ${param.type}
          <span class="${param.required ? 'required' : 'optional'}">
            (${param.required ? 'required' : 'optional'})
          </span>
          ${param.description ? `- ${param.description}` : ''}
        </div>
        `).join('')}
      </div>
      ` : ''}
    </div>
    `).join('')}
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seren MCP Tools Reference</title>
  <style>${COMMON_STYLES}
    .category-nav {
      background: var(--code-bg);
      padding: 0.8rem 1rem;
      border-radius: 5px;
      margin: 1rem 0;
    }
    .category-nav a { margin-right: 0.8rem; }
  </style>
</head>
<body>
  <h1>Seren MCP Tools Reference</h1>
  <p>${toolsJson.tools.length} tools for managing databases and querying the agent marketplace.</p>

  <nav>
    <a href="/mcp/">Install</a>
    <a href="/mcp/tools.json">tools.json</a>
    <a href="/mcp/llms.txt">llms.txt</a>
    <a href="/">API Docs</a>
  </nav>

  <div class="category-nav">
    <strong>Jump to:</strong> ${categoryNav}
  </div>

  ${toolsHtml}

  <h2>Authentication</h2>
  <p>The MCP server supports three authentication modes:</p>
  <ul>
    <li><strong>API Key (stdio)</strong>: Set <code>API_KEY</code> environment variable</li>
    <li><strong>Bearer Token (HTTP)</strong>: Set <code>AUTH_TOKEN</code> for simple auth</li>
    <li><strong>OAuth 2.1 (HTTP)</strong>: Full OAuth flow with PKCE</li>
  </ul>

  <h2>Read-Only Mode</h2>
  <p>Set <code>READ_ONLY=true</code> to block write operations (useful for shared deployments).</p>
</body>
</html>`;
}

function main() {
  console.log('Generating MCP documentation...');

  // Ensure dist/mcp directory exists
  if (!fs.existsSync(DIST_PATH)) {
    fs.mkdirSync(DIST_PATH, { recursive: true });
  }

  // Generate tools.json
  const toolsJson = generateToolsJson();
  fs.writeFileSync(
    path.join(DIST_PATH, 'tools.json'),
    JSON.stringify(toolsJson, null, 2)
  );
  console.log(`Generated tools.json (${toolsJson.tools.length} tools)`);

  // Generate llms.txt for MCP
  const llmsTxt = generateMcpLlmsTxt();
  fs.writeFileSync(path.join(DIST_PATH, 'llms.txt'), llmsTxt);
  console.log(`Generated mcp/llms.txt (${llmsTxt.length} bytes)`);

  // Generate installation page (index.html)
  const installHtml = generateInstallHtml();
  fs.writeFileSync(path.join(DIST_PATH, 'index.html'), installHtml);
  console.log(`Generated mcp/index.html (installation)`);

  // Generate tools reference page
  const toolsHtml = generateToolsHtml(toolsJson);
  fs.writeFileSync(path.join(DIST_PATH, 'tools.html'), toolsHtml);
  console.log(`Generated mcp/tools.html (reference)`);

  console.log('Done!');
}

main();
