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

> Pay Per Call Agentic Commerce for public and private data

SerenAI provides serverless Postgres databases with pay-per-query access for AI agents. Agents can discover and query publisher databases using SerenBucks micropayments.

## Quick Links

- [API Documentation](https://docs.serendb.com/)
- [MCP Server](https://docs.serendb.com/mcp/)
- [Getting Started](https://docs.serendb.com/guides/quickstart)

## Core Concepts

- **Projects**: Isolated database environments with branching support
- **Branches**: Git-like database branching for dev/prod isolation
- **Endpoints**: Compute instances that serve database connections
- **Publishers**: Data providers in the agent marketplace
- **SerenBucks**: Prepaid credits for pay-per-query access (1 SB = $1 USD)

## Authentication

All API requests require authentication via API key:

\`\`\`
Authorization: Bearer seren_live_xxxxx
\`\`\`

## Base URL

\`\`\`
https://api.serendb.com
\`\`\`

## Key Endpoints

### Projects
- \`POST /projects\` - Create a new project
- \`GET /projects\` - List all projects
- \`GET /projects/{project_id}\` - Get project details
- \`DELETE /projects/{project_id}\` - Delete a project

### Branches
- \`POST /projects/{project_id}/branches\` - Create branch
- \`GET /projects/{project_id}/branches\` - List branches
- \`GET /projects/{project_id}/branches/{branch_id}\` - Get branch details

### SQL Execution
- \`POST /projects/{project_id}/branches/{branch_id}/sql\` - Execute SQL query
- \`POST /projects/{project_id}/branches/{branch_id}/sql/transaction\` - Execute SQL transaction

### Agent Marketplace
- \`GET /agent/publishers\` - List available data publishers
- \`POST /agent/publishers\` - Create a new publisher (API key auth)
- \`GET /agent/publishers/{slug}\` - Get publisher details
- \`POST /agent/query\` - Execute paid query against publisher
- \`GET /agent/balance\` - Check SerenBucks balance
- \`POST /agent/deposit\` - Deposit SerenBucks via Stripe checkout

### Endpoints (Compute)
- \`POST /projects/{project_id}/branches/{branch_id}/endpoints\` - Create endpoint
- \`GET /projects/{project_id}/branches/{branch_id}/endpoints\` - List endpoints
- \`POST /projects/{project_id}/branches/{branch_id}/endpoints/{endpoint_id}/start\` - Start endpoint
- \`POST /projects/{project_id}/branches/{branch_id}/endpoints/{endpoint_id}/suspend\` - Suspend endpoint

## Response Format

All responses are JSON. Successful responses include the requested data. Errors follow this format:

\`\`\`json
{
  "error": {
    "code": "error_code",
    "message": "Human readable message"
  }
}
\`\`\`

## Rate Limits

- Standard: 100 requests/minute
- SQL execution: 60 queries/minute
- Agent marketplace: Pay-per-query (no artificial limits)

## Optional

- [Full API Reference](/llms-full.txt)
- [MCP Tool Schemas](/mcp/tools.json)
- [OpenAPI Specification](https://api.serendb.com/openapi.json)
`;
}

function generateFullLlmsTxt(spec) {
  const paths = spec.paths || {};
  const schemas = spec.components?.schemas || {};

  let content = `# SerenAI - Full API Reference

> Pay Per Call Agentic Commerce for public and private data

This is the complete API reference for SerenAI. For a condensed overview, see [/llms.txt](/llms.txt).

## Base URL

\`\`\`
https://api.serendb.com
\`\`\`

## Authentication

All requests require an API key in the Authorization header:

\`\`\`
Authorization: Bearer seren_live_xxxxx
\`\`\`

---

## Endpoints

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

  // Output by tag
  for (const [tag, operations] of Object.entries(taggedPaths).sort()) {
    content += `### ${tag}\n\n`;

    for (const op of operations) {
      content += `#### \`${op.method} ${op.path}\`\n\n`;

      if (op.summary) {
        content += `${op.summary}\n\n`;
      }

      if (op.description && op.description !== op.summary) {
        content += `${op.description}\n\n`;
      }

      // Parameters
      if (op.parameters.length > 0) {
        content += `**Parameters:**\n\n`;
        for (const param of op.parameters) {
          const required = param.required ? ' (required)' : '';
          const type = param.schema?.type || 'string';
          content += `- \`${param.name}\` (${param.in}, ${type}${required}): ${param.description || ''}\n`;
        }
        content += '\n';
      }

      // Request body
      if (op.requestBody) {
        const jsonContent = op.requestBody.content?.['application/json'];
        if (jsonContent?.schema) {
          content += `**Request Body:** See schema in OpenAPI spec\n\n`;
        }
      }

      // Responses
      const successCodes = Object.keys(op.responses).filter(c => c.startsWith('2'));
      if (successCodes.length > 0) {
        content += `**Success Response:** ${successCodes.join(', ')}\n\n`;
      }

      content += '---\n\n';
    }
  }

  // Add key schemas
  content += `## Key Schemas

### Project

A project is an isolated database environment.

\`\`\`json
{
  "id": "uuid",
  "name": "string",
  "region": "string",
  "created_at": "timestamp",
  "default_branch_id": "uuid"
}
\`\`\`

### Branch

A branch represents a point-in-time copy of your database.

\`\`\`json
{
  "id": "uuid",
  "project_id": "uuid",
  "name": "string",
  "parent_branch_id": "uuid | null",
  "created_at": "timestamp"
}
\`\`\`

### Endpoint

An endpoint is a compute instance serving database connections.

\`\`\`json
{
  "id": "uuid",
  "branch_id": "uuid",
  "status": "running | suspended | starting",
  "host": "string",
  "autoscaling_min": "integer",
  "autoscaling_max": "integer"
}
\`\`\`

### Publisher

A data publisher in the agent marketplace.

\`\`\`json
{
  "id": "uuid",
  "slug": "string",
  "name": "string",
  "description": "string",
  "price_per_query": "decimal",
  "categories": ["string"]
}
\`\`\`

---

For the complete OpenAPI specification, see: https://api.serendb.com/openapi.json
`;

  return content;
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
