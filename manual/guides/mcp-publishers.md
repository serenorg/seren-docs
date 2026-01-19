# MCP Publisher Guide {#mcp-publisher-guide}

Connect your MCP (Model Context Protocol) server to the Seren marketplace and monetize your tools with micropayments.

## What are MCP Publishers? {#what-are-mcp-publishers}

MCP Publishers are a new type of integration that lets you expose an MCP server through Seren's unified marketplace. Instead of building REST APIs, you can:

- Use your existing MCP server (built with [FastMCP](https://github.com/jlowin/fastmcp), mcp-sdk, or similar)
- Get automatic payment processing via SerenBucks or x402
- Benefit from Seren's discovery and marketplace infrastructure
- Let AI agents call your tools with built-in billing

## Publisher Category Taxonomy {#publisher-category-taxonomy}

Seren uses a hierarchical taxonomy for publishers:

| Category | Subtypes | Description |
|----------|----------|-------------|
| `database` | `serendb`, `neon`, `supabase` | Database-as-a-service providers |
| `integration` | `api`, `mcp` | External service integrations |
| `compute` | `template`, `workflow`, `function` | Compute resources |

**MCP publishers use:**
- `publisher_category: "integration"`
- `integration_type: "mcp"`
- `mcp_endpoint: "https://your-server.com/mcp"` (required)

## Creating an MCP Publisher {#creating-an-mcp-publisher}

### Prerequisites {#prerequisites}

1. An MCP server with HTTP/SSE transport (Streamable HTTP)
2. A Seren organization with API key
3. A wallet address for receiving payments

### Step 1: Register Your Publisher {#step-1-register}

```bash
curl -X POST "https://api.serendb.com/agent/publishers" \
  -H "Authorization: Bearer $SEREN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My MCP Service",
    "slug": "my-mcp-service",
    "publisher_category": "integration",
    "integration_type": "mcp",
    "mcp_endpoint": "https://mcp.example.com/mcp",
    "description": "AI-powered data analysis tools",
    "wallet_address": "0x...",
    "wallet_network_id": "eip155:8453"
  }'
```

### Step 2: Configure Authentication {#step-2-configure-auth}

MCP publishers support two authentication modes:

**Option A: Static API Key**
```bash
curl -X PUT "https://api.serendb.com/agent/publishers/my-mcp-service" \
  -H "Authorization: Bearer $SEREN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "upstream_api_key": "your-mcp-server-api-key",
    "api_key_header": "Authorization"
  }'
```

**Option B: OAuth Token Exchange**
```bash
curl -X PUT "https://api.serendb.com/agent/publishers/my-mcp-service" \
  -H "Authorization: Bearer $SEREN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "token_exchange_url": "https://auth.example.com/token",
    "token_exchange_method": "POST",
    "token_exchange_mode": "header",
    "token_cache_ttl_seconds": 3600
  }'
```

### Step 3: Set Pricing {#step-3-set-pricing}

```bash
curl -X PUT "https://api.serendb.com/agent/publishers/my-mcp-service/pricing" \
  -H "Authorization: Bearer $SEREN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "price_per_call": "0.01",
    "min_charge": "0.001",
    "prepaid_enabled": true,
    "onchain_enabled": true
  }'
```

## How Agents Use Your MCP Publisher {#how-agents-use-mcp-publishers}

Once registered, AI agents can discover and use your tools:

### 1. Discover Available Tools {#discover-tools}

```
Agent: "List tools for the my-mcp-service publisher"

→ Seren calls list_mcp_tools(publisher="my-mcp-service")
→ Returns: [analyze_data, generate_report, ...]
```

### 2. Call a Tool {#call-tool}

```
Agent: "Use my-mcp-service to analyze this dataset"

→ Seren calls call_mcp_tool(
    publisher="my-mcp-service",
    tool_name="analyze_data",
    arguments={"data": [...]}
  )
→ Charges SerenBucks based on pricing
→ Returns tool result
```

### 3. Read Resources {#read-resources}

```
Agent: "Get the latest report from my-mcp-service"

→ Seren calls read_mcp_resource(
    publisher="my-mcp-service",
    uri="reports://latest"
  )
```

## MCP Server Requirements {#mcp-server-requirements}

Your MCP server must:

1. **Use HTTP/SSE transport** - Streamable HTTP is required (not stdio)
2. **Support tool listing** - Respond to `tools/list` requests
3. **Handle tool calls** - Process `tools/call` requests and return results
4. **Be publicly accessible** - Seren's gateway connects to your endpoint

### Supported MCP Capabilities {#supported-capabilities}

| Capability | Supported | Notes |
|------------|-----------|-------|
| Tools | Yes | Full support via `call_mcp_tool` |
| Resources | Yes | Full support via `read_mcp_resource` |
| Prompts | Yes | Available via MCP protocol |
| Sampling | No | Not supported in v1 |

## Example: FastMCP Server {#example-fastmcp}

Here's a minimal MCP server using [FastMCP](https://github.com/jlowin/fastmcp):

```python
from fastmcp import FastMCP

mcp = FastMCP("My Analysis Service")

@mcp.tool()
def analyze_data(data: list[float]) -> dict:
    """Analyze numerical data and return statistics."""
    return {
        "mean": sum(data) / len(data),
        "count": len(data),
        "min": min(data),
        "max": max(data)
    }

@mcp.resource("reports://latest")
def get_latest_report() -> str:
    """Get the most recent analysis report."""
    return "Latest report content..."

if __name__ == "__main__":
    mcp.run(transport="sse", port=8000)
```

Deploy this server, then register it as a Seren publisher with:
- `mcp_endpoint: "https://your-domain.com/mcp"`

## Pricing Models {#pricing-models}

MCP publishers can use flexible pricing:

| Model | Description | Use Case |
|-------|-------------|----------|
| Per-call | Fixed price per tool invocation | Simple tools |
| Per-tool | Different prices per tool | Varied complexity |
| Response-based | Price based on response size | Data-heavy tools |

Configure via `update_publisher_pricing` with your pricing strategy.

## Monitoring & Analytics {#monitoring-analytics}

Track your publisher's usage in the [Seren Console](https://console.serendb.com):

- Total tool calls
- Unique agents served
- Revenue generated
- Error rates

## Troubleshooting {#troubleshooting}

### Connection Issues {#connection-issues}

**Problem:** Seren can't reach your MCP endpoint

**Solutions:**
1. Verify `mcp_endpoint` URL is publicly accessible
2. Check firewall/security group settings
3. Ensure HTTPS is properly configured
4. Test with: `curl -v https://your-endpoint/mcp`

### Authentication Failures {#auth-failures}

**Problem:** 401/403 errors when agents call tools

**Solutions:**
1. Verify `upstream_api_key` is correct
2. Check `api_key_header` matches your server's expected header
3. For OAuth: verify `token_exchange_url` returns valid tokens

### Tool Not Found {#tool-not-found}

**Problem:** Agent can't find a specific tool

**Solutions:**
1. Verify tool is registered in your MCP server
2. Check tool name matches exactly (case-sensitive)
3. Call `list_mcp_tools` to see available tools

## Next Steps {#next-steps}

- [Full API Documentation](https://docs.serendb.com/)
- [MCP Specification](https://modelcontextprotocol.io/)
- [FastMCP Framework](https://github.com/jlowin/fastmcp)
- [Seren Console](https://console.serendb.com)
