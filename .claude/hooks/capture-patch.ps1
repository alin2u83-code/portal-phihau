# Captureaza diff-ul dupa fiecare commit si il salveaza in memory/patches/
# Idempotent: compara hash-ul curent cu ultimul capturat

$repoRoot = "C:\Users\lungu\portal-phihau"
$memoryDir = "C:\Users\lungu\.claude\projects\C--Users-lungu-portal-phihau\memory\patches"
$lastHashFile = "$repoRoot\.claude\hooks\.last-captured-hash"

# Get current HEAD hash
$currentHash = git -C $repoRoot rev-parse --short=7 HEAD 2>$null
if (-not $currentHash) { exit 0 }
$currentHash = $currentHash.Trim()

# Check if already captured
$lastHash = if (Test-Path $lastHashFile) { (Get-Content $lastHashFile -Raw).Trim() } else { "" }
if ($currentHash -eq $lastHash) { exit 0 }

# Skip initial commit (no parent)
$parentHash = git -C $repoRoot rev-parse HEAD~1 2>$null
if (-not $parentHash) {
    Set-Content -Path $lastHashFile -Value $currentHash -Encoding UTF8
    exit 0
}

# Collect commit info
$commitMsg = git -C $repoRoot log --format="%s" -1 HEAD
$date = Get-Date -Format "yyyy-MM-dd"
$dateTime = Get-Date -Format "yyyy-MM-dd HH:mm"
$diff = git -C $repoRoot diff HEAD~1 HEAD
$changedFiles = git -C $repoRoot diff --name-only HEAD~1 HEAD
$filesList = ($changedFiles -split "`n" | Where-Object { $_.Trim() }) -join ", "

# Limit diff size to 100KB to avoid huge files
if ($diff.Length -gt 102400) {
    $diff = $diff.Substring(0, 102400) + "`n... [TRUNCAT - diff prea mare]"
}

# Create patches dir
if (-not (Test-Path $memoryDir)) {
    New-Item -ItemType Directory -Force $memoryDir | Out-Null
}

# Write patch file
$patchFile = "$memoryDir\$date-$currentHash.md"
$content = @"
---
name: patch-$currentHash
description: $commitMsg
metadata:
  type: project
  commit: $currentHash
  date: $date
  files: [$filesList]
---

## $commitMsg
**Data:** $dateTime | **Hash:** ``$currentHash``
**Fisiere:** $filesList

## Diff
``````diff
$diff
``````
"@

Set-Content -Path $patchFile -Value $content -Encoding UTF8

# Update INDEX.md (prepend - cel mai recent primul)
$indexFile = "$memoryDir\INDEX.md"
$indexLine = "$date | $currentHash | $commitMsg | $filesList"
if (-not (Test-Path $indexFile)) {
    $header = "# Patches Index`n`n"
    Set-Content -Path $indexFile -Value ($header + $indexLine) -Encoding UTF8
} else {
    $existing = Get-Content $indexFile -Raw
    # Insert after header (first 2 lines)
    $lines = $existing -split "`n"
    $header = $lines[0..1] -join "`n"
    $rest = $lines[2..($lines.Length-1)] -join "`n"
    Set-Content -Path $indexFile -Value "$header`n$indexLine`n$rest" -Encoding UTF8
}

# Save current hash
Set-Content -Path $lastHashFile -Value $currentHash -Encoding UTF8

Write-Host "[patch-memory] Capturat: $currentHash - $commitMsg"
