# Apply every migration and the seed to a throwaway Postgres container, then run
# the cross-tenant isolation checks against it.
#
#   npm run db:verify
#
# This exists because `supabase start` cannot run on every machine (see
# DECISIONS.md D-016), and because schema correctness should be checkable without
# the whole Supabase stack. It needs only Docker and the supabase/postgres image.
#
# What it does NOT cover: anything requiring GoTrue or PostgREST -- real JWT
# issuance, password sign-in, the REST layer. Those are covered by
# `npm run test:integration` against a real Supabase.

# NOTE: deliberately NOT "Stop". Windows PowerShell turns any stderr line from a
# native command into a NativeCommandError, and psql writes NOTICE to stderr --
# which would abort this script on a harmless "extension already exists". Errors
# are detected through $LASTEXITCODE instead.
$ErrorActionPreference = "Continue"

$Container = "zisriq-verify"
$Image     = "public.ecr.aws/supabase/postgres:17.6.1.167"
$Repo      = Split-Path $PSScriptRoot -Parent
$Failed    = $false

function Invoke-SqlFile($file, $label, $quiet) {
  $opts = if ($quiet) { "--client-min-messages=warning" } else { "" }
  $out = Get-Content $file -Raw -Encoding utf8 |
    docker exec -i -e PGCLIENTENCODING=UTF8 -e PGOPTIONS=$opts `
      $Container psql -U supabase_admin -d postgres -q -v ON_ERROR_STOP=1 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: $label" -ForegroundColor Red
    $out | Where-Object { $_ -match 'ERROR|LINE' } | Select-Object -First 8 |
      ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    return $false
  }
  return $true
}

try {
  docker rm -f $Container 2>$null | Out-Null
  Write-Host "Starting throwaway Postgres..." -ForegroundColor Cyan
  docker run -d --name $Container -e POSTGRES_PASSWORD=postgres $Image 2>&1 | Out-Null

  $ready = $false
  foreach ($i in 1..40) {
    Start-Sleep -Seconds 3
    docker exec $Container pg_isready -U postgres 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  }
  if (-not $ready) { Write-Host "Postgres never became ready" -ForegroundColor Red; exit 1 }

  Write-Host "Applying bootstrap shim..." -ForegroundColor Cyan
  if (-not (Invoke-SqlFile "$Repo\tests\sql\bootstrap-bare-postgres.sql" "bootstrap" $true)) { exit 1 }

  Write-Host "Applying migrations..." -ForegroundColor Cyan
  foreach ($f in (Get-ChildItem "$Repo\supabase\migrations" -Filter *.sql | Sort-Object Name)) {
    if (-not (Invoke-SqlFile $f.FullName $f.Name $true)) { exit 1 }
    Write-Host ("  ok  " + $f.Name) -ForegroundColor DarkGray
  }

  Write-Host "Applying seed..." -ForegroundColor Cyan
  if (-not (Invoke-SqlFile "$Repo\supabase\seed.sql" "seed" $true)) { exit 1 }

  Write-Host "`nCross-tenant isolation checks..." -ForegroundColor Cyan
  # No PGOPTIONS here: the PASS/FAIL lines are raised as NOTICE.
  $raw = Get-Content "$Repo\tests\sql\verify-rls.sql" -Raw -Encoding utf8 |
    docker exec -i -e PGCLIENTENCODING=UTF8 $Container psql -U supabase_admin -d postgres -q 2>&1

  $lines = ($raw | Out-String) -split "`n" |
    ForEach-Object { ($_ -replace '^(NOTICE|WARNING):\s+','').TrimEnd() } |
    Where-Object { $_ -match '^(PASS|FAIL|---|ERROR:)' }

  foreach ($l in $lines) {
    if     ($l -match '^(FAIL|ERROR:)') { Write-Host $l -ForegroundColor Red }
    elseif ($l -match '^---')           { Write-Host "`n$l" -ForegroundColor Cyan }
    else                                { Write-Host $l -ForegroundColor Green }
  }

  $failures = @($lines | Where-Object { $_ -match '^(FAIL|ERROR:)' }).Count
  $passes   = @($lines | Where-Object { $_ -match '^PASS' }).Count

  Write-Host ""
  if ($failures -gt 0) {
    Write-Host "$passes passed, $failures FAILED" -ForegroundColor Red
    $Failed = $true
  } else {
    Write-Host "$passes checks passed, 0 failed" -ForegroundColor Green
  }
}
finally {
  docker rm -f $Container 2>$null | Out-Null
}

if ($Failed) { exit 1 }
