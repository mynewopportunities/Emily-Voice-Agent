# Test Call Script for Emily Voice Agent
# This script helps test the call initiation endpoint

Write-Host "=== Emily Voice Agent Test Call ===" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
Write-Host "1. Checking server status..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get -ErrorAction SilentlyContinue
if ($health) {
    Write-Host "   ✓ Server is running" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Gray
} else {
    Write-Host "   ✗ Server is not running. Please start it with: npm start" -ForegroundColor Red
    exit 1
}

# Check business hours
Write-Host ""
Write-Host "2. Checking business hours..." -ForegroundColor Yellow
$businessHours = Invoke-RestMethod -Uri "http://localhost:3000/api/business-hours" -Method Get -ErrorAction SilentlyContinue
if ($businessHours) {
    if ($businessHours.isBusinessHours) {
        Write-Host "   ✓ Within business hours" -ForegroundColor Green
        Write-Host "   Current time: $($businessHours.currentTime)" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠ Outside business hours" -ForegroundColor Yellow
        Write-Host "   $($businessHours.message)" -ForegroundColor Gray
        Write-Host "   Note: Calls will be blocked outside business hours" -ForegroundColor Gray
    }
}

# Get test inputs
Write-Host ""
Write-Host "3. Test Call Configuration" -ForegroundColor Yellow
$contactId = Read-Host "   Enter HubSpot Contact ID (or 'test' to test business hours only)"
$phoneNumber = Read-Host "   Enter Phone Number (E.164 format, e.g., +14155551234)"

if ([string]::IsNullOrWhiteSpace($contactId) -or [string]::IsNullOrWhiteSpace($phoneNumber)) {
    Write-Host "   ✗ Contact ID and Phone Number are required" -ForegroundColor Red
    exit 1
}

# Validate phone number format
if (-not ($phoneNumber -match '^\+[1-9]\d{1,14}$')) {
    Write-Host "   ✗ Invalid phone number format. Must be E.164 (e.g., +14155551234)" -ForegroundColor Red
    exit 1
}

# Make the test call
Write-Host ""
Write-Host "4. Initiating test call..." -ForegroundColor Yellow
Write-Host "   Contact ID: $contactId" -ForegroundColor Gray
Write-Host "   Phone: $phoneNumber" -ForegroundColor Gray
Write-Host ""

try {
    $body = @{
        contactId = $contactId
        phoneNumber = $phoneNumber
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/initiate-call" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body `
        -ErrorAction Stop

    Write-Host "   ✓ Call initiated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Call Details:" -ForegroundColor Cyan
    Write-Host "   - Call ID: $($response.callId)" -ForegroundColor Gray
    Write-Host "   - Room Name: $($response.roomName)" -ForegroundColor Gray
    Write-Host "   - Message: $($response.message)" -ForegroundColor Gray
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    if ($statusCode -eq 403) {
        Write-Host "   ⚠ Call blocked: Outside business hours" -ForegroundColor Yellow
        if ($errorBody.message) {
            Write-Host "   $($errorBody.message)" -ForegroundColor Gray
        }
    } elseif ($statusCode -eq 400) {
        Write-Host "   ✗ Bad Request" -ForegroundColor Red
        if ($errorBody.error) {
            Write-Host "   $($errorBody.error)" -ForegroundColor Gray
        }
    } elseif ($statusCode -eq 500) {
        Write-Host "   ✗ Server Error" -ForegroundColor Red
        Write-Host "   This usually means:" -ForegroundColor Yellow
        Write-Host "   - HubSpot credentials not configured (.env file)" -ForegroundColor Gray
        Write-Host "   - LiveKit credentials not configured" -ForegroundColor Gray
        Write-Host "   - Contact ID doesn't exist in HubSpot" -ForegroundColor Gray
        if ($errorBody.details) {
            Write-Host "   Error: $($errorBody.details)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ✗ Error: $statusCode" -ForegroundColor Red
        if ($errorBody) {
            Write-Host "   $($errorBody | ConvertTo-Json)" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
