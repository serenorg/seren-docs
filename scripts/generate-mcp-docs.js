#!/usr/bin/env node
// ABOUTME: Generates MCP tool documentation from seren-mcp source
// ABOUTME: Creates tools.json schema and llms.txt for MCP tools

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

## Installation

### Claude Desktop (stdio mode)

Add to \`~/.config/claude/claude_desktop_config.json\`:

\`\`\`json
{
  "mcpServers": {
    "seren": {
      "command": "seren-mcp",
      "args": ["start"],
      "env": {
        "API_KEY": "seren_live_xxxxx"
      }
    }
  }
}
\`\`\`

### HTTP Mode (with OAuth)

\`\`\`bash
seren-mcp start:oauth --port 3000
\`\`\`

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

function generateMcpHtml(toolsJson, llmsTxt) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SerenAI MCP Server Documentation</title>
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
    nav { background: var(--code-bg); padding: 1rem; border-radius: 5px; margin-bottom: 2rem; }
    nav a { margin-right: 1rem; }
  </style>
</head>
<body>
  <h1>SerenAI MCP Server</h1>
  <p><em>Model Context Protocol server for Pay Per Call Agentic Commerce</em></p>

  <nav>
    <strong>Resources:</strong>
    <a href="/mcp/tools.json">tools.json</a>
    <a href="/mcp/llms.txt">llms.txt</a>
    <a href="/">API Docs</a>
  </nav>

  <h2>Installation</h2>

  <h3>Claude Desktop (stdio mode)</h3>
  <pre><code>{
  "mcpServers": {
    "seren": {
      "command": "seren-mcp",
      "args": ["start"],
      "env": {
        "API_KEY": "seren_live_xxxxx"
      }
    }
  }
}</code></pre>

  <h2>Available Tools (${toolsJson.tools.length})</h2>

  ${toolsJson.tools.map(tool => `
  <div class="tool">
    <h4><code>${tool.name}</code></h4>
    <p>${tool.description}</p>
    ${Object.keys(tool.inputSchema.properties).length > 0 ? `
    <div class="params">
      <strong>Parameters:</strong>
      ${Object.entries(tool.inputSchema.properties).map(([name, schema]) => `
      <div class="param">
        <code>${name}</code>: ${schema.type}
        <span class="${tool.inputSchema.required?.includes(name) ? 'required' : 'optional'}">
          (${tool.inputSchema.required?.includes(name) ? 'required' : 'optional'})
        </span>
        ${schema.description ? `- ${schema.description}` : ''}
      </div>
      `).join('')}
    </div>
    ` : ''}
  </div>
  `).join('')}

  <h2>More Information</h2>
  <ul>
    <li><a href="/">Full API Documentation</a></li>
    <li><a href="https://github.com/serenorg/seren">GitHub Repository</a></li>
  </ul>
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

  // Generate HTML documentation
  const html = generateMcpHtml(toolsJson, llmsTxt);
  fs.writeFileSync(path.join(DIST_PATH, 'index.html'), html);
  console.log(`Generated mcp/index.html`);

  console.log('Done!');
}

main();
