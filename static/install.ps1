# Seren MCP Universal Installer (Windows)
# Configures Seren for all detected MCP-compatible clients
# https://github.com/serenorg/seren-installer

$ErrorActionPreference = "Stop"

Write-Host "Seren MCP Universal Installer"
Write-Host "=============================="
Write-Host ""

# Track what we configured
$Configured = @()
$Skipped = @()
$Failed = @()

function Configure-JsonClient {
    param(
        [string]$Name,
        [string]$ConfigPath,
        [string]$ServerKey,
        [string]$UrlKey
    )

    $ConfigDir = Split-Path -Parent $ConfigPath

    # Check if client is installed (config directory exists)
    if (-not (Test-Path $ConfigDir)) {
        return $false
    }

    Write-Host "Configuring $Name..."

    # Backup existing config
    if (Test-Path $ConfigPath) {
        $BackupPath = "$ConfigPath.backup.$([DateTimeOffset]::Now.ToUnixTimeSeconds())"
        Copy-Item $ConfigPath $BackupPath
        Write-Host "  Backed up to: $BackupPath"
    }

    # Load or create config
    $Config = @{}
    if (Test-Path $ConfigPath) {
        try {
            $Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json -AsHashtable
        } catch {
            Write-Host "  Warning: Invalid JSON, creating new config"
            $Config = @{}
        }
    }

    if (-not $Config.ContainsKey($ServerKey)) {
        $Config[$ServerKey] = @{}
    }

    if ($Config[$ServerKey].ContainsKey('seren')) {
        Write-Host "  Already configured, skipping"
        $script:Skipped += $Name
        return $true
    }

    $Config[$ServerKey]['seren'] = @{
        $UrlKey = "https://mcp.serendb.com/mcp"
        transport = "streamable-http"
    }

    # Ensure directory exists
    if (-not (Test-Path $ConfigDir)) {
        New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
    }

    $Config | ConvertTo-Json -Depth 10 | Set-Content $ConfigPath -Encoding UTF8
    Write-Host "  ✓ Configured successfully"
    $script:Configured += $Name
    return $true
}

function Configure-ClaudeDesktop {
    $ConfigPath = "$env:APPDATA\Claude\claude_desktop_config.json"
    $ConfigDir = Split-Path -Parent $ConfigPath

    # Check if Claude Desktop config directory exists
    if (-not (Test-Path $ConfigDir)) {
        return $false
    }

    # Check for Node.js (required for npx/mcp-remote)
    $NodeVersion = $null
    try {
        $NodeVersion = node --version 2>$null
    } catch {}

    if (-not $NodeVersion) {
        Write-Host "Skipping Claude Desktop: Node.js required but not installed"
        $script:Skipped += "Claude-Desktop"
        return $true
    }

    Write-Host "Configuring Claude Desktop..."

    # Backup existing config
    if (Test-Path $ConfigPath) {
        $BackupPath = "$ConfigPath.backup.$([DateTimeOffset]::Now.ToUnixTimeSeconds())"
        Copy-Item $ConfigPath $BackupPath
        Write-Host "  Backed up to: $BackupPath"
    }

    # Load or create config
    $Config = @{}
    if (Test-Path $ConfigPath) {
        try {
            $Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json -AsHashtable
        } catch {
            Write-Host "  Warning: Invalid JSON, creating new config"
            $Config = @{}
        }
    }

    if (-not $Config.ContainsKey('mcpServers')) {
        $Config['mcpServers'] = @{}
    }

    if ($Config['mcpServers'].ContainsKey('seren')) {
        Write-Host "  Already configured, skipping"
        $script:Skipped += "Claude-Desktop"
        return $true
    }

    # Claude Desktop uses stdio mode with mcp-remote bridge
    $Config['mcpServers']['seren'] = @{
        command = "npx"
        args = @("-y", "mcp-remote", "https://mcp.serendb.com/mcp")
    }

    if (-not (Test-Path $ConfigDir)) {
        New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
    }

    $Config | ConvertTo-Json -Depth 10 | Set-Content $ConfigPath -Encoding UTF8
    Write-Host "  ✓ Configured successfully"
    $script:Configured += "Claude-Desktop"
    return $true
}

function Configure-Codex {
    $ConfigPath = "$env:USERPROFILE\.codex\config.toml"
    $ConfigDir = Split-Path -Parent $ConfigPath

    # Check if Codex config directory exists
    if (-not (Test-Path $ConfigDir)) {
        return $false
    }

    Write-Host "Configuring Codex..."

    # Check if already configured
    if ((Test-Path $ConfigPath) -and (Select-String -Path $ConfigPath -Pattern "\[mcp_servers\.seren\]" -Quiet)) {
        Write-Host "  Already configured, skipping"
        $script:Skipped += "Codex"
        return $true
    }

    # Backup existing config
    if (Test-Path $ConfigPath) {
        $BackupPath = "$ConfigPath.backup.$([DateTimeOffset]::Now.ToUnixTimeSeconds())"
        Copy-Item $ConfigPath $BackupPath
        Write-Host "  Backed up to: $BackupPath"
    }

    # Append TOML config
    $TomlConfig = @"

[mcp_servers.seren]
url = "https://mcp.serendb.com/mcp"
transport = "streamable-http"
enabled = true
"@

    Add-Content -Path $ConfigPath -Value $TomlConfig
    Write-Host "  ✓ Configured successfully"
    $script:Configured += "Codex"
    return $true
}

function Configure-ClaudeCode {
    # Check if claude CLI is available
    $ClaudeExists = $null
    try {
        $ClaudeExists = Get-Command claude -ErrorAction SilentlyContinue
    } catch {}

    if (-not $ClaudeExists) {
        return $false
    }

    Write-Host "Configuring Claude Code..."

    # Check if already configured
    $McpList = claude mcp list 2>$null
    if ($McpList -match "seren") {
        Write-Host "  Already configured, skipping"
        $script:Skipped += "Claude-Code"
        return $true
    }

    try {
        claude mcp add --transport http -s user seren https://mcp.serendb.com/mcp 2>$null
        Write-Host "  ✓ Configured successfully"
        $script:Configured += "Claude-Code"
    } catch {
        Write-Host "  Failed to configure"
        $script:Failed += "Claude-Code"
    }
    return $true
}

# Main
Write-Host "Detecting installed MCP clients..."
Write-Host ""

# Configure each detected client
Configure-ClaudeCode | Out-Null
Configure-ClaudeDesktop | Out-Null
Configure-JsonClient -Name "Cursor" -ConfigPath "$env:USERPROFILE\.cursor\mcp.json" -ServerKey "mcpServers" -UrlKey "url" | Out-Null
Configure-JsonClient -Name "Windsurf" -ConfigPath "$env:USERPROFILE\.codeium\windsurf\mcp_config.json" -ServerKey "mcpServers" -UrlKey "serverUrl" | Out-Null
Configure-JsonClient -Name "OpenCode" -ConfigPath "$env:USERPROFILE\.config\opencode\opencode.json" -ServerKey "mcp" -UrlKey "url" | Out-Null
Configure-JsonClient -Name "Gemini CLI" -ConfigPath "$env:USERPROFILE\.gemini\settings.json" -ServerKey "mcpServers" -UrlKey "httpUrl" | Out-Null
Configure-Codex | Out-Null

Write-Host ""
Write-Host "=============================="

# Report results
if ($Configured.Count -gt 0) {
    Write-Host "✓ Configured: $($Configured -join ', ')"
}

if ($Skipped.Count -gt 0) {
    Write-Host "○ Already configured: $($Skipped -join ', ')"
}

if ($Failed.Count -gt 0) {
    Write-Host "✗ Failed: $($Failed -join ', ')"
}

if (($Configured.Count -eq 0) -and ($Skipped.Count -eq 0)) {
    Write-Host ""
    Write-Host "No MCP clients detected."
    Write-Host ""
    Write-Host "Supported clients:"
    Write-Host "  - Claude Code (CLI)"
    Write-Host "  - Claude Desktop"
    Write-Host "  - Cursor"
    Write-Host "  - Windsurf"
    Write-Host "  - OpenCode"
    Write-Host "  - Codex"
    Write-Host "  - Gemini CLI"
    Write-Host ""
    Write-Host "Install one of these clients and run this script again."
    exit 1
}

Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Restart any configured applications"
Write-Host "  2. Seren tools will be available automatically"
Write-Host "  3. On first use, authenticate at serendb.com"
Write-Host ""
Write-Host "Documentation: https://docs.serendb.com/mcp/"
