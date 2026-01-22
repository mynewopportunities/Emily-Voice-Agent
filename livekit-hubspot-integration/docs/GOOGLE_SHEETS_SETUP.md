# Google Sheets Integration Setup

## Overview

This integration allows you to use Google Sheets as your contact database instead of HubSpot. Emily will read contacts from a Google Sheet, make verification calls, and update the sheet with results.

---

## Step 1: Create Google Sheet

1. **Create a new Google Sheet** (or use existing)
2. **Set up columns** (headers in row 1):

   | Row # | Company Name | Phone Number | Email Address | Physical Address | DM Name | Verification Status | Gatekeeper Name | Address Verified | Email Verified | DM Verified | Direct Number | Call Outcome | Call Notes | Last Call Date |
   |-------|--------------|--------------|---------------|-------------------|---------|---------------------|-----------------|------------------|----------------|-------------|---------------|--------------|------------|----------------|
   | 2     | Acme Tech    | +14155551234 | info@acme.com | 123 Main St       | John Doe| not_verified        |                 |                  |                |             |               |              |            |                |

3. **Column names are flexible** - the system will match common variations:
   - `Phone Number`, `Phone`, `phone_number`
   - `Email Address`, `Email`, `email_address`
   - `Physical Address`, `Address`, `address`
   - `DM Name`, `IT Decision Maker`, `decision_maker`
   - `Verification Status`, `verification_status`

---

## Step 2: Set Up Google Cloud Project

### 2.1 Create Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **Google Sheets API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

### 2.2 Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in:
   - **Name:** `emily-voice-agent`
   - **Description:** `Service account for Emily Voice Agent Google Sheets integration`
4. Click "Create and Continue"
5. Skip role assignment (optional)
6. Click "Done"

### 2.3 Create Key

1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose **JSON** format
5. Download the JSON file (keep it secure!)

### 2.4 Share Sheet with Service Account

1. Open your Google Sheet
2. Click "Share" button
3. **Add the service account email** (found in the JSON file as `client_email`)
   - Example: `emily-voice-agent@your-project.iam.gserviceaccount.com`
4. Give it **Editor** permissions
5. Click "Send"

---

## Step 3: Configure Environment Variables

Add these to your `.env` file:

```bash
# Google Sheets Configuration
GOOGLE_SHEET_ID=your-spreadsheet-id-here
GOOGLE_SHEET_NAME=Contacts
GOOGLE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

### Finding Your Spreadsheet ID

The spreadsheet ID is in the URL:
```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
```

### Service Account JSON

Copy the entire contents of the downloaded JSON file and paste it as a single-line string in `GOOGLE_SERVICE_ACCOUNT`.

**Important:** In production, use environment variables or secrets management (Vercel, AWS Secrets Manager, etc.)

---

## Step 4: Install Dependencies

```bash
npm install googleapis
```

---

## Step 5: Test the Integration

### 5.1 Get Contacts

```bash
curl http://localhost:3000/api/google-sheets/contacts-to-call?limit=5
```

### 5.2 Trigger a Call

```bash
curl -X POST http://localhost:3000/api/google-sheets/trigger-call \
  -H "Content-Type: application/json" \
  -d '{
    "rowNumber": 2,
    "testMode": true
  }'
```

### 5.3 Batch Trigger

```bash
curl -X POST http://localhost:3000/api/google-sheets/batch-trigger \
  -H "Content-Type: application/json" \
  -d '{
    "rowNumbers": [2, 3, 4],
    "testMode": true,
    "maxConcurrent": 3
  }'
```

---

## Step 6: Set Up N8N Automation

### Option A: Scheduled Workflow (Recommended)

1. **Create N8N Workflow:**
   - **Node 1:** Cron (runs every hour, 9 AM - 5 PM, Mon-Fri)
   - **Node 2:** HTTP Request
     - **Method:** GET
     - **URL:** `https://your-server.com/api/google-sheets/contacts-to-call?limit=10`
   - **Node 3:** Split In Batches (process 3 at a time)
   - **Node 4:** HTTP Request (for each contact)
     - **Method:** POST
     - **URL:** `https://your-server.com/api/google-sheets/trigger-call`
     - **Body:**
       ```json
       {
         "rowNumber": "{{ $json.row_number }}",
         "testMode": false
       }
       ```

### Option B: Manual Trigger

1. **Create N8N Workflow:**
   - **Node 1:** Manual Trigger
   - **Node 2:** HTTP Request
     - **Method:** POST
     - **URL:** `https://your-server.com/api/google-sheets/trigger-call`
     - **Body:**
       ```json
       {
         "rowNumber": 2,
         "testMode": false
       }
       ```

---

## How It Works

### 1. Reading Contacts

- API reads from your Google Sheet
- Filters by `verification_status = "not_verified"`
- Returns contacts with phone numbers

### 2. Making Calls

- API creates LiveKit room
- Stores row number in call metadata
- You dial manually from LiveKit Cloud dashboard
- Agent collects information during call

### 3. Updating Sheet

- Webhook receives function calls from agent
- Updates corresponding row in Google Sheet:
  - `gatekeeper_name` - Gatekeeper's name
  - `address_verified` - "Yes" or "Updated"
  - `email_verified` - "Yes" or "Updated"
  - `dm_verified` - "Yes", "Updated", or "No longer employed"
  - `direct_number` - Direct phone number (if provided)
  - `verification_status` - "verified" or "failed"
  - `call_outcome` - "success", "failed", etc.
  - `call_notes` - Notes from the call
  - `last_call_date` - Date of last call (YYYY-MM-DD)

---

## API Endpoints

### GET `/api/google-sheets/contacts-to-call`

Returns contacts that need verification.

**Query Parameters:**
- `limit` (default: 10) - Max contacts to return
- `verificationStatus` (default: "not_verified") - Filter by status
- `hasPhone` (default: true) - Only return contacts with phone numbers

**Response:**
```json
{
  "success": true,
  "contacts": [
    {
      "row_number": 2,
      "contactId": "2",
      "company_name": "Acme Tech",
      "phone_number": "+14155551234",
      "email_address": "info@acme.com",
      "physical_address": "123 Main St",
      "dm_name": "John Doe",
      "verification_status": "not_verified",
      "formatted": { ... }
    }
  ],
  "count": 1
}
```

### POST `/api/google-sheets/trigger-call`

Triggers a call for a specific contact.

**Body:**
```json
{
  "rowNumber": 2,
  "contactId": "optional-id",
  "phoneNumber": "optional-override",
  "testMode": false
}
```

**Response:**
```json
{
  "success": true,
  "callId": "uuid-here",
  "roomName": "verification-call-uuid",
  "rowNumber": 2,
  "phoneNumber": "+14155551234",
  "message": "Call initiated successfully. Dial manually from LiveKit Cloud dashboard.",
  "instructions": {
    "step1": "Go to LiveKit Cloud dashboard",
    "step2": "Open agent 'Emily'",
    "step3": "Click 'Make a call'",
    "step4": "Enter phone number: +14155551234",
    "step5": "Agent will join the room automatically"
  }
}
```

### POST `/api/google-sheets/batch-trigger`

Triggers calls for multiple contacts.

**Body:**
```json
{
  "rowNumbers": [2, 3, 4],
  "contactIds": ["optional", "array"],
  "maxConcurrent": 3,
  "testMode": false
}
```

---

## Troubleshooting

### "GOOGLE_SHEET_ID environment variable not set"

- Check your `.env` file has `GOOGLE_SHEET_ID`
- Restart your server after adding environment variables

### "Authentication credentials not found"

- Verify `GOOGLE_SERVICE_ACCOUNT` is set correctly
- Ensure JSON is properly escaped (single-line string)
- Check service account email has access to the sheet

### "Permission denied"

- Share the Google Sheet with the service account email
- Give it **Editor** permissions (not just Viewer)

### "No contacts found"

- Check `verification_status` column values
- Ensure phone numbers are in E.164 format (`+14155551234`)
- Verify column names match expected patterns

### Updates not appearing in sheet

- Check webhook is receiving events from LiveKit
- Verify row number is correct
- Check service account has write permissions

---

## Best Practices

1. **Backup your sheet** before running batch operations
2. **Test with one contact** first (`testMode: true`)
3. **Use row numbers** for reliability (not just contact IDs)
4. **Monitor call outcomes** in the `call_outcome` column
5. **Set up N8N workflows** for automation
6. **Keep service account JSON secure** (never commit to Git)

---

## Migration from HubSpot

If you're switching from HubSpot:

1. Export contacts from HubSpot to CSV
2. Import CSV into Google Sheet
3. Format phone numbers to E.164 (`+1...`)
4. Set `verification_status` to `not_verified` for all contacts
5. Update your N8N workflows to use Google Sheets endpoints
6. Test with one contact before batch processing

---

## Next Steps

1. ✅ Set up Google Sheet with contacts
2. ✅ Create service account and share sheet
3. ✅ Configure environment variables
4. ✅ Install dependencies (`npm install googleapis`)
5. ✅ Test with one contact
6. ✅ Set up N8N automation
7. ✅ Monitor and optimize
