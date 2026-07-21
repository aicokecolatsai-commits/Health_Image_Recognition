# Simple HTTP Server for testing - run with: powershell -File server.ps1
$root = $PSScriptRoot
if (-not $root) { $root = 'd:\01_AI_Project\02_moveageeye' }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:3000/')
$listener.Start()
Write-Host '=== MoveAge Eye Dev Server ==='
Write-Host 'http://localhost:3000'
Write-Host 'Press Ctrl+C to stop'
Write-Host ''

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.svg'  = 'image/svg+xml'
    '.webp' = 'image/webp'
    '.ico'  = 'image/x-icon'
    '.wasm' = 'application/wasm'
}

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $resp = $ctx.Response
        
        $urlPath = $req.Url.LocalPath
        if ($urlPath -eq '/') { $urlPath = '/index.html' }
        
        $filePath = Join-Path $root ($urlPath.TrimStart('/').Replace('/', '\'))
        
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $resp.ContentType = if ($mimeTypes[$ext]) { $mimeTypes[$ext] } else { 'application/octet-stream' }
            $resp.ContentLength64 = $bytes.Length
            $resp.Headers.Add('Access-Control-Allow-Origin', '*')
            $resp.Headers.Add('Access-Control-Allow-Headers', '*')
            $resp.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "$(Get-Date -Format 'HH:mm:ss') 200 $urlPath"
        }
        else {
            $resp.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
            $resp.ContentLength64 = $msg.Length
            $resp.OutputStream.Write($msg, 0, $msg.Length)
            Write-Host "$(Get-Date -Format 'HH:mm:ss') 404 $urlPath"
        }
        $resp.Close()
    }
}
finally {
    $listener.Stop()
    Write-Host 'Server stopped.'
}
