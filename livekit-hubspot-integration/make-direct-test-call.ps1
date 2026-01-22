# Direct Test Call Script
# Makes a test call to your phone number via LiveKit Cloud

$phoneNumber = "+13462003801"  # Your number in E.164 format
# Use your actual HubSpot Contact ID (from your HubSpot URL: .../record/0-1/390062197462)
$contactId = "390062197462"  # Replace with your actual contact ID if different

Write-Host "=== Making Test Call ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Phone Number: $phoneNumber" -ForegroundColor Yellow
Write-Host "Test Mode: Enabled (bypassing business hours)" -ForegroundColor Green
Write-Host ""

# Check if server is running
Write-Host "Checking if server is running..." -ForegroundColor Gray
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET -ErrorAction Stop
    Write-Host "✓ Server is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Server is not running. Please start it with: npm start" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Initiating call..." -ForegroundColor Cyan

try {
    $body = @{
        contactId = $contactId
        phoneNumber = $phoneNumber
        testMode = $true
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/initiate-call" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -ErrorAction Stop

    Write-Host ""
    Write-Host "✓ Call initiated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Call Details:" -ForegroundColor Cyan
    Write-Host "  Call ID: $($response.callId)" -ForegroundColor White
    Write-Host "  Room Name: $($response.roomName)" -ForegroundColor White
    Write-Host "  Phone Number: $phoneNumber" -ForegroundColor White
    Write-Host ""
    Write-Host "The dispatch rule should automatically dial your number." -ForegroundColor Yellow
    Write-Host "You should receive a call shortly!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: This creates a room with prefix 'verification-call-' which" -ForegroundColor Gray
    Write-Host "      triggers your LiveKit Cloud dispatch rule to dial out." -ForegroundColor Gray

} catch {
    Write-Host ""
    Write-Host "✗ Failed to initiate call" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    
    exit 1
}
