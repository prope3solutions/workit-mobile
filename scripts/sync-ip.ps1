# Detects this machine's active Wi-Fi IPv4 address and rewrites .env.local
# so EXPO_PUBLIC_SUPABASE_URL always points at the current network.
# Run this any time your hotspot/Wi-Fi network changes (before `npx expo start -c`).

$envPath = Join-Path $PSScriptRoot "..\.env.local"

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.InterfaceAlias -eq "Wi-Fi" -and
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*"
  } |
  Select-Object -First 1 -ExpandProperty IPAddress)

if (-not $ip) {
  Write-Host "Could not detect a Wi-Fi IPv4 address. Are you connected to Wi-Fi?" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path $envPath)) {
  Write-Host ".env.local not found at $envPath" -ForegroundColor Red
  exit 1
}

$content = Get-Content $envPath -Raw
$newUrl = "http://${ip}:54321"
$pattern = 'EXPO_PUBLIC_SUPABASE_URL=http://[^\s]+'

if ($content -match $pattern) {
  $updated = $content -replace $pattern, "EXPO_PUBLIC_SUPABASE_URL=$newUrl"
} else {
  $updated = $content.TrimEnd() + "`nEXPO_PUBLIC_SUPABASE_URL=$newUrl`n"
}

Set-Content -Path $envPath -Value $updated -NoNewline
Write-Host "EXPO_PUBLIC_SUPABASE_URL set to $newUrl" -ForegroundColor Green
Write-Host "Now restart Metro with: npx expo start -c" -ForegroundColor Yellow
