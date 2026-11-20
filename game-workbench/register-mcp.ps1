$ErrorActionPreference = 'Stop'
$studioNode = (Get-Command node -ErrorAction Stop).Source
$studioEntry = Join-Path $PSScriptRoot 'mcp.mjs'
& codex mcp add frontier-studio -- $studioNode $studioEntry
if ($LASTEXITCODE -ne 0) { throw 'MCP registration failed.' }
Write-Host 'Frontier Studio MCP registered. Reopen your Codex chat to load the tools.'
