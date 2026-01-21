# Create a Publisher {#create-publisher}

Complete guide to creating publishers on the Seren marketplace with full request schemas and curl examples.

## Overview {#overview}

Publishers are data providers in the Seren marketplace. They can expose:
- **Databases** - SQL-queryable data (SerenDB, Neon, Supabase)
- **APIs** - HTTP endpoints with pay-per-call pricing
- **MCP Servers** - Model Context Protocol tools and resources

## CreatePublisherRequest Schema {#schema}

The complete schema for creating a publisher:

```json
{
  "name": "string (required)",
  "slug": "string (required) - URL-friendly identifier",
  "wallet_address": "string (required) - 0x... Ethereum address for payments",
  "wallet_network_id": "string (required) - CAIP-2 format, e.g., 'eip155:8453' for Base",

  "description": "string - Publisher description",
  "logo_url": "string - URL to publisher logo",
  "categories": ["string"] - e.g., ["blockchain", "defi"],
  "capabilities": ["string"] - e.g., ["web_scraping", "ai_search"],
  "use_cases": ["string"] - Human-readable use case descriptions,

  "source_type": "string - 'serendb' | 'neon' | 'supabase' | 'api'",
  "billing_model": "string - 'x402_per_request' | 'prepaid_credits' | 'x402_passthrough'",

  "api_url": "string - External API URL (for api source_type)",
  "api_key_header": "string - Header name for API key injection",
  "api_key_query_param": "string - Query param for API key injection",
  "upstream_api_key": "string - API key for upstream service (encrypted)",

  "project_id": "uuid - SerenDB project ID (for serendb source_type)",
  "branch_id": "uuid - SerenDB branch ID (for serendb source_type)",
  "database_name": "string - Database name (default: 'serendb')",

  "base_price_per_1000_rows": "decimal string - e.g., '0.001'",
  "price_per_call": "decimal string - e.g., '0.01'",
  "price_per_get": "decimal string",
  "price_per_post": "decimal string",
  "price_per_put": "decimal string",
  "price_per_patch": "decimal string",
  "price_per_delete": "decimal string",

  "resource_name": "string - Display name for the resource",
  "resource_description": "string - Description of what the resource provides"
}
```

## Quick Start Examples {#quick-start}

### Create an API Publisher {#create-api-publisher}

For integrating an external REST API:

```bash
curl -X POST "https://api.serendb.com/agent/publishers" \
  -H "Authorization: Bearer $SEREN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Weather API",
    "slug": "my-weather-api",
    "description": "Real-time weather data for any location",
    "wallet_address": "0x83334ef0C6f6396413C508A7762741e9FD8B20E9",
    "wallet_network_id": "eip155:8453",
    "source_type": "api",
    "api_url": "https://api.weather-service.com",
    "api_key_header": "X-API-Key",
    "upstream_api_key": "your-weather-api-key",
    "billing_model": "x402_per_request",
    "price_per_call": "0.001",
    "categories": ["weather", "data"],
    "capabilities": ["weather_lookup", "forecast"],
    "use_cases": ["Get current weather for a city", "Retrieve 7-day forecast"]
  }'
```

### Create a Database Publisher {#create-database-publisher}

For exposing a SerenDB database:

```bash
curl -X POST "https://api.serendb.com/agent/publishers" \
  -H "Authorization: Bearer $SEREN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Crypto Market Data",
    "slug": "crypto-market-data",
    "description": "Historical and real-time cryptocurrency price data",
    "wallet_address": "0x83334ef0C6f6396413C508A7762741e9FD8B20E9",
    "wallet_network_id": "eip155:8453",
    "source_type": "serendb",
    "project_id": "your-project-uuid",
    "branch_id": "your-branch-uuid",
    "database_name": "crypto_db",
    "billing_model": "prepaid_credits",
    "base_price_per_1000_rows": "0.01",
    "categories": ["blockchain", "finance"],
    "capabilities": ["sql_query", "historical_data"]
  }'
```

### Create an MCP Publisher {#create-mcp-publisher}

For exposing an MCP server (see [MCP Publishers Guide](mcp-publishers.html) for details):

```bash
curl -X POST "https://api.serendb.com/agent/publishers" \
  -H "Authorization: Bearer $SEREN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI Analysis Tools",
    "slug": "ai-analysis-tools",
    "description": "Machine learning analysis tools via MCP",
    "wallet_address": "0x83334ef0C6f6396413C508A7762741e9FD8B20E9",
    "wallet_network_id": "eip155:8453",
    "source_type": "api",
    "api_url": "https://mcp.example.com/mcp",
    "billing_model": "x402_per_request",
    "price_per_call": "0.05",
    "categories": ["ai", "analysis"]
  }'
```

## Configure Pricing {#configure-pricing}

After creating a publisher, configure detailed pricing:

```bash
curl -X PUT "https://api.serendb.com/agent/publishers/my-weather-api/pricing" \
  -H "Authorization: Bearer $SEREN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "price_per_call": "0.001",
    "price_per_get": "0.0005",
    "price_per_post": "0.002",
    "min_charge": "0.0001",
    "max_charge": "1.00",
    "prepaid_enabled": true,
    "onchain_enabled": true
  }'
```

### Pricing Fields {#pricing-fields}

| Field | Type | Description |
|-------|------|-------------|
| `price_per_call` | decimal | Default price per API call |
| `price_per_get` | decimal | Price for GET requests |
| `price_per_post` | decimal | Price for POST requests |
| `price_per_put` | decimal | Price for PUT requests |
| `price_per_patch` | decimal | Price for PATCH requests |
| `price_per_delete` | decimal | Price for DELETE requests |
| `base_price_per_1000_rows` | decimal | Price per 1000 rows (database publishers) |
| `min_charge` | decimal | Minimum charge per request |
| `max_charge` | decimal | Maximum charge per request |
| `prepaid_enabled` | boolean | Accept SerenBucks prepaid payments |
| `onchain_enabled` | boolean | Accept on-chain x402 payments |

## Configure Endpoints {#configure-endpoints}

Document and protect specific API endpoints:

```bash
curl -X PUT "https://api.serendb.com/agent/publishers/my-weather-api" \
  -H "Authorization: Bearer $SEREN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoints": [
      {
        "method": "GET",
        "path": "/weather/current",
        "description": "Get current weather for a location",
        "query_params": [
          {"name": "city", "param_type": "string", "required": true, "description": "City name"},
          {"name": "units", "param_type": "string", "required": false, "description": "Temperature units (metric/imperial)"}
        ]
      },
      {
        "method": "GET",
        "path": "/weather/forecast",
        "description": "Get 7-day weather forecast",
        "query_params": [
          {"name": "city", "param_type": "string", "required": true},
          {"name": "days", "param_type": "integer", "required": false, "description": "Number of days (1-14)"}
        ]
      },
      {
        "method": "POST",
        "path": "/admin/*",
        "is_protected": true,
        "protection_reason": "Administrative endpoints are not exposed"
      }
    ],
    "undocumented_endpoint_policy": "allow"
  }'
```

### Endpoint Configuration Fields {#endpoint-fields}

| Field | Type | Description |
|-------|------|-------------|
| `method` | string | HTTP method (GET, POST, PUT, DELETE, PATCH) |
| `path` | string | URL path pattern, supports wildcards (e.g., `/api/*`) |
| `description` | string | Human-readable description |
| `is_protected` | boolean | Block access to this endpoint |
| `protection_reason` | string | Message shown when blocked |
| `query_params` | array | Query parameter definitions |

### Query Parameter Definition {#query-param-fields}

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Parameter name |
| `param_type` | string | Type: string, integer, boolean, number, array |
| `required` | boolean | Whether parameter is required |
| `description` | string | Parameter description |
| `example` | string | Example value |

## Upload Logo {#upload-logo}

Upload a logo for your publisher (PNG, JPEG, WebP, or SVG, max 100KB):

```bash
# Base64 encode your logo
LOGO_BASE64=$(base64 -i logo.png)

curl -X PUT "https://api.serendb.com/agent/publishers/my-weather-api/logo" \
  -H "Authorization: Bearer $SEREN_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"logo\": \"$LOGO_BASE64\",
    \"content_type\": \"image/png\"
  }"
```

## Update Publisher Metadata {#update-metadata}

Update resource name and description:

```bash
curl -X PUT "https://api.serendb.com/agent/publishers/my-weather-api" \
  -H "Authorization: Bearer $SEREN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "resource_name": "Weather API",
    "resource_description": "Real-time and forecast weather data from 200+ countries",
    "categories": ["weather", "data", "forecast"],
    "capabilities": ["current_weather", "forecast", "historical"],
    "use_cases": [
      "Get current weather conditions",
      "Retrieve multi-day forecasts",
      "Access historical weather data"
    ]
  }'
```

## Complete Example: End-to-End Publisher Setup {#complete-example}

Here's a complete script to create and configure a publisher:

```bash
#!/bin/bash
# create-my-publisher.sh

SEREN_API_KEY="${SEREN_API_KEY:?Set SEREN_API_KEY environment variable}"

# 1. Create the publisher
echo "Creating publisher..."
curl -X POST "https://api.serendb.com/agent/publishers" \
  -H "Authorization: Bearer $SEREN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Financial News API",
    "slug": "financial-news-api",
    "description": "Real-time financial news and market sentiment analysis",
    "wallet_address": "0x83334ef0C6f6396413C508A7762741e9FD8B20E9",
    "wallet_network_id": "eip155:8453",
    "source_type": "api",
    "api_url": "https://api.financial-news.com",
    "api_key_header": "Authorization",
    "upstream_api_key": "Bearer fn_live_xxx",
    "billing_model": "x402_per_request",
    "categories": ["finance", "news"],
    "capabilities": ["news_search", "sentiment_analysis"],
    "use_cases": [
      "Search financial news by ticker symbol",
      "Get market sentiment for stocks",
      "Track earnings announcements"
    ]
  }'

# 2. Configure pricing
echo "Configuring pricing..."
curl -X PUT "https://api.serendb.com/agent/publishers/financial-news-api/pricing" \
  -H "Authorization: Bearer $SEREN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "price_per_call": "0.01",
    "price_per_get": "0.005",
    "price_per_post": "0.02",
    "min_charge": "0.001",
    "prepaid_enabled": true,
    "onchain_enabled": true
  }'

# 3. Document endpoints
echo "Documenting endpoints..."
curl -X PUT "https://api.serendb.com/agent/publishers/financial-news-api" \
  -H "Authorization: Bearer $SEREN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoints": [
      {
        "method": "GET",
        "path": "/news",
        "description": "Search financial news articles",
        "query_params": [
          {"name": "ticker", "param_type": "string", "required": false, "description": "Stock ticker symbol"},
          {"name": "query", "param_type": "string", "required": false, "description": "Search keywords"},
          {"name": "limit", "param_type": "integer", "required": false, "description": "Max results (1-100)"}
        ]
      },
      {
        "method": "GET",
        "path": "/sentiment/{ticker}",
        "description": "Get market sentiment for a stock"
      },
      {
        "method": "GET",
        "path": "/earnings",
        "description": "Get upcoming earnings announcements"
      }
    ]
  }'

echo "Publisher setup complete!"
echo "View at: https://console.serendb.com/publishers/financial-news-api"
```

## Verify Your Publisher {#verify}

After creation, verify your publisher is active:

```bash
curl -s "https://api.serendb.com/agent/publishers/my-weather-api" \
  -H "Authorization: Bearer $SEREN_API_KEY" | jq
```

## Next Steps {#next-steps}

- [MCP Publishers Guide](mcp-publishers.html) - For MCP server integration
- [API Reference](https://docs.serendb.com) - Full API documentation
- [Seren Console](https://console.serendb.com) - Manage publishers and view analytics
