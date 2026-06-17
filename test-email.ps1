$token = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXFiYW0wMTAwMDA1MTJpZ3Jsc2F0bG5kIiwiZW1haWwiOiJtYXhzdWVsc291emEyMzhAZ21haWwuY29tIiwic3RvcmVJZCI6ImNtcWJhbHp5eDAwMDExMmlnNXp3MjZ0YWoiLCJyb2xlIjoiT1dORVIiLCJlbWFpbFZlcmlmaWVkIjpmYWxzZSwiaXNTdXBlckFkbWluIjp0cnVlLCJpYXQiOjE3ODEzNzY3ODMsImV4cCI6MTc4MTQ2MzE4M30.YnJCfTdsynJ1woqrEehmW-WM3erpHQmVHAop0-03QZM"

Write-Output "=== PUT /api/store-profile ==="
$body = '{"storeName":"Teste","themeColor":"#000000","announcements":[]}'
try {
    $r = Invoke-WebRequest -Uri "http://localhost:3001/api/store-profile" -Method PUT -Headers @{ Authorization = $token; "Content-Type" = "application/json" } -Body $body -UseBasicParsing
    Write-Output "OK $($r.StatusCode): $($r.Content)"
} catch {
    $status = $_.Exception.Response.StatusCode.Value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $errBody = $reader.ReadToEnd()
    $reader.Close()
    Write-Output "ERRO $status : $errBody"
}
