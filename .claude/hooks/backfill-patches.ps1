# Backfill: captura patch-uri pentru commituri vechi
# Folosire: powershell -File backfill-patches.ps1 -Count 20
param([int]$Count = 10)

$repoRoot = "C:\Users\lungu\portal-phihau"
$memoryDir = "C:\Users\lungu\.claude\projects\C--Users-lungu-portal-phihau\memory\patches"
$indexFile = "$memoryDir\INDEX.md"

if (-not (Test-Path $memoryDir)) {
    New-Item -ItemType Directory -Force $memoryDir | Out-Null
}

# Citeste hash-urile deja captate din INDEX
$existingHashes = @{}
if (Test-Path $indexFile) {
    Get-Content $indexFile | ForEach-Object {
        if ($_ -match '^\d{4}-\d{2}-\d{2} \| ([a-f0-9]{7}) \|') {
            $existingHashes[$Matches[1]] = $true
        }
    }
}

# Ia ultimele N commituri (exclude primul commit)
$commits = git -C $repoRoot log --format="%H %h" -$Count | Select-Object -Skip 0
$entries = @()

foreach ($line in $commits) {
    $parts = $line -split ' '
    $fullHash = $parts[0]
    $shortHash = $parts[1]

    if ($existingHashes.ContainsKey($shortHash)) {
        Write-Host "  Skip (deja captat): $shortHash"
        continue
    }

    # Verifica daca are parinte
    $parent = git -C $repoRoot rev-parse "$fullHash~1" 2>$null
    if (-not $parent) { continue }

    $commitMsg = git -C $repoRoot log --format="%s" -1 $fullHash
    $commitDate = git -C $repoRoot log --format="%ci" -1 $fullHash
    $date = $commitDate.Substring(0, 10)
    $dateTime = $commitDate.Substring(0, 16)
    $diff = git -C $repoRoot diff "$fullHash~1" $fullHash
    $changedFiles = git -C $repoRoot diff --name-only "$fullHash~1" $fullHash
    $filesList = ($changedFiles -split "`n" | Where-Object { $_.Trim() }) -join ", "

    if ($diff.Length -gt 102400) {
        $diff = $diff.Substring(0, 102400) + "`n... [TRUNCAT]"
    }

    $patchFile = "$memoryDir\$date-$shortHash.md"
    $content = @"
---
name: patch-$shortHash
description: $commitMsg
metadata:
  type: project
  commit: $shortHash
  date: $date
  files: [$filesList]
---

## $commitMsg
**Data:** $dateTime | **Hash:** ``$shortHash``
**Fisiere:** $filesList

## Diff
``````diff
$diff
``````
"@
    Set-Content -Path $patchFile -Value $content -Encoding UTF8
    $entries += "$date | $shortHash | $commitMsg | $filesList"
    Write-Host "  Capturat: $shortHash - $commitMsg"
}

# Adauga in INDEX (dupa header, cele mai vechi la sfarsit)
if ($entries.Count -gt 0) {
    if (-not (Test-Path $indexFile)) {
        Set-Content -Path $indexFile -Value "# Patches Index`n`n" -Encoding UTF8
    }
    $existing = Get-Content $indexFile -Raw
    $lines = $existing -split "`n"
    $header = $lines[0..1] -join "`n"
    $rest = if ($lines.Length -gt 2) { $lines[2..($lines.Length-1)] -join "`n" } else { "" }
    # Adauga noile entries dupa header, inainte de cele existente
    $newEntries = $entries -join "`n"
    Set-Content -Path $indexFile -Value "$header`n$newEntries`n$rest" -Encoding UTF8
    Write-Host "`n[backfill] $($entries.Count) patch-uri adaugate."
} else {
    Write-Host "[backfill] Nimic nou de adaugat."
}
