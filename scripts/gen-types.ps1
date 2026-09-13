# Regenerate Supabase TypeScript types from the LOCAL database.
# Run after every migration, and commit the result.
#
#   npm run db:types
#
$ErrorActionPreference = "Stop"
Write-Host "Generating types from local Supabase..." -ForegroundColor Cyan
npx supabase gen types typescript --local --schema public | Out-File -FilePath "src/types/database.ts" -Encoding utf8
Write-Host "Wrote src/types/database.ts" -ForegroundColor Green
