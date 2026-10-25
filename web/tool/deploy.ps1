# Builds the web app and publishes it to the Forge server, where the site
# root (https://tefsirasanahi.com/) serves it next to the API (/api/v1).
#
#   powershell -File tool/deploy.ps1
#
# Needs SSH access as forge@SERVER. The API's `php artisan tefsira:link-web`
# then links the new files into Laravel's public/ folder.
param(
  [string]$Server = 'forge@129.212.193.78',
  [string]$Site = 'tefsirasanahi.com',
  [switch]$SkipBuild
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

if (-not $SkipBuild) {
  Push-Location $root
  npm run build
  if ($LASTEXITCODE) { throw 'Build failed' }
  Pop-Location
}

# Upload into a fresh folder, swap it in, then refresh the links.
$remote = @"
set -e
NEW="`$HOME/tefsirasanahi-web.new"
LIVE="`$HOME/tefsirasanahi-web"
OLD="`$HOME/tefsirasanahi-web.old"
rm -rf "`$NEW" && mkdir -p "`$NEW"
tar -xf - -C "`$NEW"
rm -rf "`$OLD"
if [ -d "`$LIVE" ]; then mv "`$LIVE" "`$OLD"; fi
mv "`$NEW" "`$LIVE"
rm -rf "`$OLD"
cd "`$HOME/$Site/current" && php artisan tefsira:link-web
du -sh "`$LIVE"
"@ -replace "`r`n", "`n"
$script = Join-Path $env:TEMP 'tefsira-web-swap.sh'
[IO.File]::WriteAllText($script, $remote)
scp -o BatchMode=yes $script "${Server}:tefsira-web-swap.sh"

Push-Location (Join-Path $root 'dist')
cmd /c "tar -cf - . | ssh -o BatchMode=yes -o Compression=no $Server `"bash ~/tefsira-web-swap.sh`""
Pop-Location
Write-Host 'Web app published.'
