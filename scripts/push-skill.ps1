# Push skill changes to GitHub
# Usage: .\scripts\push-skill.ps1
# Description: Add all changes, commit with timestamp, and push to origin/main

$ErrorActionPreference = "Stop"

# Change to script parent directory (canvasvideo-skill root)
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "=== CanvasVideo Skill Push Script ===" -ForegroundColor Cyan
Write-Host ""

# Check git status
$status = git status --porcelain
if ($null -eq $status) {
    Write-Host "No changes to commit. Working tree clean." -ForegroundColor Yellow
    exit 0
}

Write-Host "Found changes:" -ForegroundColor Green
git status --short
Write-Host ""

# Add all changes
Write-Host "Adding all files..." -ForegroundColor Green
git add -A
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: git add failed" -ForegroundColor Red
    exit 1
}

# Get commit message
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$changedFiles = git diff --cached --name-only | ForEach-Object { "  - $_" } | Out-String

$commitMessage = @"
Update rules [auto $timestamp]

- timing-rules.md: region duration limits by mode (creation<=5s, voice<=8s)
- selfcheck-rules.md: L0 region duration check by mode
- video_design_guide.md: rhythm design updated for mode distinction

Changed files:
$changedFiles
"@

# Commit
Write-Host "Committing..." -ForegroundColor Green
git commit -m $commitMessage
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: git commit failed" -ForegroundColor Red
    exit 1
}

# Push
Write-Host "Pushing to origin/main..." -ForegroundColor Green
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: git push failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Push completed successfully ===" -ForegroundColor Cyan
Write-Host "Commit: $(git rev-parse HEAD)" -ForegroundColor Gray
Write-Host "Branch: $(git rev-parse --abbrev-ref HEAD)" -ForegroundColor Gray
