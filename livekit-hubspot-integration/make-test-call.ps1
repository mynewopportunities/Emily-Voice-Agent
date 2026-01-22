# Test Call Script for Your Number
# Phone: +1 346 200 3801, Ext: 411

Write-Host "=== Making Test Call to Validate HubSpot Data ===" -ForegroundColor Cyan
Write-Host ""

$phoneNumber = "+13462003801"  # E.164 format (no spaces)
$extension = "411"

Write-Host "Phone Number: $phoneNumber" -ForegroundColor Yellow
Write-Host "Extension: $extension" -ForegroundColor Yellow
Write-Host ""

# Step 1: Search for contact by phone number
Write-Host "Step 1: Searching for contact in HubSpot..." -ForegroundColor Cyan
try {
    $searchUrl = "http://localhost:3000/api/search-contact?phoneNumber=$([System.Web.HttpUtility]::UrlEncode($phoneNumber))"
    $contacts = Invoke-RestMethod -Uri $searchUrl -Method Get -ErrorAction Stop
    
    if ($contacts.count -eq 0) {
        Write-Host "   ⚠ No contact found with this phone number" -ForegroundColor Yellow
        Write-Host "   Please provide your HubSpot Contact ID:" -ForegroundColor Yellow
        $contactId = Read-Host "   Contact ID"
    } elseif ($contacts.count -eq 1) {
        $contactId = $contacts.contacts[0].contactId
        Write-Host "   ✓ Found contact: $contactId" -ForegroundColor Green
        Write-Host "   Name: $($contacts.contacts[0].firstName) $($contacts.contacts[0].lastName)" -ForegroundColor Gray
        Write-Host "   Company: $($contacts.contacts[0].company)" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠ Found $($contacts.count) contacts. Please select one:" -ForegroundColor Yellow
        for ($i = 0; $i -lt $contacts.contacts.Count; $i++) {
            $c = $contacts.contacts[$i]
            Write-Host "   [$i] $($c.firstName) $($c.lastName) - $($c.company) (ID: $($c.contactId))" -ForegroundColor Gray
        }
        $selection = Read-Host "   Enter number"
        $contactId = $contacts.contacts[[int]$selection].contactId
    }
} catch {
    Write-Host "   ⚠ Search failed. Please provide your HubSpot Contact ID:" -ForegroundColor Yellow
    $contactId = Read-Host "   Contact ID"
}

if ([string]::IsNullOrWhiteSpace($contactId)) {
    Write-Host "   ✗ Contact ID is required" -ForegroundColor Red
    exit 1
}

# Step 2: Preview the prompt to see what data will be used
Write-Host ""
Write-Host "Step 2: Previewing contact data from HubSpot..." -ForegroundColor Cyan
try {
    $previewUrl = "http://localhost:3000/api/preview-prompt/$contactId"
    $preview = Invoke-RestMethod -Uri $previewUrl -Method Get -ErrorAction Stop
    
    Write-Host "   Contact Data:" -ForegroundColor Green
    Write-Host "   - Company: $($preview.formattedData.company_name)" -ForegroundColor Gray
    Write-Host "   - Physical Address: $($preview.formattedData.physical_address)" -ForegroundColor Gray
    Write-Host "   - Email: $($preview.formattedData.email_address)" -ForegroundColor Gray
    Write-Host "   - IT Decision Maker: $($preview.formattedData.dm_name)" -ForegroundColor Gray
    Write-Host "   - Phone: $($preview.formattedData.phone_number)" -ForegroundColor Gray
} catch {
    Write-Host "   ⚠ Could not preview contact data: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 3: Check business hours
Write-Host ""
Write-Host "Step 3: Checking business hours..." -ForegroundColor Cyan
$businessHours = Invoke-RestMethod -Uri "http://localhost:3000/api/business-hours" -Method Get
if (-not $businessHours.isBusinessHours) {
    Write-Host "   ⚠ Outside business hours: $($businessHours.message)" -ForegroundColor Yellow
    Write-Host "   The call will be blocked unless you bypass business hours check." -ForegroundColor Yellow
    $bypass = Read-Host "   Continue anyway? (y/n)"
    if ($bypass -ne "y") {
        Write-Host "   Call cancelled" -ForegroundColor Red
        exit 0
    }
}

# Step 4: Make the call
Write-Host ""
Write-Host "Step 4: Initiating test call..." -ForegroundColor Cyan
Write-Host "   Contact ID: $contactId" -ForegroundColor Gray
Write-Host "   Phone: $phoneNumber" -ForegroundColor Gray
if ($extension) {
    Write-Host "   Extension: $extension (will be handled by phone system)" -ForegroundColor Gray
}
Write-Host ""

try {
    # Create body with testMode to bypass business hours
    $body = @{
        contactId = $contactId
        phoneNumber = $phoneNumber
        testMode = $true  # Bypass business hours for testing
    } | ConvertTo-Json -Compress

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
    Write-Host ""
    Write-Host "   The agent will validate:" -ForegroundColor Yellow
    Write-Host "   ✓ Physical address" -ForegroundColor Gray
    Write-Host "   ✓ IT Decision Maker details" -ForegroundColor Gray
    Write-Host "   ✓ Direct contact number" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Monitor the call status:" -ForegroundColor Cyan
    Write-Host "   curl http://localhost:3000/api/call-status/$($response.callId)" -ForegroundColor Gray
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    if ($statusCode -eq 403) {
        Write-Host "   ✗ Call blocked: Outside business hours" -ForegroundColor Red
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
        Write-Host "   Error: $($errorBody.details)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   Common issues:" -ForegroundColor Yellow
        Write-Host "   - HubSpot credentials not configured" -ForegroundColor Gray
        Write-Host "   - LiveKit credentials not configured" -ForegroundColor Gray
        Write-Host "   - Contact ID doesn't exist" -ForegroundColor Gray
    } else {
        Write-Host "   ✗ Error: $statusCode" -ForegroundColor Red
        if ($errorBody) {
            Write-Host "   $($errorBody | ConvertTo-Json)" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "=== Test Call Complete ===" -ForegroundColor Cyan
