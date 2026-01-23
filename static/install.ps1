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
$MissingDeps = @{}

function Read-JsonConfig {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return @{}
    }

    try {
        # Read raw bytes to detect and strip BOM
        $Bytes = [System.IO.File]::ReadAllBytes($Path)
        $Content = $null

        # Check for UTF-8 BOM (EF BB BF) and strip it
        if ($Bytes.Length -ge 3 -and $Bytes[0] -eq 0xEF -and $Bytes[1] -eq 0xBB -and $Bytes[2] -eq 0xBF) {
            Write-Host "  Repairing BOM-corrupted config..."
            $Content = [System.Text.Encoding]::UTF8.GetString($Bytes, 3, $Bytes.Length - 3)
        } else {
            $Content = [System.Text.Encoding]::UTF8.GetString($Bytes)
        }

        if ([string]::IsNullOrWhiteSpace($Content)) {
            return @{}
        }

        return $Content | ConvertFrom-Json -AsHashtable
    } catch {
        Write-Host "  Warning: Invalid JSON, creating new config"
        return @{}
    }
}

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

    # Load or create config (auto-repairs BOM-corrupted files)
    $Config = Read-JsonConfig -Path $ConfigPath

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

    # Write UTF-8 without BOM (PowerShell 5.1's -Encoding UTF8 adds BOM which breaks JSON parsers)
    $JsonContent = $Config | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($ConfigPath, $JsonContent, [System.Text.UTF8Encoding]::new($false))
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
        Write-Host "⚠ Claude Desktop requires Node.js"
        Write-Host "  Attempting to install Node.js via winget..."

        # Try to install Node.js using winget
        $WingetExists = $null
        try {
            $WingetExists = Get-Command winget -ErrorAction SilentlyContinue
        } catch {}

        if ($WingetExists) {
            try {
                winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements 2>$null

                # Refresh PATH to pick up newly installed Node.js
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

                # Check if Node.js is now available
                $NodeVersion = $null
                try {
                    $NodeVersion = node --version 2>$null
                } catch {}

                if ($NodeVersion) {
                    Write-Host "  ✓ Node.js $NodeVersion installed successfully"
                } else {
                    Write-Host "  ⚠ Node.js installed but requires terminal restart"
                    Write-Host "    Close and reopen PowerShell, then re-run installer"
                    $script:MissingDeps["Claude-Desktop"] = "Terminal restart"
                    return $true
                }
            } catch {
                Write-Host "  ✗ Winget installation failed"
                $script:MissingDeps["Claude-Desktop"] = "Node.js"
                return $true
            }
        } else {
            Write-Host "  ✗ Winget not available (requires Windows 10+)"
            Write-Host "    Install Node.js manually from: https://nodejs.org/"
            $script:MissingDeps["Claude-Desktop"] = "Node.js"
            return $true
        }
    }

    Write-Host "Configuring Claude Desktop..."

    # Backup existing config
    if (Test-Path $ConfigPath) {
        $BackupPath = "$ConfigPath.backup.$([DateTimeOffset]::Now.ToUnixTimeSeconds())"
        Copy-Item $ConfigPath $BackupPath
        Write-Host "  Backed up to: $BackupPath"
    }

    # Load or create config (auto-repairs BOM-corrupted files)
    $Config = Read-JsonConfig -Path $ConfigPath

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

    # Write UTF-8 without BOM (PowerShell 5.1's -Encoding UTF8 adds BOM which breaks JSON parsers)
    $JsonContent = $Config | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($ConfigPath, $JsonContent, [System.Text.UTF8Encoding]::new($false))
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

function Configure-OpenCode {
    $ConfigPath = "$env:USERPROFILE\.config\opencode\opencode.json"
    $ConfigDir = Split-Path -Parent $ConfigPath

    # Check if client is installed (config directory exists)
    if (-not (Test-Path $ConfigDir)) {
        return $false
    }

    Write-Host "Configuring OpenCode..."

    # Backup existing config
    if (Test-Path $ConfigPath) {
        $BackupPath = "$ConfigPath.backup.$([DateTimeOffset]::Now.ToUnixTimeSeconds())"
        Copy-Item $ConfigPath $BackupPath
        Write-Host "  Backed up to: $BackupPath"
    }

    # Load or create config (auto-repairs BOM-corrupted files)
    $Config = Read-JsonConfig -Path $ConfigPath

    # Add schema if not present
    if (-not $Config.ContainsKey('$schema')) {
        $Config['$schema'] = "https://opencode.ai/config.json"
    }

    if (-not $Config.ContainsKey('mcp')) {
        $Config['mcp'] = @{}
    }

    if ($Config['mcp'].ContainsKey('seren')) {
        Write-Host "  Already configured, skipping"
        $script:Skipped += "OpenCode"
        return $true
    }

    # OpenCode uses type: "remote" NOT transport: "streamable-http"
    $Config['mcp']['seren'] = @{
        type = "remote"
        url = "https://mcp.serendb.com/mcp"
        enabled = $true
    }

    # Ensure directory exists
    if (-not (Test-Path $ConfigDir)) {
        New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
    }

    # Write UTF-8 without BOM (PowerShell 5.1's -Encoding UTF8 adds BOM which breaks JSON parsers)
    $JsonContent = $Config | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($ConfigPath, $JsonContent, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  ✓ Configured successfully"
    $script:Configured += "OpenCode"
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
        claude mcp add seren --url "https://mcp.serendb.com/mcp" --transport streamable-http --scope user 2>$null
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
Configure-OpenCode | Out-Null
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

if ($MissingDeps.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠ Action required:"
    foreach ($client in $MissingDeps.Keys) {
        $dep = $MissingDeps[$client]
        Write-Host "  $client - $dep"
        if ($dep -eq "Node.js") {
            Write-Host "    Install from: https://nodejs.org/"
        } elseif ($dep -eq "Terminal restart") {
            Write-Host "    Close PowerShell and reopen, then re-run installer"
        }
    }
    if ($MissingDeps.Values -contains "Node.js") {
        Write-Host ""
        Write-Host "  After installing dependencies, re-run this installer."
    }
}

if (($Configured.Count -eq 0) -and ($Skipped.Count -eq 0) -and ($MissingDeps.Count -eq 0)) {
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
Write-Host "=============================="
Write-Host "Setup complete!"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Restart Claude Desktop"
Write-Host "  2. A browser will open to sign in to Seren"
Write-Host "  3. After sign-in, Seren tools will be available"
Write-Host ""
Write-Host "Documentation: https://docs.serendb.com/mcp/"
