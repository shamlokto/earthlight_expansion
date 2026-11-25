# Sato's Harvest offline: a tiny web server for this folder, built into Windows (no install needed).
# Browsers will not run the game straight from files (file://), so this serves the folder at
# http://localhost:8777/ and opens the game. Keep this window open while you play; close it to stop.
# It only answers this computer (localhost) and only hands out files inside this folder.
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path)).TrimEnd('\') + '\'
$port = 8777   # always the same port, so the browser keeps your saves between sessions
$types = @{ '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json'; '.webmanifest' = 'application/manifest+json';
  '.webp' = 'image/webp'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.svg' = 'image/svg+xml'; '.glb' = 'model/gltf-binary'; '.mp3' = 'audio/mpeg'; '.ogg' = 'audio/ogg'; '.mp4' = 'video/mp4'; '.webm' = 'video/webm';
  '.woff2' = 'font/woff2'; '.txt' = 'text/plain; charset=utf-8' }
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$port/")
try { $l.Start() } catch { Write-Host "Port $port is busy. Is Sato's Harvest already running? Open http://localhost:$port/farm.html in your browser."; Start-Process "http://localhost:$port/farm.html"; Read-Host 'Press Enter to close'; exit }
Write-Host "Sato's Harvest is running at http://localhost:$port/farm.html"
Write-Host 'Keep this window open while you play. Close it to stop.'
Start-Process "http://localhost:$port/farm.html"
while ($l.IsListening) {
  $c = $l.GetContext(); $res = $c.Response
  try {
    $rel = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath).TrimStart('/'); if ($rel -eq '') { $rel = 'farm.html' }
    $f = [IO.Path]::GetFullPath((Join-Path $root ($rel -replace '/', '\')))
    if ($f.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $f -PathType Leaf)) {
      $b = [IO.File]::ReadAllBytes($f); $t = $types[[IO.Path]::GetExtension($f).ToLower()]; if (-not $t) { $t = 'application/octet-stream' }
      $res.ContentType = $t; $res.ContentLength64 = $b.Length; $res.OutputStream.Write($b, 0, $b.Length)
    } else { $res.StatusCode = 404 }
  } catch { try { $res.StatusCode = 500 } catch {} }
  finally { try { $res.Close() } catch {} }
}
