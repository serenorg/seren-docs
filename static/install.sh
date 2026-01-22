#!/bin/bash
set -e

# Seren MCP Universal Installer (macOS/Linux)
# Configures Seren for all detected MCP-compatible clients
# https://github.com/serenorg/seren-installer

echo "Seren MCP Universal Installer"
echo "=============================="
echo ""

# Track what we configured
CONFIGURED=""
SKIPPED=""
FAILED=""

# Check for required tools
check_requirements() {
    if ! command -v python3 &> /dev/null; then
        echo "Error: Python 3 is required but not installed."
        echo "Please install Python 3 and try again."
        exit 1
    fi
}

# Configure a JSON-based MCP client
# Args: $1=name, $2=config_path, $3=server_key (mcpServers or mcp), $4=url_key (url, serverUrl, or httpUrl)
configure_json_client() {
    local name="$1"
    local config_path="$2"
    local server_key="$3"
    local url_key="$4"
    local config_dir=$(dirname "$config_path")

    # Check if config directory exists (indicates client is installed)
    if [[ ! -d "$config_dir" ]]; then
        return 1  # Client not installed
    fi

    echo "Configuring $name..."

    # Create backup if config exists
    if [[ -f "$config_path" ]]; then
        local backup_path="${config_path}.backup.$(date +%s)"
        cp "$config_path" "$backup_path"
        echo "  Backed up to: $backup_path"
    fi

    # Configure using Python for safe JSON handling
    python3 << PYTHON_SCRIPT
import json
import os
import sys

config_path = "$config_path"
server_key = "$server_key"
url_key = "$url_key"

try:
    with open(config_path, 'r') as f:
        config = json.load(f)
except FileNotFoundError:
    config = {}
except json.JSONDecodeError:
    print("  Warning: Invalid JSON, creating new config")
    config = {}

if server_key not in config:
    config[server_key] = {}

if 'seren' in config[server_key]:
    print("  Already configured, skipping")
    sys.exit(2)  # Already configured

config[server_key]['seren'] = {
    url_key: "https://mcp.serendb.com/mcp",
    "transport": "streamable-http"
}

# Ensure directory exists
os.makedirs(os.path.dirname(config_path), exist_ok=True)

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print("  ✓ Configured successfully")
PYTHON_SCRIPT

    local result=$?
    if [[ $result -eq 0 ]]; then
        CONFIGURED="$CONFIGURED $name"
    elif [[ $result -eq 2 ]]; then
        SKIPPED="$SKIPPED $name"
    else
        FAILED="$FAILED $name"
    fi
    return 0
}

# Configure Claude Desktop (uses npx mcp-remote for stdio bridge)
configure_claude_desktop() {
    local config_path="$1"
    local config_dir=$(dirname "$config_path")

    # Check if Claude Desktop config directory exists
    if [[ ! -d "$config_dir" ]]; then
        return 1
    fi

    # Check for Node.js (required for npx/mcp-remote)
    if ! command -v node &> /dev/null; then
        echo "Skipping Claude Desktop: Node.js required but not installed"
        SKIPPED="$SKIPPED Claude-Desktop"
        return 0
    fi

    echo "Configuring Claude Desktop..."

    # Create backup if config exists
    if [[ -f "$config_path" ]]; then
        local backup_path="${config_path}.backup.$(date +%s)"
        cp "$config_path" "$backup_path"
        echo "  Backed up to: $backup_path"
    fi

    python3 << PYTHON_SCRIPT
import json
import os
import sys

config_path = "$config_path"

try:
    with open(config_path, 'r') as f:
        config = json.load(f)
except FileNotFoundError:
    config = {}
except json.JSONDecodeError:
    print("  Warning: Invalid JSON, creating new config")
    config = {}

if 'mcpServers' not in config:
    config['mcpServers'] = {}

if 'seren' in config['mcpServers']:
    print("  Already configured, skipping")
    sys.exit(2)

# Claude Desktop uses stdio mode with mcp-remote bridge
config['mcpServers']['seren'] = {
    "command": "npx",
    "args": ["-y", "mcp-remote", "https://mcp.serendb.com/mcp"]
}

os.makedirs(os.path.dirname(config_path), exist_ok=True)

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print("  ✓ Configured successfully")
PYTHON_SCRIPT

    local result=$?
    if [[ $result -eq 0 ]]; then
        CONFIGURED="$CONFIGURED Claude-Desktop"
    elif [[ $result -eq 2 ]]; then
        SKIPPED="$SKIPPED Claude-Desktop"
    else
        FAILED="$FAILED Claude-Desktop"
    fi
    return 0
}

# Configure Codex (uses TOML format)
configure_codex() {
    local config_path="$HOME/.codex/config.toml"
    local config_dir=$(dirname "$config_path")

    # Check if Codex config directory exists
    if [[ ! -d "$config_dir" ]]; then
        return 1
    fi

    echo "Configuring Codex..."

    # Check if already configured
    if [[ -f "$config_path" ]] && grep -q "\[mcp_servers.seren\]" "$config_path" 2>/dev/null; then
        echo "  Already configured, skipping"
        SKIPPED="$SKIPPED Codex"
        return 0
    fi

    # Create backup if config exists
    if [[ -f "$config_path" ]]; then
        local backup_path="${config_path}.backup.$(date +%s)"
        cp "$config_path" "$backup_path"
        echo "  Backed up to: $backup_path"
    fi

    # Append TOML config
    cat >> "$config_path" << 'TOML'

[mcp_servers.seren]
url = "https://mcp.serendb.com/mcp"
transport = "streamable-http"
enabled = true
TOML

    echo "  ✓ Configured successfully"
    CONFIGURED="$CONFIGURED Codex"
    return 0
}

# Configure OpenCode (uses type: "remote" instead of transport)
configure_opencode() {
    local config_path="$HOME/.config/opencode/opencode.json"
    local config_dir=$(dirname "$config_path")

    # Check if config directory exists (indicates client is installed)
    if [[ ! -d "$config_dir" ]]; then
        return 1  # Client not installed
    fi

    echo "Configuring OpenCode..."

    # Create backup if config exists
    if [[ -f "$config_path" ]]; then
        local backup_path="${config_path}.backup.$(date +%s)"
        cp "$config_path" "$backup_path"
        echo "  Backed up to: $backup_path"
    fi

    # Configure using Python for safe JSON handling
    python3 << PYTHON_SCRIPT
import json
import os
import sys

config_path = "$config_path"

try:
    with open(config_path, 'r') as f:
        config = json.load(f)
except FileNotFoundError:
    config = {}
except json.JSONDecodeError:
    print("  Warning: Invalid JSON, creating new config")
    config = {}

# Add schema if not present
if '\$schema' not in config:
    config['\$schema'] = "https://opencode.ai/config.json"

if 'mcp' not in config:
    config['mcp'] = {}

if 'seren' in config['mcp']:
    print("  Already configured, skipping")
    sys.exit(2)  # Already configured

# OpenCode uses type: "remote" NOT transport: "streamable-http"
config['mcp']['seren'] = {
    "type": "remote",
    "url": "https://mcp.serendb.com/mcp",
    "enabled": True
}

# Ensure directory exists
os.makedirs(os.path.dirname(config_path), exist_ok=True)

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print("  ✓ Configured successfully")
PYTHON_SCRIPT

    local result=$?
    if [[ $result -eq 0 ]]; then
        CONFIGURED="$CONFIGURED OpenCode"
    elif [[ $result -eq 2 ]]; then
        SKIPPED="$SKIPPED OpenCode"
    else
        FAILED="$FAILED OpenCode"
    fi
    return 0
}

# Configure Claude Code via CLI
configure_claude_code() {
    if ! command -v claude &> /dev/null; then
        return 1
    fi

    echo "Configuring Claude Code..."

    # Check if already configured
    if claude mcp list 2>/dev/null | grep -q "seren"; then
        echo "  Already configured, skipping"
        SKIPPED="$SKIPPED Claude-Code"
        return 0
    fi

    if claude mcp add seren --url "https://mcp.serendb.com/mcp" --transport streamable-http --scope user 2>/dev/null; then
        echo "  ✓ Configured successfully"
        CONFIGURED="$CONFIGURED Claude-Code"
    else
        echo "  Failed to configure"
        FAILED="$FAILED Claude-Code"
    fi
    return 0
}

# Main
check_requirements

echo "Detecting installed MCP clients..."
echo ""

# Detect OS for Claude Desktop path
if [[ "$OSTYPE" == "darwin"* ]]; then
    CLAUDE_DESKTOP_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
else
    CLAUDE_DESKTOP_PATH="$HOME/.config/Claude/claude_desktop_config.json"
fi

# Configure each detected client
configure_claude_code || true
configure_claude_desktop "$CLAUDE_DESKTOP_PATH" || true
configure_json_client "Cursor" "$HOME/.cursor/mcp.json" "mcpServers" "url" || true
configure_json_client "Windsurf" "$HOME/.codeium/windsurf/mcp_config.json" "mcpServers" "serverUrl" || true
configure_opencode || true
configure_json_client "Gemini CLI" "$HOME/.gemini/settings.json" "mcpServers" "httpUrl" || true
configure_codex || true

echo ""
echo "=============================="

# Report results
if [[ -n "$CONFIGURED" ]]; then
    echo "✓ Configured:$CONFIGURED"
fi

if [[ -n "$SKIPPED" ]]; then
    echo "○ Already configured:$SKIPPED"
fi

if [[ -n "$FAILED" ]]; then
    echo "✗ Failed:$FAILED"
fi

if [[ -z "$CONFIGURED" && -z "$SKIPPED" ]]; then
    echo ""
    echo "No MCP clients detected."
    echo ""
    echo "Supported clients:"
    echo "  - Claude Code (CLI)"
    echo "  - Claude Desktop"
    echo "  - Cursor"
    echo "  - Windsurf"
    echo "  - OpenCode"
    echo "  - Codex"
    echo "  - Gemini CLI"
    echo ""
    echo "Install one of these clients and run this script again."
    exit 1
fi

echo ""
echo "Next steps:"
echo "  1. Restart any configured applications"
echo "  2. Seren tools will be available automatically"
echo "  3. On first use, authenticate at serendb.com"
echo ""
echo "Documentation: https://docs.serendb.com/mcp/"
