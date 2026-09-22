# Mechanical exports only: never redraw the approved header artwork.
# Run from any directory with Windows PowerShell.
Add-Type -AssemblyName System.Drawing
$brandRoot = Split-Path $PSScriptRoot -Parent
$sourcePath = Join-Path $brandRoot 'src/assets/logo.png'
$source = [System.Drawing.Image]::FromFile($sourcePath)
function Export-BrandPng($relativePath, $size, $padding = 0) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        if ($padding -gt 0) { $graphics.Clear([System.Drawing.Color]::White) }
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $inset = [int]($size * $padding)
        $graphics.DrawImage($source, $inset, $inset, ($size - 2 * $inset), ($size - 2 * $inset))
        $bitmap.Save((Join-Path $brandRoot $relativePath), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose(); $bitmap.Dispose() }
}
try {
    Export-BrandPng 'public/assets/favicon-16.png' 16
    Export-BrandPng 'public/assets/favicon-32.png' 32
    Export-BrandPng 'public/assets/edg-192.png' 192
    Export-BrandPng 'public/assets/edg-512.png' 512
    Export-BrandPng 'public/assets/edg-apple-180.png' 180
    Export-BrandPng 'public/assets/edg-maskable-512.png' 512 0.12
    Copy-Item (Join-Path $brandRoot 'public/assets/favicon-16.png') (Join-Path $brandRoot 'public/favicon-16x16.png')
    Copy-Item (Join-Path $brandRoot 'public/assets/favicon-32.png') (Join-Path $brandRoot 'public/favicon-32x32.png')
    Copy-Item (Join-Path $brandRoot 'public/assets/edg-apple-180.png') (Join-Path $brandRoot 'public/apple-touch-icon.png')
    Copy-Item (Join-Path $brandRoot 'public/assets/edg-512.png') (Join-Path $brandRoot 'public/assets/logo-512.png')
    # Keep the historical SVG URL working, embedding the approved raster rather than a different vector drawing.
    $base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($sourcePath))
    $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500"><image width="500" height="500" href="data:image/png;base64,' + $base64 + '" /></svg>'
    [IO.File]::WriteAllText((Join-Path $brandRoot 'public/assets/edg_logo.svg'), $svg)
    # ICO containers support PNG payloads; provide small and high-resolution entries.
    $payloads = New-Object 'System.Collections.Generic.List[byte[]]'
    foreach ($dimension in @(16, 32, 192)) {
        $relative = if ($dimension -eq 192) { 'public/assets/edg-192.png' } else { "public/assets/favicon-$dimension.png" }
        $payloads.Add([IO.File]::ReadAllBytes((Join-Path $brandRoot $relative)))
    }
    $stream = [IO.File]::Create((Join-Path $brandRoot 'public/favicon.ico'))
    $writer = New-Object IO.BinaryWriter($stream)
    try {
        $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]3)
        $offset = 54
        for ($i = 0; $i -lt 3; $i++) {
            $dimension = @(16, 32, 192)[$i]
            $writer.Write([byte]$dimension); $writer.Write([byte]$dimension)
            $writer.Write([byte]0); $writer.Write([byte]0)
            $writer.Write([uint16]1); $writer.Write([uint16]32)
            $writer.Write([uint32]$payloads[$i].Length); $writer.Write([uint32]$offset)
            $offset += $payloads[$i].Length
        }
        foreach ($payload in $payloads) { $writer.Write([byte[]]$payload) }
    } finally { $writer.Dispose(); $stream.Dispose() }
} finally { $source.Dispose() }
