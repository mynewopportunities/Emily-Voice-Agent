# HubSpot Free Tier Integration Guide

## Overview

Since HubSpot Free tier doesn't include **Workflows**, we provide alternative methods to trigger outbound calls from HubSpot contacts.

**Your Flow:**
1. Pick up contact entries from HubSpot
2. Call corporate landline number
3. Fetch information on live call
4. Update information back in HubSpot CRM

---

## Solution Options

### Option 1: N8N Automation (Recommended)

Use **N8N** (open-source, self-hosted or cloud) to connect HubSpot to your API:

#### N8N Setup

1. **Install N8N:**
   - Cloud: https://n8n.io (free tier available)
   - Self-hosted: `npm install -g n8n` or Docker

2. **Create Workflow:**
   - **Node 1:** HubSpot Trigger - "Contact Updated" or "Contact Created"
   - **Node 2:** HTTP Request - POST to your API

3. **Configure HTTP Request Node:**
   - **Method:** POST
   - **URL:** `https://your-server.com/api/hubspot/trigger-call`
   - **Headers:**
     - `Content-Type`: `application/json`
   - **Body (JSON):**
     ```json
     {
       "contactId": "{{ $json.id }}",
       "phoneNumber": "{{ $json.properties.phone }}",
       "testMode": false
     }
     ```

4. **Test and Activate** the workflow

---

### Option 2: Scheduled Job (Automated)

Create a scheduled job that checks HubSpot for contacts needing verification and triggers calls.

#### Using Your Server

Add a scheduled job to your server:

```javascript
// Run every hour during business hours
setInterval(async () => {
  if (isBusinessHours()) {
    const contacts = await hubspotClient.getContactsNeedingVerification({ limit: 10 });
    
    for (const contact of contacts) {
      if (contact.formatted.phone_number) {
        await livekitAgent.initiateCall(contact, contact.formatted.phone_number);
      }
    }
  }
}, 3600000); // Every hour
```

#### Using External Scheduler

Use **cron-job.org** or **EasyCron** (free) to call your API:

**Schedule:** Every hour during business hours (9 AM - 5 PM CST, Monday-Friday)

**URL:** `https://your-server.com/api/hubspot/contacts-to-call?limit=10`

**Then:** Process the returned contacts and trigger calls

---

### Option 3: Manual Trigger from HubSpot

#### Method A: HubSpot Custom Action (If Available)

1. Go to HubSpot → **Settings** → **Integrations** → **Custom Actions**
2. Create custom action that calls your API
3. Add button to contact records

#### Method B: Browser Bookmarklet

Create a bookmarklet that triggers a call for the current contact:

```javascript
javascript:(function(){
  const contactId = window.location.pathname.match(/\/contacts\/\d+\/record\/0-1\/(\d+)/)[1];
  fetch('https://your-server.com/api/hubspot/trigger-call', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({contactId, testMode: false})
  }).then(r => r.json()).then(alert);
})();
```

---

### Option 4: Direct API Calls

Call the API directly from any tool or script:

```bash
# Trigger call for specific contact
curl -X POST http://localhost:3000/api/hubspot/trigger-call \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "390062197462",
    "testMode": true
  }'
```

---

## API Endpoints for HubSpot Free Tier

### 1. Get Contacts Needing Verification

```http
GET /api/hubspot/contacts-to-call?limit=10&verificationStatus=not_verified
```

**Response:**
```json
{
  "success": true,
  "contacts": [
    {
      "contactId": "123456789",
      "formatted": {
        "company_name": "Acme Corp",
        "phone_number": "+14155551234",
        ...
      }
    }
  ],
  "count": 1
}
```

### 2. Trigger Call for Contact

```http
POST /api/hubspot/trigger-call
Content-Type: application/json

{
  "contactId": "123456789",
  "phoneNumber": "+14155551234",  // Optional - will fetch from HubSpot if not provided
  "testMode": false
}
```

**Response:**
```json
{
  "success": true,
  "callId": "550e8400-e29b-41d4-a716-446655440000",
  "roomName": "verification-call-550e8400...",
  "contactId": "123456789",
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

### 3. Batch Trigger Calls

```http
POST /api/hubspot/batch-trigger
Content-Type: application/json

{
  "contactIds": ["123456789", "987654321"],
  "maxConcurrent": 3,
  "testMode": false
}
```

---

## Complete Workflow

### Step 1: Identify Contacts to Call

**Option A: Use API**
```bash
curl http://localhost:3000/api/hubspot/contacts-to-call?limit=10
```

**Option B: Search in HubSpot**
- Filter contacts by `verification_status = "not_verified"`
- Export contact IDs
- Use batch trigger endpoint

### Step 2: Trigger Calls

**For single contact:**
```bash
curl -X POST http://localhost:3000/api/hubspot/trigger-call \
  -H "Content-Type: application/json" \
  -d '{"contactId": "390062197462"}'
```

**For multiple contacts:**
```bash
curl -X POST http://localhost:3000/api/hubspot/batch-trigger \
  -H "Content-Type: application/json" \
  -d '{
    "contactIds": ["390062197462", "123456789"],
    "maxConcurrent": 3
  }'
```

### Step 3: Dial from LiveKit Cloud

1. Go to https://cloud.livekit.io
2. Open agent "Emily"
3. Click "Make a call"
4. Enter the phone number from the API response
5. Agent joins room and starts conversation

### Step 4: Automatic HubSpot Updates

The webhook automatically updates HubSpot with:
- Verification status
- Updated contact information
- IT Decision Maker details
- Call notes

---

## Recommended Setup for Free Tier

### Daily Workflow

1. **Morning (9 AM):** Check for contacts needing verification
   ```bash
   curl http://localhost:3000/api/hubspot/contacts-to-call?limit=20
   ```

2. **Trigger calls** for contacts found
   ```bash
   curl -X POST http://localhost:3000/api/hubspot/batch-trigger \
     -H "Content-Type: application/json" \
     -d '{"contactIds": ["id1", "id2", ...]}'
   ```

3. **Dial from LiveKit Cloud dashboard** for each call

4. **Monitor:** Check `/api/active-calls` to see call status

### Automation with N8N

1. **Set up N8N Workflow:**
   - Trigger: HubSpot contact created/updated
   - Action: HTTP Request to your API endpoint

2. **Your API creates room**
3. **You dial manually** (or automate if LiveKit API available)

---

## Testing

### Test Single Contact

```bash
curl -X POST http://localhost:3000/api/hubspot/trigger-call \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "390062197462",
    "testMode": true
  }'
```

### Check Call Status

```bash
curl http://localhost:3000/api/call-status/{callId}
```

### View Active Calls

```bash
curl http://localhost:3000/api/active-calls
```

---

## Next Steps

1. ✅ Set up API endpoints (already done)
2. ⏳ Set up N8N automation (see `docs/N8N_SETUP.md`)
3. ⏳ Test with a single contact
4. ⏳ Set up daily workflow
5. ⏳ Monitor and optimize

---

## Notes

- **Business Hours:** Calls are blocked outside 9 AM-5 PM CST (Monday-Friday) unless `testMode: true`
- **Manual Dialing:** Required until dispatch rule is created or LiveKit Cloud API is available
- **HubSpot Updates:** Automatic via webhook after call completes
- **Phone Format:** Must be E.164 format (`+14155551234`)
