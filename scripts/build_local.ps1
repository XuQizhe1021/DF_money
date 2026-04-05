$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "[M4] Start local build and checks..."

if (-not (Test-Path ".venv")) {
  python -m venv .venv
}

& ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt
& ".\.venv\Scripts\python.exe" -m pytest -q

Set-Location (Join-Path $root "frontend")
npm install
npm run typecheck
npm run build

Set-Location $root
Write-Host "[M4] Build finished: backend tests passed, frontend typecheck and build passed."
