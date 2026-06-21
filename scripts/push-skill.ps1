# Push skill changes to GitHub and sync to local Skill installation
# Usage: .\scripts\push-skill.ps1
# Description: Add all changes, commit with timestamp, push to origin/main, and sync to Trae Skill dir

$ErrorActionPreference = "Stop"

# Change to script parent directory (canvasvideo-skill root)
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "=== CanvasVideo Skill Push Script ===" -ForegroundColor Cyan
Write-Host ""

# Check git status
$status = git status --porcelain
if ($null -eq $status) {
    Write-Host "No changes to commit. Working tree clean." -ForegroundColor Yellow
} else {
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
    Write-Host "Git push completed successfully" -ForegroundColor Green
    Write-Host "Commit: $(git rev-parse HEAD)" -ForegroundColor Gray
}

# Sync to Trae Skill installation directory
$skillDir = "$env:USERPROFILE\.trae-cn\skills\canvasvideo"
if (Test-Path $skillDir) {
    Write-Host ""
    Write-Host "Syncing to Trae Skill directory..." -ForegroundColor Cyan
    Write-Host "Source: $(Get-Location)" -ForegroundColor Gray
    Write-Host "Target: $skillDir" -ForegroundColor Gray
    Write-Host ""

    # Sync all tracked files (exclude .git, node_modules, etc.)
    # Use .NET methods to handle UTF-8 filenames correctly
    $srcRoot = (Get-Location).Path
    $trackedFiles = git ls-files
    $count = 0
    foreach ($file in $trackedFiles) {
        $src = [System.IO.Path]::Combine($srcRoot, $file)
        $dst = [System.IO.Path]::Combine($skillDir, $file)
        if ([System.IO.File]::Exists($src)) {
            $dstDir = [System.IO.Path]::GetDirectoryName($dst)
            if (-not [System.IO.Directory]::Exists($dstDir)) {
                [System.IO.Directory]::CreateDirectory($dstDir) | Out-Null
            }
            [System.IO.File]::Copy($src, $dst, $true)
            $count++
        }
    }

    Write-Host "Synced $count files to Skill directory" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Warning: Trae Skill directory not found at $skillDir" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== All done ===" -ForegroundColor Cyan
