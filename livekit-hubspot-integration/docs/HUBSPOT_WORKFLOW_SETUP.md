# HubSpot Workflow Setup - Quick Guide

## Step-by-Step: Create Workflow to Trigger Calls

### 1. Create New Workflow

1. Go to HubSpot → **Automation** → **Workflows**
2. Click **"Create workflow"**
3. Choose **"Contact-based"** workflow
4. Name it: `Trigger Verification Calls`

### 2. Set Enrollment Trigger

Choose when to trigger calls. Examples:

**Option A: Contact Added to List**
- Trigger: Contact added to list
- List: "Needs Verification" (create this list)
- Action: Add contacts manually or via automation

**Option B: Contact Property Changed**
- Trigger: Contact property changed
- Property: `verification_status`
- Value: `not_verified`
- Action: Set property to trigger workflow

**Option C: Manual Enrollment**
- Trigger: Manual enrollment
- Action: Manually enroll contacts when ready

### 3. Add Webhook Action

1. Click **"+"** to add action
2. Search for **"Send a webhook"**
3. Configure:
   - **Webhook URL:** 
     - Local: `http://localhost:3000/api/initiate-call`
     - Production: `https://your-deployed-server.com/api/initiate-call`
   - **HTTP Method:** `POST`
   - **Request Body Type:** `JSON`
   - **Request Body:**
     ```json
     {
       "contactId": "{{contact.id}}",
       "phoneNumber": "{{contact.phone}}",
       "testMode": false
     }
     ```
   - **Headers:**
     - `Content-Type`: `application/json`

### 4. Add Delay (Optional)

Add a delay before calling:
- **Delay:** 5 minutes
- **Reason:** Allow time for data entry/updates

### 5. Save and Activate

1. Click **"Save"**
2. Click **"Activate"**
3. Test with a contact

---

## Testing the Workflow

### Test Method 1: Manual Enrollment

1. Open a contact in HubSpot
2. Go to **"Workflows"** tab
3. Find your workflow
4. Click **"Enroll"**
5. Check server logs for API call
6. Verify call is initiated

### Test Method 2: Add to List

1. Create a test contact
2. Add contact to trigger list
3. Wait for workflow to run
4. Check call status

### Test Method 3: Direct API Call

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

## Important Notes

### Phone Number Format
- Must be in E.164 format: `+14155551234`
- HubSpot's `{{contact.phone}}` should already be in this format
- If not, use a workflow action to format it first

### Business Hours
- Calls are blocked outside business hours (Monday-Friday, 9 AM-5 PM CST)
- Use `testMode: true` in webhook body to bypass for testing
- Production: Remove `testMode` or set to `false`

### Error Handling
- If call fails, check server logs
- Verify contact has valid phone number
- Ensure contact ID is correct
- Check business hours if call is blocked

---

## Production Deployment

### Update Webhook URL

When deploying to production:

1. Deploy your server (Vercel, Railway, etc.)
2. Get your production URL
3. Update workflow webhook URL:
   - `https://your-production-url.com/api/initiate-call`
4. Test the workflow again

### Environment Variables

Ensure these are set in production:
- `HUBSPOT_ACCESS_TOKEN`
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

---

## Monitoring

### Check Call Status

```bash
# Get all active calls
curl http://localhost:3000/api/active-calls

# Get specific call status
curl http://localhost:3000/api/call-status/{callId}

# View analytics
curl http://localhost:3000/api/analytics
```

### HubSpot Updates

The webhook automatically updates HubSpot with:
- Verification status
- Updated contact information
- Call notes
- IT Decision Maker details

Check the contact record after the call completes.
