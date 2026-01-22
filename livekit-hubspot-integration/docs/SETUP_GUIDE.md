# Setup and Deployment Guide

This guide walks you through setting up the LiveKit Voice Agent + HubSpot CRM integration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [HubSpot Setup](#hubspot-setup)
3. [LiveKit Cloud Setup](#livekit-cloud-setup)
4. [Server Deployment](#server-deployment)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- Node.js 18+ installed
- A HubSpot account with API access (Professional or Enterprise)
- A LiveKit Cloud account
- A domain with SSL for webhooks (or ngrok for testing)
- A SIP/PSTN provider account (Twilio, Telnyx, etc.) for phone calls

---

## HubSpot Setup

### 1. Create a Private App

1. Go to **Settings** → **Integrations** → **Private Apps**
2. Click **Create a private app**
3. Name it "LiveKit Voice Agent Integration"
4. Under **Scopes**, enable:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.lists.read`
   - `crm.schemas.contacts.read`
   - `crm.schemas.contacts.write`
   - `crm.objects.calls.write` (for call logging)
5. Click **Create app** and copy the access token

### 2. Create Custom Properties

You can either:

**Option A: Use the API endpoint (recommended)**
```bash
curl -X POST http://localhost:3000/api/setup-hubspot
```

**Option B: Create manually in HubSpot**

Go to **Settings** → **Data Management** → **Properties** → **Create property**

Create these properties:

| Label | Internal Name | Type |
|-------|---------------|------|
| IT Decision Maker | `it_decision_maker` | Single-line text |
| IT DM Direct Number | `it_dm_direct_number` | Phone number |
| Gatekeeper Name | `gatekeeper_name` | Single-line text |
| Last Verification Date | `last_verification_date` | Date picker |
| Verification Status | `verification_status` | Dropdown (see values below) |
| DM Employment Status | `dm_employment_status` | Dropdown (see values below) |
| Last Call Notes | `last_call_notes` | Multi-line text |
| Call Attempts | `call_attempts` | Number |

**Verification Status dropdown values:**
- Not Verified (`not_verified`)
- Verified (`verified`)
- Partially Verified (`partial`)
- Unable to Reach (`unreachable`)
- Wrong Number (`wrong_number`)
- Declined (`declined`)

**DM Employment Status dropdown values:**
- Unknown (`unknown`)
- Still Employed (`employed`)
- No Longer With Company (`left`)

### 3. Prepare Contact Data

Ensure your contacts have:
- Company name
- Phone number (in E.164 format: +14155551234)
- Email address
- Physical address (street, city, state, zip)
- IT Decision Maker name (if known)

---

## LiveKit Cloud Setup

### 1. Create a LiveKit Cloud Project

1. Go to [LiveKit Cloud](https://cloud.livekit.io)
2. Create a new project
3. Note your:
   - API Key
   - API Secret
   - WebSocket URL (e.g., `wss://your-project.livekit.cloud`)

### 2. Configure the Voice Agent

In LiveKit Cloud's agent settings:

1. **Agent Type**: Select "Voice Agent" or "Custom Agent"

2. **System Prompt**: Use the compiled prompt from our server
   - The server generates this dynamically per call

3. **Functions**: Import the functions from `src/livekit/functions.json`

4. **Voice Settings**:
   - TTS: ElevenLabs (recommended) or your preferred provider
   - Voice: Choose a professional female voice (e.g., "Rachel")
   - STT: Deepgram Nova-2 (recommended)

5. **LLM Settings**:
   - Model: GPT-4 Turbo or Claude 3
   - Temperature: 0.7
   - Max tokens: 500

### 3. Set Up Telephony (SIP Trunk)

For outbound phone calls, configure your SIP trunk:

**Twilio Setup:**
1. Create a Twilio account and get a phone number
2. Set up a SIP trunk in Twilio
3. Configure LiveKit Cloud with your Twilio credentials
4. Point the trunk to your LiveKit Cloud SIP endpoint

### 4. Configure Webhooks

In LiveKit Cloud settings:

1. Go to **Webhooks** configuration
2. Set the webhook URL to: `https://your-server.com/webhooks/livekit`
3. Generate a webhook secret and save it
4. Enable these events:
   - `function_call`
   - `room_finished`
   - `participant_left`

---

## Server Deployment

### 1. Clone and Configure

```bash
# Clone the repository
git clone <your-repo-url>
cd livekit-hubspot-integration

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2. Set Environment Variables

Edit `.env` with your credentials:

```env
# HubSpot
HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# LiveKit
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LIVEKIT_URL=wss://your-project.livekit.cloud

# Server
PORT=3000
NODE_ENV=production

# Webhooks
WEBHOOK_SECRET=your-generated-secret-here

# Optional
LOG_LEVEL=info
OUTBOUND_CALLER_ID=+15551234567
```

### 3. Deploy to Your Server

**Option A: Docker (Recommended)**

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

EXPOSE 3000

CMD ["node", "src/index.js"]
```

```bash
docker build -t livekit-hubspot .
docker run -d -p 3000:3000 --env-file .env livekit-hubspot
```

**Option B: PM2**

```bash
npm install -g pm2
pm2 start src/index.js --name livekit-hubspot
pm2 save
```

**Option C: Railway/Render/Fly.io**

These platforms support Node.js directly. Just connect your repository and set environment variables.

### 4. Set Up SSL/HTTPS

Webhooks require HTTPS. Options:

- Use a reverse proxy (nginx) with Let's Encrypt
- Deploy to a platform that provides SSL (Railway, Render, Vercel)
- Use Cloudflare Tunnel for development

---

## Testing

### 1. Verify Server is Running

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

### 2. Preview a Prompt

Test that HubSpot data is being pulled correctly:

```bash
curl http://localhost:3000/api/preview-prompt/YOUR_CONTACT_ID
```

This shows:
- Raw HubSpot data
- Formatted data
- Compiled system prompt

**Check that:**
- Company name appears (not "not on file")
- Email is spelled out correctly
- Address is formatted properly
- DM name appears if present

### 3. Test a Single Call

```bash
curl -X POST http://localhost:3000/api/initiate-call \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "123456789",
    "phoneNumber": "+14155551234"
  }'
```

### 4. Monitor the Call

```bash
# Check call status
curl http://localhost:3000/api/call-status/CALL_ID

# List all active calls
curl http://localhost:3000/api/active-calls
```

### 5. Verify HubSpot Updates

After a test call:
1. Open the contact in HubSpot
2. Check that custom properties were updated
3. Verify the call engagement was logged

---

## Troubleshooting

### Common Issues

#### 1. "Variables showing as [insert value]"

**Cause**: HubSpot data not being injected into the prompt

**Fix**:
- Verify the contact has data in HubSpot
- Check the `/api/preview-prompt/:contactId` endpoint
- Ensure HubSpot token has read permissions

#### 2. "Function calls not updating HubSpot"

**Cause**: Webhooks not reaching the server

**Fix**:
- Verify webhook URL is publicly accessible
- Check webhook secret matches in both places
- Look at server logs for errors
- Test with ngrok for local development

#### 3. "Call not initiating"

**Cause**: LiveKit configuration issue

**Fix**:
- Verify LiveKit credentials are correct
- Check LiveKit Cloud dashboard for errors
- Ensure SIP trunk is configured correctly
- Verify phone number format is E.164

#### 4. "Email not spelling correctly"

**Cause**: Email formatter issue

**Fix**:
- Check the `email_spelled` field in preview-prompt
- Verify the email format in HubSpot is valid
- Review email-formatter.js logic

#### 5. "Agent not following the script"

**Cause**: System prompt too long or unclear

**Fix**:
- Reduce prompt length if over token limit
- Make instructions more explicit
- Add more specific examples
- Test with simpler prompts first

### Debug Mode

Enable verbose logging:

```env
LOG_LEVEL=debug
```

### Check Webhook Delivery

Use ngrok for local testing:

```bash
ngrok http 3000
```

Then update LiveKit webhook URL to the ngrok URL.

### HubSpot API Errors

Check the HubSpot API response in logs. Common issues:
- 401: Invalid or expired token
- 403: Missing scopes
- 404: Contact not found
- 429: Rate limited

### LiveKit Connection Issues

Check the LiveKit Cloud dashboard:
- Room status
- Participant status
- Agent logs
- SIP/PSTN logs

---

## Next Steps

1. **Create a calling list** in HubSpot with prospects to call
2. **Test with a small batch** (5-10 contacts)
3. **Review call recordings** and adjust the prompt
4. **Set up monitoring** (alerts, dashboards)
5. **Scale up** batch calling as needed

---

## Support

- LiveKit Documentation: https://docs.livekit.io
- HubSpot API Docs: https://developers.hubspot.com/docs/api
- File issues on GitHub for this integration
