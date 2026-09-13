# Link this repo to a Supabase Cloud project and apply the schema to it.
#
#   npm run db:setup:cloud
#
# Use this when the local Docker stack is unavailable. It targets a DEDICATED
# DEVELOPMENT project -- never a project holding real client data, because the
# reset step drops and rebuilds the public schema.
#
# Requires SUPABASE_PROJECT_REF in your environment or .env.local
# (Dashboard > Project Settings > General > Reference ID).

$ErrorActionPreference = "Stop"

function Read-EnvValue($name) {
  if ($env:$name) { return $env:$name }
  if (Test-Path ".env.local") {
    $line = Get-Content ".env.local" | Where-Object { $_ -match "^\s*$name\s*=" } | Select-Object -First 1
    if ($line) { return ($line -split "=", 2)[1].Trim().Trim('"') }
  }
  return $null
}

$ref = Read-EnvValue "SUPABASE_PROJECT_REF"
if (-not $ref) {
  Write-Error "SUPABASE_PROJECT_REF is not set (env var or .env.local). See README."
}

Write-Host "`nProject ref: $ref" -ForegroundColor Cyan
Write-Host "You will be prompted for the database password you chose when creating the project." -ForegroundColor DarkGray

npx supabase login
npx supabase link --project-ref $ref

Write-Host "`nMigrations that will be applied:" -ForegroundColor Cyan
npx supabase migration list --linked

Write-Host ""
Write-Host "WARNING: 'db reset --linked' DROPS the public schema on the remote project" -ForegroundColor Yellow
Write-Host "and re-applies every migration plus supabase/seed.sql." -ForegroundColor Yellow
Write-Host "Only continue if this project is a throwaway development project." -ForegroundColor Yellow
$confirm = Read-Host "`nType the project ref ($ref) to continue"
if ($confirm -ne $ref) { Write-Host "Aborted." -ForegroundColor Yellow; exit 1 }

npx supabase db reset --linked

Write-Host "`nRegenerating TypeScript types from the linked project..." -ForegroundColor Cyan
npx supabase gen types typescript --linked --schema public | Out-File -FilePath "src/types/database.ts" -Encoding utf8

Write-Host "`nDone. Now run: npm run test:integration" -ForegroundColor Green
