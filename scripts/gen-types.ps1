# Regenerate Supabase TypeScript types from the LOCAL database.
# Run after every migration, and commit the result.
#
#   npm run db:types
#
# Writes UTF-8 WITHOUT a BOM: Windows PowerShell's Out-File -Encoding utf8 emits a
# BOM, which shows up as a stray character before the first `export` and trips up
# tools that read the file as plain text.
$ErrorActionPreference = "Stop"

Write-Host "Generating types from local Supabase..." -ForegroundColor Cyan
$types = npx supabase gen types typescript --local --schema public | Out-String
if (-not $types.Trim()) { Write-Error "supabase gen types produced no output. Is the local stack running?" }

[System.IO.File]::WriteAllText("$PWD\src\types\database.ts", $types, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Wrote src/types/database.ts" -ForegroundColor Green
