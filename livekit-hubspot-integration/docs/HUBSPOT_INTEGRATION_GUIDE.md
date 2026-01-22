# HubSpot CRM Integration Guide

## Overview
This guide explains how to trigger calls from HubSpot CRM to your LiveKit Cloud voice agent.

## Current Setup Status

✅ **Completed:**
- LiveKit Cloud agent "Emily" configured
- Webhook handler deployed to Vercel
- API endpoints ready for call initiation
- Business hours validation (Monday-Friday, 9 AM-5 PM CST)
- Test mode for bypassing business hours

⚠️ **Pending:**
- Dispatch rule creation (had DNS issues earlier)
- HubSpot workflow automation setup

---

## Step 1: Create Dispatch Rule in LiveKit Cloud

### Option A: Use Form View (Recommended)

1. Go to https://cloud.livekit.io
2. Navigate to **Telephony** → **Dispatch Rules**
3. Click **"Create Dispatch Rule"**
4. Switch to **"DISPATCH RULE DETAILS"** tab (form view)
5. Fill in:
   - **Rule name:** `Emily Voice Agent`
   - **Rule type:** `Individual`
   - **Room prefix:** `verification-call-`
   - **Phone numbers:** `+13464461101` (your LiveKit number)
   - **Trunk:** `PN_PPN_ACRcLgLG8e2t`
6. Click **"+ Add agent"**
7. Select your "Emily" agent from the dropdown
8. Click **"Create"**

### Option B: Use JSON Editor

If the form view doesn't work, try the JSON editor with the minimal configuration:

```json
{
  "rule": {
    "name": "Emily Voice Agent",
    "dispatchRuleIndividual": {
      "roomPrefix": "verification-call-"
    }
  },
  "trunkIds": [
    "PN_PPN_ACRcLgLG8e2t"
  ],
  "phoneNumbers": [
    "+13464461101"
  ],
  "roomConfig": {
    "agents": [
      {
        "agentName": "Emily"
      }
    ]
  }
}
```

**Note:** If you still get DNS errors, wait 10-15 minutes and try again, or contact LiveKit Cloud support.

---

## Step 2: HubSpot Workflow Automation

### Method 1: HubSpot Workflow (Recommended)

1. Go to HubSpot → **Automation** → **Workflows**
2. Create a new workflow
3. **Enrollment Trigger:** Choose when to trigger calls:
   - Contact property changes (e.g., `verification_status` = "not_verified")
   - Contact added to list
   - Manual enrollment
   - Custom trigger

4. **Add Action:** **"Send a webhook"**
   - **Webhook URL:** `https://your-server.com/api/initiate-call`
     - For local testing: `http://localhost:3000/api/initiate-call`
     - For production: Your deployed server URL
   - **HTTP Method:** `POST`
   - **Request Body:**
     ```json
     {
       "contactId": "{{contact.id}}",
       "phoneNumber": "{{contact.phone}}",
       "testMode": false
     }
     ```
   - **Headers:**
     - `Content-Type: application/json`

5. **Save and Activate** the workflow

### Method 2: HubSpot Custom Action (Advanced)

1. Go to HubSpot → **Settings** → **Integrations** → **Custom Actions**
2. Create a new custom action
3. Configure the API call to your endpoint
4. Add it to contact records or workflows

### Method 3: HubSpot API Integration

Use HubSpot's API to trigger calls programmatically:

```javascript
// Example: Trigger call from HubSpot custom code
const response = await fetch('https://your-server.com/api/initiate-call', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    contactId: contact.id,
    phoneNumber: contact.phone,
    testMode: false
  })
});
```

---

## Step 3: Testing the Integration

### Test from HubSpot Workflow

1. Create a test contact in HubSpot
2. Set the trigger condition (e.g., add to a list)
3. Verify the workflow runs
4. Check your server logs for the API call
5. Verify the call is initiated

### Test via API Directly

```bash
curl -X POST http://localhost:3000/api/initiate-call \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "390062197462",
    "phoneNumber": "+13462003801",
    "testMode": true
  }'
```

---

## Step 4: Monitoring and Analytics

### Check Call Status

```bash
# Get call status
curl http://localhost:3000/api/call-status/{callId}

# List active calls
curl http://localhost:3000/api/active-calls

# View analytics
curl http://localhost:3000/api/analytics
```

### HubSpot Updates

The webhook handler automatically updates HubSpot with:
- Verification status
- Updated contact information
- Call notes and outcomes
- IT Decision Maker details

---

## Step 5: Production Deployment

### Deploy Your Server

1. Deploy your Express server to a hosting provider (Vercel, Railway, Heroku, etc.)
2. Update the webhook URL in HubSpot workflows
3. Set environment variables:
   - `HUBSPOT_ACCESS_TOKEN`
   - `LIVEKIT_URL`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`

### Update LiveKit Cloud Webhook

1. Go to LiveKit Cloud → **Settings** → **Webhooks**
2. Set webhook URL to your deployed server:
   - `https://your-server.com/webhooks/livekit`
3. Save the webhook configuration

---

## Common Workflow Triggers

### Example 1: New Contact Verification
- **Trigger:** Contact created with phone number
- **Action:** Initiate verification call
- **Delay:** 5 minutes (to allow data entry)

### Example 2: Re-verification
- **Trigger:** Contact property `last_verified_date` is older than 90 days
- **Action:** Initiate verification call
- **Filter:** Only contacts with `verification_status` = "verified"

### Example 3: List-Based Calling
- **Trigger:** Contact added to "Needs Verification" list
- **Action:** Initiate verification call
- **Batch:** Process up to 5 calls at a time

---

## Troubleshooting

### Calls Not Initiating
1. Check business hours (Monday-Friday, 9 AM-5 PM CST)
2. Use `testMode: true` to bypass business hours
3. Verify HubSpot contact has valid phone number (E.164 format)
4. Check server logs for errors

### Dispatch Rule Not Working
1. Verify room prefix matches: `verification-call-`
2. Check trunk ID is correct
3. Ensure agent "Emily" exists and is active
4. Wait 10-15 minutes for DNS propagation if errors persist

### Webhook Not Updating HubSpot
1. Verify `HUBSPOT_ACCESS_TOKEN` is set correctly
2. Check webhook URL is accessible
3. Review webhook logs in LiveKit Cloud
4. Check HubSpot contact ID is valid

---

## Next Steps

1. ✅ Create dispatch rule in LiveKit Cloud
2. ✅ Set up HubSpot workflow automation
3. ✅ Test with a single contact
4. ✅ Monitor call analytics
5. ✅ Scale to production
