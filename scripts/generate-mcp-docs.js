#!/usr/bin/env node
// ABOUTME: Generates MCP tool documentation from seren-mcp source
// ABOUTME: Creates tools.json schema, llms.txt, and HTML pages for MCP tools

const fs = require('fs');
const path = require('path');

const DIST_PATH = path.join(__dirname, '..', 'dist', 'mcp');

// Complete MCP tool definitions - 63 tools across 13 categories
const MCP_TOOLS = [
  // ============ Projects ============
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
    name: 'update_project',
    description: 'Update a project\'s settings including name, security options, and compute defaults',
    category: 'Projects',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      name: { type: 'string', required: false, description: 'New project name' },
      compute_unit_min: { type: 'integer', required: false },
      compute_unit_max: { type: 'integer', required: false }
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

  // ============ Branches ============
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
    name: 'rename_branch',
    description: 'Rename a branch',
    category: 'Branches',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      name: { type: 'string', required: true, description: 'New branch name' }
    }
  },
  {
    name: 'reset_branch',
    description: 'Reset a branch to its parent\'s latest state (destroys all data on the branch)',
    category: 'Branches',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true }
    }
  },
  {
    name: 'set_branch_expiration',
    description: 'Set or remove branch expiration date',
    category: 'Branches',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      expires_at: { type: 'string', required: false, description: 'Expiration date in RFC3339 format, or null to remove' }
    }
  },
  {
    name: 'set_default_branch',
    description: 'Set a branch as the default branch for the project',
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

  // ============ Databases ============
  {
    name: 'list_all_databases',
    description: 'List all databases across all projects with project and branch names',
    category: 'Databases',
    parameters: {}
  },
  {
    name: 'list_databases',
    description: 'List all databases in a branch',
    category: 'Databases',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true }
    }
  },
  {
    name: 'get_database',
    description: 'Get details about a specific database',
    category: 'Databases',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      database_id: { type: 'string', format: 'uuid', required: true }
    }
  },
  {
    name: 'create_database',
    description: 'Create a new database in a branch',
    category: 'Databases',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      name: { type: 'string', required: true }
    }
  },
  {
    name: 'delete_database',
    description: 'Delete a database from a branch',
    category: 'Databases',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      database_id: { type: 'string', format: 'uuid', required: true }
    }
  },

  // ============ Schema ============
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

  // ============ SQL ============
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

  // ============ Endpoints ============
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
    name: 'get_endpoint_status',
    description: 'Get the current status of an endpoint (running, suspended, etc.)',
    category: 'Endpoints',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      endpoint_id: { type: 'string', format: 'uuid', required: true }
    }
  },
  {
    name: 'update_endpoint',
    description: 'Update an endpoint\'s settings including autoscaling and suspend timeout',
    category: 'Endpoints',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      endpoint_id: { type: 'string', format: 'uuid', required: true },
      autoscaling_min: { type: 'integer', required: false },
      autoscaling_max: { type: 'integer', required: false },
      suspend_timeout_seconds: { type: 'integer', required: false }
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
  {
    name: 'restart_endpoint',
    description: 'Restart an endpoint (rolling restart via Kubernetes)',
    category: 'Endpoints',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      endpoint_id: { type: 'string', format: 'uuid', required: true }
    }
  },
  {
    name: 'delete_endpoint',
    description: 'Delete an endpoint',
    category: 'Endpoints',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      endpoint_id: { type: 'string', format: 'uuid', required: true }
    }
  },

  // ============ Roles ============
  {
    name: 'list_roles',
    description: 'List all roles in a branch',
    category: 'Roles',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true }
    }
  },
  {
    name: 'create_role',
    description: 'Create a new database role on a branch',
    category: 'Roles',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      name: { type: 'string', required: true, description: 'Role name' }
    }
  },
  {
    name: 'reset_role_password',
    description: 'Reset a database role\'s password, generating a new secure password',
    category: 'Roles',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      role_id: { type: 'string', format: 'uuid', required: true },
      password: { type: 'string', required: true, description: 'New password for the role' }
    }
  },
  {
    name: 'reveal_role_password',
    description: 'Reveal the current password for a database role',
    category: 'Roles',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      role_name: { type: 'string', required: true }
    }
  },
  {
    name: 'delete_role',
    description: 'Delete a database role from a branch',
    category: 'Roles',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      role_id: { type: 'string', format: 'uuid', required: true }
    }
  },

  // ============ Connection ============
  {
    name: 'get_connection_string',
    description: 'Get connection string for a branch',
    category: 'Connection',
    parameters: {
      project_id: { type: 'string', format: 'uuid', required: true },
      branch_id: { type: 'string', format: 'uuid', required: true },
      database: { type: 'string', required: false },
      pooled: { type: 'boolean', required: false, description: 'Return pooled connection' },
      role: { type: 'string', required: false, description: 'PostgreSQL role/username' }
    }
  },

  // ============ Organizations & API Keys ============
  {
    name: 'list_organizations',
    description: 'List organizations accessible to the authenticated user',
    category: 'Organizations',
    parameters: {}
  },
  {
    name: 'list_api_keys',
    description: 'List all API keys for an organization',
    category: 'Organizations',
    parameters: {
      organization_id: { type: 'string', format: 'uuid', required: true }
    }
  },
  {
    name: 'create_api_key',
    description: 'Create a new API key for an organization',
    category: 'Organizations',
    parameters: {
      organization_id: { type: 'string', format: 'uuid', required: true },
      name: { type: 'string', required: true },
      expires_in_days: { type: 'integer', required: false }
    }
  },
  {
    name: 'revoke_api_key',
    description: 'Revoke an API key',
    category: 'Organizations',
    parameters: {
      organization_id: { type: 'string', format: 'uuid', required: true },
      key_id: { type: 'string', format: 'uuid', required: true }
    }
  },

  // ============ Marketplace ============
  {
    name: 'list_agent_publishers',
    description: 'List active publishers in the agent store',
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
    description: 'Get details about a specific publisher including pricing info by slug',
    category: 'Marketplace',
    parameters: {
      slug: { type: 'string', required: true }
    }
  },
  {
    name: 'suggest_for_task',
    description: 'Get publisher and agent recommendations for a task',
    category: 'Marketplace',
    parameters: {
      query: { type: 'string', required: true, description: 'The task to find publishers for' },
      type: { type: 'string', required: false, description: 'publisher, agent, or both' },
      limit: { type: 'integer', required: false }
    }
  },
  {
    name: 'execute_paid_query',
    description: 'Execute a paid SQL query against a publisher\'s database',
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
    description: 'Execute a paid API request against a publisher\'s endpoint',
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
    name: 'execute_paid_api_stream',
    description: 'Execute a paid streaming API request against a publisher\'s endpoint',
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
  {
    name: 'get_supported',
    description: 'Get supported payment protocols and configuration',
    category: 'Marketplace',
    parameters: {}
  },

  // ============ Publishers (Admin) ============
  {
    name: 'create_publisher',
    description: 'Create a new publisher in the agent store',
    category: 'Publishers',
    parameters: {
      name: { type: 'string', required: true, description: 'Publisher display name' },
      slug: { type: 'string', required: true, description: 'URL-friendly slug' },
      wallet_address: { type: 'string', required: true, description: 'Wallet address for payments' },
      wallet_network_id: { type: 'string', required: true, description: 'Network ID (CAIP-2 format)' }
    }
  },
  {
    name: 'update_publisher',
    description: 'Update an existing publisher\'s details',
    category: 'Publishers',
    parameters: {
      slug: { type: 'string', required: true },
      name: { type: 'string', required: false },
      description: { type: 'string', required: false },
      is_active: { type: 'boolean', required: false }
    }
  },
  {
    name: 'update_publisher_pricing',
    description: 'Update a publisher\'s pricing configuration',
    category: 'Publishers',
    parameters: {
      slug: { type: 'string', required: true },
      price_per_call: { type: 'string', required: false, description: 'Price per API call (decimal string)' },
      base_price_per_1000_rows: { type: 'string', required: false },
      min_charge: { type: 'string', required: false },
      max_charge: { type: 'string', required: false }
    }
  },
  {
    name: 'upload_publisher_logo',
    description: 'Upload a logo image for a publisher',
    category: 'Publishers',
    parameters: {
      slug: { type: 'string', required: true },
      logo: { type: 'string', required: true, description: 'Base64 encoded image' },
      content_type: { type: 'string', required: true, description: 'image/png, image/jpeg, etc.' }
    }
  },

  // ============ Agent Templates ============
  {
    name: 'list_agent_templates',
    description: 'List available agent templates in the catalog',
    category: 'Templates',
    parameters: {
      search: { type: 'string', required: false },
      language: { type: 'string', required: false, description: 'python, typescript, rust' },
      limit: { type: 'integer', required: false },
      offset: { type: 'integer', required: false }
    }
  },
  {
    name: 'get_agent_template',
    description: 'Get details about a specific agent template by slug',
    category: 'Templates',
    parameters: {
      slug: { type: 'string', required: true }
    }
  },
  {
    name: 'invoke_agent_template',
    description: 'Invoke an agent template with input data',
    category: 'Templates',
    parameters: {
      slug: { type: 'string', required: true },
      input: { type: 'object', required: true, description: 'Input data for the template' },
      confirm: { type: 'boolean', required: false, default: false }
    }
  },

  // ============ Payments ============
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
  },
  {
    name: 'get_x402_deposit_requirements',
    description: 'Get x402 on-chain deposit requirements for depositing USDC',
    category: 'Payments',
    parameters: {
      publisher: { type: 'string', required: true },
      amount: { type: 'string', required: true, description: 'Amount to deposit (decimal string)' },
      agent_wallet: { type: 'string', required: true, description: 'Agent wallet address' }
    }
  },

  // ============ Wallet ============
  {
    name: 'get_wallet_status',
    description: 'Get complete wallet status including SerenBucks and on-chain USDC balance',
    category: 'Wallet',
    parameters: {}
  },
  {
    name: 'has_local_wallet',
    description: 'Check if a local wallet is configured',
    category: 'Wallet',
    parameters: {}
  },
  {
    name: 'get_local_wallet_address',
    description: 'Get the local wallet address (requires WALLET_PRIVATE_KEY)',
    category: 'Wallet',
    parameters: {}
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

// Category display order - marketplace/payments first, then database management
const CATEGORY_ORDER = [
  'Marketplace',
  'Publishers',
  'Templates',
  'Payments',
  'Wallet',
  'Projects',
  'Databases',
  'Branches',
  'SQL',
  'Schema',
  'Endpoints',
  'Roles',
  'Connection',
  'Organizations'
];

function sortCategories(categories) {
  return Object.entries(categories).sort(([a], [b]) => {
    const aIndex = CATEGORY_ORDER.indexOf(a);
    const bIndex = CATEGORY_ORDER.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
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

## Available Tools (${MCP_TOOLS.length})

`;

  for (const [category, tools] of sortCategories(categories)) {
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
  <p>Once installed, you'll have access to <a href="/mcp/tools.html">${MCP_TOOLS.length} tools</a> for:</p>
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

  const sortedCats = sortCategories(categories);
  const categoryNav = sortedCats.map(([cat, tools]) =>
    `<a href="#${cat.toLowerCase()}">${cat} (${tools.length})</a>`
  ).join(' · ');

  const toolsHtml = sortedCats.map(([category, tools]) => `
    <h2 id="${category.toLowerCase()}">${category} <span style="font-size: 0.6em; color: #666;">(${tools.length} tools)</span></h2>
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
      line-height: 1.8;
    }
    .category-nav a { margin-right: 0.5rem; white-space: nowrap; }
  </style>
</head>
<body>
  <h1>Seren MCP Tools Reference</h1>
  <p>${toolsJson.tools.length} tools across ${Object.keys(categories).length} categories for managing databases and querying the agent marketplace.</p>

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
