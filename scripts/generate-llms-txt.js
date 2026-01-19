#!/usr/bin/env node
// ABOUTME: Generates llms.txt and llms-full.txt from OpenAPI spec
// ABOUTME: Following llmstxt.org specification for LLM-optimized context

const fs = require('fs');
const path = require('path');

const OPENAPI_PATH = path.join(__dirname, '..', 'openapi.json');
const DIST_PATH = path.join(__dirname, '..', 'dist');

function loadOpenAPI() {
  const content = fs.readFileSync(OPENAPI_PATH, 'utf-8');
  return JSON.parse(content);
}

function generateCoreLlmsTxt(spec) {
  const info = spec.info || {};

  return `# SerenAI

> Pay-per-query data marketplace for AI agents. Discover 75+ data publishers and query them with micropayments.

SerenAI connects AI agents to data publishers. Query databases, APIs, and services from verified publishers using prepaid credits or on-chain payments. No subscriptions—pay only for what you use.

## Quick Start for AI Agents

**To query a data publisher:**

1. **Discover** - Find relevant data sources
   \`GET /agent/publishers/suggest?query=weather data for San Francisco\`

2. **Estimate cost** - Check price before executing
   \`POST /agent/estimate\` with your query

3. **Execute** - Run the paid query
   \`POST /agent/database\` for SQL queries
   \`POST /agent/api\` for HTTP API calls

4. **Check balance** - Monitor your credits
   \`GET /agent/wallet/balance\`

## Authentication

\`\`\`
Authorization: Bearer seren_live_xxxxx
\`\`\`

Base URL: \`https://api.serendb.com\`

---

## Agent Marketplace (Primary API)

Use these endpoints to discover and query data publishers.

### Discover Publishers

| Endpoint | Use When |
|----------|----------|
| \`GET /agent/publishers\` | Browse all active publishers |
| \`GET /agent/publishers/suggest?query=<task>\` | AI-powered suggestions for your task |
| \`GET /agent/publishers/{slug}\` | Get details about a specific publisher |

**Example - Find publishers for a task:**
\`\`\`
GET /agent/publishers/suggest?query=scrape website content&limit=5
\`\`\`

**Example - Search publishers:**
\`\`\`
GET /agent/publishers?search=financial&is_verified=true&limit=20
\`\`\`

### Query Publishers

| Endpoint | Use When |
|----------|----------|
| \`POST /agent/database\` | Query a publisher's database (SQL) |
| \`POST /agent/api\` | Call a publisher's HTTP API |
| \`POST /agent/stream\` | Stream large responses |
| \`POST /agent/estimate\` | Check cost before executing |

**Example - Database query:**
\`\`\`json
POST /agent/database
{
  "publisher_slug": "financial-news",
  "query": "SELECT headline, summary FROM articles WHERE topic = 'AI' ORDER BY published_at DESC LIMIT 10"
}
\`\`\`

**Example - API call:**
\`\`\`json
POST /agent/api
{
  "publisher_slug": "web-scraper",
  "method": "POST",
  "path": "/extract",
  "body": { "url": "https://example.com", "selectors": ["h1", "p"] }
}
\`\`\`

**Example - Estimate cost first:**
\`\`\`json
POST /agent/estimate
{
  "publisher_slug": "financial-news",
  "query": "SELECT * FROM articles LIMIT 100"
}
// Response: { "estimated_cost": { "amount": "0.05", "asset": "USDC" } }
\`\`\`

### Wallet & Payments

| Endpoint | Use When |
|----------|----------|
| \`GET /agent/wallet/balance\` | Check prepaid balance |
| \`POST /agent/wallet/deposit\` | Add funds via Stripe |
| \`POST /agent/deposit\` | Add funds via on-chain payment |
| \`GET /agent/wallet/transactions\` | View transaction history |

**Payment Methods:**
- **Prepaid balance**: Include \`Authorization: Bearer <token>\` header
- **On-chain (x402)**: If no auth header, returns 402 with payment instructions

### Publisher Response Format

Successful queries return:
\`\`\`json
{
  "data": { ... },
  "cost": { "amount": "0.01", "asset": "USDC" },
  "publisher": { "slug": "...", "name": "..." }
}
\`\`\`

---

## Projects & SQL Execution

For users hosting their own databases on SerenAI.

### Projects

| Endpoint | Description |
|----------|-------------|
| \`POST /projects\` | Create a new project |
| \`GET /projects\` | List your projects |
| \`GET /projects/{project_id}\` | Get project details |
| \`DELETE /projects/{project_id}\` | Delete a project |

**Example - Create project:**
\`\`\`json
POST /projects
{
  "name": "my-analytics-db",
  "region": "us-east-1"
}
\`\`\`

### SQL Execution

| Endpoint | Description |
|----------|-------------|
| \`POST /projects/{project_id}/branches/{branch_id}/sql\` | Execute SQL query |
| \`POST /projects/{project_id}/branches/{branch_id}/sql/transaction\` | Execute transaction |
| \`GET /projects/{project_id}/branches/{branch_id}/connection-string\` | Get connection string |

**Example - Execute SQL:**
\`\`\`json
POST /projects/{project_id}/branches/{branch_id}/sql
{
  "query": "SELECT * FROM users WHERE active = true",
  "params": []
}
\`\`\`

---

## Common Errors

| Code | Meaning | Solution |
|------|---------|----------|
| 402 | Payment Required | Add funds or include payment header |
| 404 | Publisher not found | Verify slug with \`GET /agent/publishers\` |
| 429 | Rate limited | Wait and retry (100 req/min standard) |
| 401 | Unauthorized | Check API key format: \`Bearer seren_live_xxx\` |

---

## Integration Options

**MCP Server** (recommended for Claude, Cursor, GPT):
\`\`\`bash
npx @anthropic/seren-mcp
\`\`\`
63 tools with type-safe parameters. See [MCP Documentation](/mcp/).

**REST API** (for custom agents):
Use the endpoints documented above with any HTTP client.

---

## Optional

- [Full API Reference](/llms-full.txt) - Complete endpoint documentation
- [MCP Tool Schemas](/mcp/tools.json) - Machine-readable tool definitions
- [OpenAPI Specification](https://api.serendb.com/openapi.json) - Full OpenAPI spec
`;
}

function generateFullLlmsTxt(spec) {
  const paths = spec.paths || {};

  let content = `# SerenAI - Full API Reference

> Pay-per-query data marketplace for AI agents. Complete endpoint documentation.

For a condensed overview, see [/llms.txt](/llms.txt).

## Base URL & Authentication

\`\`\`
Base URL: https://api.serendb.com
Authorization: Bearer seren_live_xxxxx
\`\`\`

---

`;

  // Group endpoints by tag
  const taggedPaths = {};

  for (const [pathStr, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (typeof operation !== 'object') continue;

      const tags = operation.tags || ['Other'];
      const tag = tags[0];

      if (!taggedPaths[tag]) {
        taggedPaths[tag] = [];
      }

      taggedPaths[tag].push({
        path: pathStr,
        method: method.toUpperCase(),
        summary: operation.summary || '',
        description: operation.description || '',
        operationId: operation.operationId || '',
        parameters: operation.parameters || [],
        requestBody: operation.requestBody,
        responses: operation.responses || {}
      });
    }
  }

  // Define priority order - agent-related first, then projects/SQL, then others
  const priorityTags = [
    'agent',           // Core marketplace
    'agent-wallet',    // Payments
    'templates',       // Agent templates
    'Projects',        // Database projects
    'Databases',       // SQL databases
    'Roles',           // Database roles
  ];

  // Tags to minimize (just list endpoints, less detail)
  const minimizedTags = [
    'Branches',
    'Endpoints',
    'Branch Protection',
    'Logical Replication',
    'Operations',
    'VPC',
    'IP Allow Lists'
  ];

  // Sort tags: priority first, then alphabetical, minimized last
  const sortedTags = Object.keys(taggedPaths).sort((a, b) => {
    const aIndex = priorityTags.indexOf(a);
    const bIndex = priorityTags.indexOf(b);
    const aMinimized = minimizedTags.includes(a);
    const bMinimized = minimizedTags.includes(b);

    // Minimized tags go last
    if (aMinimized && !bMinimized) return 1;
    if (!aMinimized && bMinimized) return -1;

    // Priority tags go first
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    return a.localeCompare(b);
  });

  // Output by tag with priority ordering
  for (const tag of sortedTags) {
    const operations = taggedPaths[tag];
    const isMinimized = minimizedTags.includes(tag);
    const isPriority = priorityTags.slice(0, 3).includes(tag); // agent, agent-wallet, templates

    // Section header with context
    if (tag === 'agent') {
      content += `## Agent Marketplace (Primary API)

Query data publishers with pay-per-query pricing. This is the main API for AI agents.

`;
    } else if (tag === 'agent-wallet') {
      content += `## Agent Wallet & Payments

Manage prepaid balance and payment methods.

`;
    } else if (tag === 'templates') {
      content += `## Agent Templates

Discover and invoke pre-built agent templates.

`;
    } else if (isMinimized) {
      content += `## ${tag} (Infrastructure)

`;
    } else {
      content += `## ${tag}

`;
    }

    for (const op of operations) {
      // For minimized sections, just list endpoints briefly
      if (isMinimized) {
        content += `- \`${op.method} ${op.path}\` - ${op.summary || op.description || ''}\n`;
        continue;
      }

      content += `### \`${op.method} ${op.path}\`\n\n`;

      if (op.summary) {
        content += `${op.summary}\n\n`;
      }

      if (op.description && op.description !== op.summary) {
        content += `${op.description}\n\n`;
      }

      // Parameters
      if (op.parameters.length > 0) {
        content += `**Parameters:**\n`;
        for (const param of op.parameters) {
          const required = param.required ? ' *(required)*' : '';
          const type = param.schema?.type || 'string';
          content += `- \`${param.name}\` (${type}${required}): ${param.description || ''}\n`;
        }
        content += '\n';
      }

      // Request body - try to extract schema properties for examples
      if (op.requestBody) {
        const jsonContent = op.requestBody.content?.['application/json'];
        if (jsonContent?.schema) {
          const schema = jsonContent.schema;
          const required = schema.required || [];
          const properties = schema.properties || {};

          if (Object.keys(properties).length > 0) {
            content += `**Request Body:**\n`;
            for (const [propName, propSchema] of Object.entries(properties)) {
              const isRequired = required.includes(propName) ? ' *(required)*' : '';
              const propType = propSchema.type || 'any';
              const desc = propSchema.description || '';
              content += `- \`${propName}\` (${propType}${isRequired}): ${desc}\n`;
            }
            content += '\n';

            // Add example for priority endpoints
            if (isPriority) {
              const example = generateExampleBody(op.path, op.method, properties, required);
              if (example) {
                content += `**Example:**\n\`\`\`json\n${example}\n\`\`\`\n\n`;
              }
            }
          } else {
            content += `**Request Body:** See OpenAPI spec for schema\n\n`;
          }
        }
      }

      // Responses
      const successCodes = Object.keys(op.responses).filter(c => c.startsWith('2'));
      if (successCodes.length > 0) {
        content += `**Response:** ${successCodes.join(', ')}\n\n`;
      }

      content += '---\n\n';
    }

    if (isMinimized) {
      content += '\n---\n\n';
    }
  }

  // Add key schemas focused on marketplace
  content += `## Key Schemas

### Publisher

A data publisher in the agent marketplace.

\`\`\`json
{
  "id": "uuid",
  "slug": "string (unique identifier for API calls)",
  "name": "string",
  "description": "string",
  "is_verified": "boolean",
  "pricing": {
    "asset": "USDC",
    "price_per_query": "decimal"
  },
  "categories": ["string"],
  "capabilities": ["database", "api", "streaming"]
}
\`\`\`

### Query Response

Response from \`/agent/database\` or \`/agent/api\`.

\`\`\`json
{
  "data": { "rows": [...], "columns": [...] },
  "cost": {
    "amount": "0.01",
    "asset": "USDC"
  },
  "publisher": {
    "slug": "publisher-slug",
    "name": "Publisher Name"
  }
}
\`\`\`

### Wallet Balance

Response from \`/agent/wallet/balance\`.

\`\`\`json
{
  "funded_balance": "10.50",
  "promotional_balance": "5.00",
  "total_balance": "15.50",
  "asset": "USDC"
}
\`\`\`

### Project

A database project for self-hosted data.

\`\`\`json
{
  "id": "uuid",
  "name": "string",
  "region": "us-east-1 | eu-west-1 | ...",
  "created_at": "timestamp",
  "default_branch_id": "uuid"
}
\`\`\`

---

For the complete OpenAPI specification: https://api.serendb.com/openapi.json
`;

  return content;
}

// Generate example request body for priority endpoints
function generateExampleBody(path, method, properties, required) {
  const examples = {
    '/agent/database': {
      publisher_slug: 'financial-news',
      query: 'SELECT headline, published_at FROM articles LIMIT 10'
    },
    '/agent/api': {
      publisher_slug: 'web-scraper',
      method: 'POST',
      path: '/extract',
      body: { url: 'https://example.com' }
    },
    '/agent/estimate': {
      publisher_slug: 'financial-news',
      query: 'SELECT * FROM articles WHERE category = $1',
      params: ['technology']
    },
    '/agent/deposit': {
      amount: '10.00'
    },
    '/agent/wallet/deposit': {
      amount_cents: 1000
    },
    '/agent/templates/publish': {
      name: 'my-agent-template',
      description: 'A useful agent template',
      language: 'python',
      source_code: '# template code here'
    }
  };

  // Check for path pattern matches
  if (path.includes('/agent/templates/') && path.includes('/invoke')) {
    return JSON.stringify({ input: { query: 'example input' } }, null, 2);
  }

  if (examples[path]) {
    return JSON.stringify(examples[path], null, 2);
  }

  // Generate generic example from properties
  if (Object.keys(properties).length <= 5) {
    const example = {};
    for (const [propName, propSchema] of Object.entries(properties)) {
      if (required.includes(propName) || Object.keys(properties).length <= 3) {
        example[propName] = getExampleValue(propName, propSchema);
      }
    }
    if (Object.keys(example).length > 0) {
      return JSON.stringify(example, null, 2);
    }
  }

  return null;
}

// Generate example value for a property
function getExampleValue(name, schema) {
  const type = schema.type || 'string';

  // Name-based examples
  if (name.includes('slug')) return 'example-slug';
  if (name.includes('query')) return 'SELECT * FROM table LIMIT 10';
  if (name.includes('email')) return 'user@example.com';
  if (name.includes('url')) return 'https://example.com';
  if (name.includes('name')) return 'example-name';
  if (name.includes('description')) return 'A description';
  if (name.includes('amount')) return '10.00';
  if (name.includes('limit')) return 10;
  if (name.includes('offset')) return 0;

  // Type-based examples
  if (type === 'string') return 'string';
  if (type === 'integer' || type === 'number') return 1;
  if (type === 'boolean') return true;
  if (type === 'array') return [];
  if (type === 'object') return {};

  return 'value';
}

function main() {
  console.log('Generating llms.txt files...');

  // Ensure dist directory exists
  if (!fs.existsSync(DIST_PATH)) {
    fs.mkdirSync(DIST_PATH, { recursive: true });
  }

  // Load OpenAPI spec
  let spec;
  try {
    spec = loadOpenAPI();
    console.log(`Loaded OpenAPI spec: ${spec.info?.title || 'Unknown'}`);
  } catch (err) {
    console.error(`Failed to load OpenAPI spec: ${err.message}`);
    console.log('Generating placeholder llms.txt files...');
    spec = { info: {}, paths: {}, components: { schemas: {} } };
  }

  // Generate core llms.txt
  const coreLlms = generateCoreLlmsTxt(spec);
  fs.writeFileSync(path.join(DIST_PATH, 'llms.txt'), coreLlms);
  console.log(`Generated llms.txt (${coreLlms.length} bytes)`);

  // Generate full llms.txt
  const fullLlms = generateFullLlmsTxt(spec);
  fs.writeFileSync(path.join(DIST_PATH, 'llms-full.txt'), fullLlms);
  console.log(`Generated llms-full.txt (${fullLlms.length} bytes)`);

  console.log('Done!');
}

main();
