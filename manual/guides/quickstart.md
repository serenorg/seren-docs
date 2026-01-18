# Getting Started with SerenAI

This guide will help you get started with SerenAI, the serverless Postgres platform with pay-per-query access for AI agents.

## Prerequisites

- A SerenAI account (sign up at [serendb.com](https://serendb.com))
- An API key (generate one from your dashboard)

## Step 1: Install the CLI (Optional)

```bash
# Using cargo
cargo install seren-cli

# Or download the binary from releases
curl -sSL https://serendb.com/install.sh | sh
```

## Step 2: Authenticate

```bash
# Set your API key
export SEREN_API_KEY=seren_live_xxxxx

# Or login interactively
seren auth login
```

## Step 3: Create Your First Project

```bash
# Create a new project
seren projects create --name my-first-project --region us-east-1

# List your projects
seren projects list
```

## Step 4: Create a Branch

```bash
# Create a development branch
seren branches create --project <project-id> --name dev
```

## Step 5: Run SQL Queries

```bash
# Execute a query
seren sql --project <project-id> --branch <branch-id> \
  "SELECT version()"
```

## Using the REST API

All operations are also available via the REST API:

```bash
# Create a project
curl -X POST https://api.serendb.com/projects \
  -H "Authorization: Bearer seren_live_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-project", "region": "us-east-1"}'
```

## Next Steps

- [Install Seren MCP](/guides/mcp-install.html) - Connect your AI assistant in 90 seconds
- [Explore the Agent Marketplace](/guides/marketplace.html) - Query public datasets with SerenBucks
- [MCP Tools Reference](/mcp/) - Available MCP tools
- [API Reference](/) - Complete REST API documentation
