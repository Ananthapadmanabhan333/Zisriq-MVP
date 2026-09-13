# Apply all checked-in migrations to the PRODUCTION Supabase project.
# This is the one documented command referenced by DEPLOYMENT.md.
#
#   npm run db:push:prod
#
# Requires: npx supabase login, and SUPABASE_PROJECT_REF in your environment
# (Dashboard > Project Settings > General > Reference ID).
$ErrorActionPreference = "Stop"

if (-not $env:SUPABASE_PROJECT_REF) {
  Write-Error "SUPABASE_PROJECT_REF is not set. See DEPLOYMENT.md."
}

Write-Host "Linking to project $($env:SUPABASE_PROJECT_REF)..." -ForegroundColor Cyan
npx supabase link --project-ref $env:SUPABASE_PROJECT_REF

Write-Host "`nPending migrations:" -ForegroundColor Cyan
npx supabase migration list --linked

$confirm = Read-Host "`nApply these migrations to PRODUCTION? (type 'yes')"
if ($confirm -ne "yes") { Write-Host "Aborted." -ForegroundColor Yellow; exit 1 }

npx supabase db push --linked
Write-Host "Migrations applied." -ForegroundColor Green
