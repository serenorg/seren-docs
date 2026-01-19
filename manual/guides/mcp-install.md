# Install Seren MCP Server

Get Seren running in your AI assistant in under 90 seconds. No downloads, no API keys—just connect and go.

## Universal Installer (Recommended)

One command auto-detects and configures all your installed MCP clients.

**macOS / Linux:**
```bash
curl -fsSL https://serendb.com/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://serendb.com/install.ps1 | iex
```

The installer configures: Claude Code, Claude Desktop, Cursor, Windsurf, OpenCode, Codex, and Gemini CLI.

---

## Manual Setup by Platform

If you prefer manual configuration, jump to your platform:
- [Claude Code](#claude-code) — One command
- [Cursor](#cursor) — JSON config
- [Windsurf](#windsurf) — JSON config
- [Claude Desktop](#claude-desktop) — Shell script
- [OpenCode](#opencode) — JSON config
- [Codex CLI](#codex) — CLI or TOML
- [Gemini CLI](#gemini-cli) — JSON config

---

## Claude Code

**Time: 10 seconds**

Run this command:

```bash
claude mcp add --transport http -s user seren https://mcp.serendb.com/mcp
```

Done. Seren tools are now available.

**Verify:** Run `claude mcp list` to confirm `seren` appears.

---

## Cursor

**Time: 30 seconds**

1. Open or create `~/.cursor/mcp.json`
2. Add this configuration:

```json
{
  "mcpServers": {
    "seren": {
      "url": "https://mcp.serendb.com/mcp",
      "transport": "streamable-http"
    }
  }
}
```

If the file already exists with other servers, merge the `seren` entry into the existing `mcpServers` object.

3. **Restart Cursor** to apply changes

**Verify:** Open Cursor's MCP panel to see Seren tools listed.

---

## Windsurf

**Time: 30 seconds**

1. Open or create `~/.codeium/windsurf/mcp_config.json`
2. Add this configuration:

```json
{
  "mcpServers": {
    "seren": {
      "serverUrl": "https://mcp.serendb.com/mcp",
      "transport": "streamable-http"
    }
  }
}
```

Note: Windsurf uses `serverUrl` instead of `url`.

3. **Restart Windsurf** to apply changes

**Verify:** Check Settings → Cascade → MCP Servers to confirm Seren appears.

---

## Claude Desktop

**Time: 30 seconds**

Claude Desktop cannot self-configure. Run the appropriate installer for your OS:

**macOS / Linux:**
```bash
curl -fsSL https://serendb.com/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://serendb.com/install.ps1 | iex
```

The script will:
- Back up your existing config
- Add the Seren MCP server
- Validate the JSON

**Restart Claude Desktop** after installation.

**Verify:** Ask Claude Desktop to "list Seren publishers" to confirm tools are available.

---

## OpenCode

**Time: 30 seconds**

1. Open or create `~/.config/opencode/opencode.json`
2. Add this configuration:

```json
{
  "mcp": {
    "seren": {
      "type": "remote",
      "url": "https://mcp.serendb.com/mcp",
      "transport": "streamable-http"
    }
  }
}
```

Note: OpenCode uses `mcp` instead of `mcpServers`.

3. Restart your session

---

## Codex

**Time: 20 seconds**

**Option 1: CLI command**
```bash
codex mcp add seren --url "https://mcp.serendb.com/mcp"
```

**Option 2: Config file**

Add to `~/.codex/config.toml`:
```toml
[mcp_servers.seren]
url = "https://mcp.serendb.com/mcp"
enabled = true
```

**Verify:** Run `codex mcp list` to confirm seren appears.

---

## Gemini CLI

**Time: 30 seconds**

1. Open or create `~/.gemini/settings.json`
2. Add this configuration:

```json
{
  "mcpServers": {
    "seren": {
      "httpUrl": "https://mcp.serendb.com/mcp",
      "transport": "streamable-http"
    }
  }
}
```

Note: Gemini CLI uses `httpUrl` instead of `url`.

---

## First Use: Authentication

On first use, Seren will prompt for OAuth authentication:

1. A browser window opens to `serendb.com`
2. Sign in or create a free account
3. Authorize the connection
4. Return to your AI assistant

Authentication is automatic—no API keys to copy.

---

## Available Tools

After installation, you'll have access to:

| Tool | Description |
|------|-------------|
| `list_agent_publishers` | Browse 35+ data publishers |
| `execute_paid_query` | Query publisher databases |
| `execute_paid_api` | Call publisher APIs (Firecrawl, Perplexity, etc.) |
| `get_wallet_status` | Check your SerenBucks balance |
| `list_projects` | Manage your Seren projects |
| `run_sql` | Execute SQL on your databases |

**Try it:** Ask your AI assistant to "list available Seren publishers"

---

## Troubleshooting

### "Seren tools not available"
- Verify the config file was saved to the correct path
- Restart your AI assistant / IDE
- Check for JSON syntax errors in your config

### "Connection refused"
- Verify the URL is exactly: `https://mcp.serendb.com/mcp`
- Check your network allows HTTPS connections
- Try from a different network if corporate firewall blocks it

### "Authentication failed"
- Clear your browser cache and try OAuth again
- Ensure pop-ups aren't blocked for serendb.com
- Check your internet connection

### Platform-specific

| Platform | Debug Command |
|----------|---------------|
| Claude Code | `claude mcp list` |
| Cursor | Check MCP panel in sidebar |
| Windsurf | Settings → Cascade → MCP Servers |
| Codex | `codex mcp list` |
| Claude Desktop | Restart app, check logs |

---

## Local Installation (Advanced)

For developers who need full control, offline access, or are contributing to Seren, you can run the MCP server locally.

### Install via Cargo (Rust)

```bash
# Install from crates.io
cargo install seren-mcp

# Or build from source
git clone https://github.com/serenorg/seren.git
cd seren
cargo install --path mcp
```

### Install via Docker

```bash
# Run the MCP server (HTTP mode)
docker run -p 8080:8080 ghcr.io/serenorg/seren-mcp:latest

# With environment configuration
docker run -p 8080:8080 \
  -e API_KEY="seren_..." \
  ghcr.io/serenorg/seren-mcp:latest
```

### Install via GitHub Releases

Download pre-built binaries from [GitHub Releases](https://github.com/serenorg/seren/releases):

| Platform            | Binary                          |
| ------------------- | ------------------------------- |
| macOS Apple Silicon | `seren-mcp-darwin-arm64`        |
| macOS Intel         | `seren-mcp-darwin-x86_64`       |
| Linux x86_64        | `seren-mcp-linux-x86_64`        |
| Linux ARM64         | `seren-mcp-linux-arm64`         |
| Windows x86_64      | `seren-mcp-windows-x86_64.exe`  |

```bash
# Download and install (macOS/Linux)
curl -L https://github.com/serenorg/seren/releases/latest/download/seren-mcp-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m) -o seren-mcp
chmod +x seren-mcp
sudo mv seren-mcp /usr/local/bin/
```

### Configure Local Server

**Claude Code:**

```bash
# Add local server with API key
claude mcp add seren-local seren-mcp start --env API_KEY=seren_...
```

**Manual JSON config:**

```json
{
  "mcpServers": {
    "seren-local": {
      "command": "seren-mcp",
      "args": ["start"],
      "env": {
        "API_KEY": "seren_..."
      }
    }
  }
}
```

### X402 Local Signing (Crypto Payments)

For paying with cryptocurrency instead of SerenBucks:

1. Set your wallet private key:

```bash
export WALLET_PRIVATE_KEY="0x..."
```

1. Configure spending thresholds in `~/.config/seren-mcp/signer.toml`:

```toml
# Auto-approve payments under this amount (USD)
auto_approve_limit = 0.10
```

**Security:** Your private key never leaves your device—all signing happens locally.

### Environment Variables

| Variable              | Description                      | Default                   |
| --------------------- | -------------------------------- | ------------------------- |
| `API_URL`             | Seren API base URL               | `https://api.serendb.com` |
| `API_KEY`             | Your Seren API key               | Required                  |
| `WALLET_PRIVATE_KEY`  | Ethereum key for x402 payments   | Optional                  |
| `HOST`                | Listen host                      | `0.0.0.0`                 |
| `PORT`                | Listen port                      | `3000`                    |

### Commands

```bash
# Start in stdio mode (Claude Desktop / local)
seren-mcp start

# Start in HTTP mode with bearer auth
seren-mcp start:http

# Start in HTTP mode with OAuth 2.1 (hosted)
seren-mcp start:oauth

# Show help
seren-mcp --help
```

---

## What's Next?

- [Full API Documentation](/) — REST API reference
- [MCP Tools Reference](/mcp/) — Complete tool documentation
- [Getting Started](/guides/quickstart.html) — Create your first project

## Support

- GitHub Issues: [github.com/serenorg/seren-installer/issues](https://github.com/serenorg/seren-installer/issues)
- Documentation: [docs.serendb.com](https://docs.serendb.com)
