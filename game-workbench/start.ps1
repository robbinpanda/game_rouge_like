$ErrorActionPreference = 'Stop'
$studioUrl = 'http://127.0.0.1:4180'
$studioReady = $false
try { $studioHealth = Invoke-RestMethod -Uri "$studioUrl/api/health" -TimeoutSec 2; $studioReady = $studioHealth.app -eq 'aberrant-workbench' } catch {}
if (-not $studioReady) {
    $studioNode = (Get-Command node -ErrorAction Stop).Source
    Start-Process -FilePath $studioNode -ArgumentList 'server.mjs' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'data/server.log') -RedirectStandardError (Join-Path $PSScriptRoot 'data/server-error.log')
    for ($studioAttempt = 0; $studioAttempt -lt 30; $studioAttempt++) {
        Start-Sleep -Milliseconds 200
        try { $studioHealth = Invoke-RestMethod -Uri "$studioUrl/api/health" -TimeoutSec 1; if ($studioHealth.app -eq 'aberrant-workbench') { $studioReady = $true; break } } catch {}
    }
}
if (-not $studioReady) { throw 'Studio failed to start. Check data/server-error.log and port 4180.' }
Start-Process $studioUrl
