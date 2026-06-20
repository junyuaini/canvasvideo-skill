$targetDir = "D:\TRAE SOLO\视频制作\canvasvideo-skill\templates\bgm"
$candidates = @{
    'tech-pulse'   = @('Volatile Reaction', 'The Complex', 'Ouroboros', 'Rocket Power', 'Electrodoodle')
    'warm-cafe'    = @('Acoustic Breeze', 'Sweeter Vermouth', 'Lobby Time', 'Jazz Brunch', 'Quasi Motion')
    'uplifting'    = @('Inspired', 'Life of Riley', 'Brightly Fancy', 'Feelin Good', 'Carefree')
    'corporate'    = @('Porch Swing Days', 'Feelin Good', 'Carefree', 'Local Forecast', 'Bossa Antigua')
    'light-pop'    = @('Happy Alley', 'Feelin Good', 'Carefree', 'Life of Riley', 'Brightly Fancy')
    'cinematic'    = @('The Descent', 'Dreamy Flashback', 'Epic Song', 'Dark Times', 'Our Story Begins')
}

foreach ($theme in $candidates.Keys) {
    $songs = $candidates[$theme]
    $success = $false
    foreach ($song in $songs) {
        $encoded = [System.Uri]::EscapeDataString($song)
        $url = "https://incompetech.com/music/royalty-free/mp3-royaltyfree/$encoded.mp3"
        $dest = Join-Path $targetDir "$theme.mp3"
        try {
            $wc = New-Object System.Net.WebClient
            $wc.DownloadFile($url, $dest)
            $size = (Get-Item $dest).Length
            if ($size -lt 10000) {
                Remove-Item $dest -Force
                throw "文件太小"
            }
            Write-Host "[$theme] 成功: $song ($([math]::Round($size/1MB,2)) MB)"
            $success = $true
            break
        } catch {
            Write-Host "[$theme] 失败: $song"
        }
    }
    if (-not $success) {
        Write-Host "[$theme] 所有候选均失败"
    }
}

# 清理旧 wav
Get-ChildItem $targetDir -Filter "*.wav" | Remove-Item -Force
Write-Host "`n下载完成，目录内容:"
Get-ChildItem $targetDir | Select-Object Name, @{N='SizeMB';E={[math]::Round($_.Length/1MB,2)}}
