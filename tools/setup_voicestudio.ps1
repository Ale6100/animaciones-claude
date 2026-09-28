<#
.SYNOPSIS
    Automated, unattended setup and verification of VoiceStudio on Windows.
.DESCRIPTION
    Downloads and installs the latest VoiceStudio Electron desktop app for Windows (per-user silent install),
    verifies its executable, performs a first-launch health-check against http://localhost:3900/health,
    and cleanly terminates the process to free GPU VRAM.
#>

$ErrorActionPreference = "Stop"

function Find-VoiceStudioExe {
    $candidates = @(
        "$env:LOCALAPPDATA\Programs\VoiceStudio\VoiceStudio.exe",
        "$env:LOCALAPPDATA\Programs\voicestudio\VoiceStudio.exe",
        "$env:LOCALAPPDATA\VoiceStudio\VoiceStudio.exe",
        "$env:ProgramFiles\VoiceStudio\VoiceStudio.exe"
    )
    foreach ($path in $candidates) {
        if (Test-Path $path) {
            return $path
        }
    }
    $cmd = Get-Command "VoiceStudio.exe" -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }
    return $null
}

Write-Host "=== [1/4] Checking for existing VoiceStudio installation ==="
$exePath = Find-VoiceStudioExe

if (-not $exePath) {
    Write-Host "VoiceStudio not found. Fetching latest release info from GitHub..."
    $releaseUrl = "https://api.github.com/repos/debpalash/VoiceStudio/releases/latest"
    $release = Invoke-RestMethod -Uri $releaseUrl -Headers @{"User-Agent"="claude-animation-agent"}
    $winAsset = $release.assets | Where-Object { $_.name -like "*win-x64.exe" } | Select-Object -First 1

    if (-not $winAsset) {
        throw "Could not locate a Windows x64 installer in release $($release.tag_name)."
    }

    $tempInstaller = Join-Path $env:TEMP "VoiceStudio-Setup-$($release.tag_name).exe"
    Write-Host "Downloading $($winAsset.name) ($([math]::Round($winAsset.size / 1MB, 1)) MB)..."
    
    # Use curl.exe for reliable progress and resume capability
    curl.exe -L -o $tempInstaller $winAsset.browser_download_url
    if (-not (Test-Path $tempInstaller)) {
        throw "Installer download failed."
    }

    Write-Host "=== [2/4] Installing VoiceStudio silently (/S) ==="
    $installProc = Start-Process -FilePath $tempInstaller -ArgumentList "/S" -PassThru -Wait
    Write-Host "Installer finished with exit code: $($installProc.ExitCode)"

    # Clean up the installer immediately per project cleanup policy
    Remove-Item -Force $tempInstaller -ErrorAction SilentlyContinue

    Start-Sleep -Seconds 3
    $exePath = Find-VoiceStudioExe
}

if (-not $exePath) {
    throw "VoiceStudio executable could not be found after installation."
}

Write-Host "Found VoiceStudio at: $exePath"
Write-Host "=== [3/4] Testing first launch & local API health (http://localhost:3900/health) ==="

$proc = Start-Process -FilePath $exePath -PassThru
$healthUrl = "http://localhost:3900/health"
$ready = $false
$timeoutSec = 300
$elapsed = 0

Write-Host "Waiting for backend API on port 3900 (timeout: ${timeoutSec}s)..."
while ($elapsed -lt $timeoutSec) {
    Start-Sleep -Seconds 5
    $elapsed += 5
    try {
        $resp = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3 -ErrorAction Stop
        if ($resp -and $resp.status -eq "ok") {
            Write-Host "VoiceStudio API is healthy!"
            Write-Host "Device: $($resp.device)"
            Write-Host "Version: $($resp.version)"
            $ready = $true
            break
        }
    } catch {
        # Backend still starting or downloading initial env
        Write-Host "[$elapsed s] Still starting up backend..."
    }

    if ($proc.HasExited) {
        Write-Host "Warning: Parent launcher process exited with code $($proc.ExitCode). Checking if background supervisor is running..."
    }
}

Write-Host "=== [4/4] Shutting down VoiceStudio to free GPU VRAM ==="
# Terminate processes matching VoiceStudio or omnivoice
Get-Process -Name "*voicestudio*", "*VoiceStudio*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

if ($ready) {
    Write-Host "`nSUCCESS: VoiceStudio installation and initial launch verified."
} else {
    Write-Warning "Setup completed, but the API did not respond within ${timeoutSec}s. First-run model downloads may still be initializing."
}
