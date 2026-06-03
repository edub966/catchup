Set-Location -LiteralPath $PSScriptRoot
$node = "C:\Program Files\nodejs\node.exe"
& $node server.js *>> work\server-5501.log
"server exited with code $LASTEXITCODE at $(Get-Date -Format o)" | Out-File -FilePath work\server-5501.log -Append
Start-Sleep -Seconds 300
