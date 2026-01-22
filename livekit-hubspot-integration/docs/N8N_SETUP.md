# N8N Integration for Google Sheets

## Overview

Use **N8N** (open-source workflow automation) to connect Google Sheets to your LiveKit voice agent API. N8N is free, self-hostable, and more powerful than Zapier for complex workflows.

---

## Step 1: Install N8N

### Option A: N8N Cloud (Easiest)

1. Go to https://n8n.io
2. Sign up for free account
3. You get workflows and executions on free tier

### Option B: Self-Hosted (Recommended for Production)

```bash
# Install globally
npm install -g n8n

# Or use Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

Access at: http://localhost:5678

---

## Step 2: Create Workflow

### Workflow Structure

```
Cron/Manual Trigger → HTTP Request (Get Contacts) → Split In Batches → HTTP Request (Trigger Call)
```

### Node 1: Google Sheets Trigger (or Cron)

**Option A: Scheduled Workflow (Recommended)**

1. **Add Node:** Search for "Cron"
2. **Configure:**
   - **Trigger Times:** Every hour (9 AM - 5 PM, Monday-Friday)
   - **Timezone:** Your timezone

**Option B: Manual Trigger**

1. **Add Node:** Search for "Manual Trigger"
2. Click to execute manually

### Node 2: HTTP Request - Get Contacts

1. **Add Node:** Search for "HTTP Request"
2. **Configure:**
   - **Method:** GET
   - **URL:** `https://your-server.com/api/google-sheets/contacts-to-call?limit=10`
     - Local: `http://localhost:3000/api/google-sheets/contacts-to-call?limit=10`
   - **Authentication:** None

3. **Test:** Verify it returns contacts

### Node 3: Split In Batches (Optional)

1. **Add Node:** Search for "Split In Batches"
2. **Configure:**
   - **Batch Size:** 3 (process 3 calls at a time)

### Node 4: HTTP Request - Trigger Call

1. **Add Node:** Search for "HTTP Request"
2. **Configure:**
   - **Method:** POST
   - **URL:** `https://your-server.com/api/google-sheets/trigger-call`
     - Local: `http://localhost:3000/api/google-sheets/trigger-call`
     - Production: Your deployed server URL
   - **Authentication:** None
   - **Send Headers:** Yes
     - `Content-Type`: `application/json`
   - **Send Body:** Yes
   - **Body Content Type:** JSON
   - **JSON Body:**
     ```json
     {
       "rowNumber": "{{ $json.row_number }}",
       "testMode": false
     }
     ```

3. **Test:** Send test request

### Node 3: Error Handling (Optional)

1. **Add Node:** "IF" node
2. **Condition:** Check if HTTP request succeeded
3. **On Error:** Log error or send notification

---

## Step 3: Advanced Workflow Options

### Filter Contacts

Add **IF** node before HTTP Request:

- **Condition:** Only trigger if `verification_status = "not_verified"`
- **Condition:** Only trigger if phone number exists
- **Condition:** Only trigger during business hours

### Batch Processing

Use **Split In Batches** node to process multiple contacts:

1. **Cron/Manual** → Get contacts needing verification
2. **Split In Batches** → Process 3 at a time
3. **HTTP Request** → Trigger call for each

### Schedule Workflow

Use **Cron** node to run on schedule:

- **Schedule:** Every hour during business hours
- **Action:** Get contacts needing verification
- **Then:** Trigger calls

---

## Step 4: N8N Workflow JSON

Here's a complete workflow JSON you can import:

```json
{
  "name": "Google Sheets to LiveKit Voice Agent",
  "nodes": [
    {
      "parameters": {},
      "name": "HubSpot Trigger",
      "type": "n8n-nodes-base.hubspotTrigger",
      "typeVersion": 1,
      "position": [250, 300],
      "credentials": {
        "hubspotApi": {
          "id": "1",
          "name": "HubSpot account"
        }
      }
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://localhost:3000/api/hubspot/trigger-call",
        "options": {
          "headers": {
            "Content-Type": "application/json"
          }
        },
        "bodyParameters": {
          "parameters": [
            {
              "name": "contactId",
              "value": "={{ $json.id }}"
            },
            {
              "name": "phoneNumber",
              "value": "={{ $json.properties.phone }}"
            },
            {
              "name": "testMode",
              "value": "false"
            }
          ]
        },
        "sendBody": true,
        "bodyContentType": "json"
      },
      "name": "Trigger Call",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [450, 300]
    }
  ],
  "connections": {
    "HubSpot Trigger": {
      "main": [[{ "node": "Trigger Call", "type": "main", "index": 0 }]]
    }
  }
}
```

---

## Step 5: Testing

1. **Test Workflow:**
   - Click "Execute Workflow" button
   - Verify it triggers for test contact
   - Check your server logs

2. **Test with Real Contact:**
   - Update a contact in HubSpot
   - Verify workflow triggers
   - Check call room is created
   - Dial manually from LiveKit Cloud

---

## Step 6: Production Deployment

### Self-Hosted N8N

1. Deploy N8N to your server (Docker recommended)
2. Set up reverse proxy (nginx)
3. Configure SSL certificate
4. Set environment variables for credentials

### N8N Cloud

1. Use n8n.io cloud instance
2. Set workflow URL to your production API
3. Configure Google Sheets service account (if needed)
4. Activate workflow

---

## Advanced: Scheduled Batch Calls

Create a workflow that runs on schedule:

1. **Cron Node:** Every hour (9 AM - 5 PM, Monday-Friday)
2. **HTTP Request:** GET `/api/google-sheets/contacts-to-call?limit=10`
3. **Split In Batches:** Process contacts
4. **HTTP Request:** POST `/api/google-sheets/trigger-call` for each

---

## Troubleshooting

### Workflow Not Triggering

- Check Cron schedule is correct
- Verify workflow is activated
- Check N8N execution logs

### API Calls Failing

- Verify your server is running
- Check API endpoint URL is correct
- Verify phone number format (E.164)
- Check business hours (use `testMode: true` for testing)
- Verify Google Sheets service account is configured

### Contact Data Missing

- Ensure Google Sheet has required columns
- Check column names match expected patterns
- Verify contacts have phone numbers in E.164 format
- Check `verification_status` column values

---

## Cost Comparison

- **N8N Cloud Free:** Limited executions/month
- **N8N Self-Hosted:** Free (unlimited)
- **Other tools:** Zapier (100 tasks/month), Make.com (1,000 operations/month)
- **Make.com Free:** 1,000 operations/month

**N8N is the best free option** for unlimited automation!

---

## Next Steps

1. ✅ Install N8N (cloud or self-hosted)
2. ✅ Create workflow with HubSpot trigger
3. ✅ Add HTTP Request node
4. ✅ Test with one contact
5. ✅ Activate workflow
6. ✅ Monitor and optimize
