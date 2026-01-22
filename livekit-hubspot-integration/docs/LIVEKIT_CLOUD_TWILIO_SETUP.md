# LiveKit Cloud + Twilio Setup Guide

Complete guide to configure Twilio with LiveKit Cloud for making outbound phone calls.

## Overview

LiveKit Cloud handles the voice agent, and Twilio provides the phone connectivity. Here's how they work together:

```
Your API → Creates LiveKit Room → LiveKit Cloud → Twilio → Phone Call
```

---

## Step 1: Twilio Account Setup

### 1.1 Create Twilio Account
1. Go to https://www.twilio.com/try-twilio
2. Sign up (free trial includes $15.50 credit)
3. Verify your phone number

### 1.2 Get Twilio Credentials
1. Go to https://console.twilio.com
2. Navigate to **Account** → **API Keys & Tokens**
3. Note down:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click "View" to reveal)

### 1.3 Purchase a Phone Number
1. In Twilio Console: **Phone Numbers** → **Manage** → **Buy a number**
2. Select a number with **Voice** capabilities
3. Purchase (free trial credit covers this)
4. Note the number (e.g., `+15551234567`)

---

## Step 2: Configure LiveKit Cloud

### 2.1 Add Twilio Integration in LiveKit Cloud
1. Go to your LiveKit Cloud project: https://cloud.livekit.io
2. Navigate to **Settings** → **Integrations** or **Telephony**
3. Click **Add Integration** → **Twilio**
4. Enter:
   - **Account SID**: Your Twilio Account SID
   - **Auth Token**: Your Twilio Auth Token
   - **Phone Number**: Your Twilio phone number (for caller ID)

### 2.2 Configure Outbound Calling
1. In LiveKit Cloud, go to **Settings** → **Voice Agent**
2. Enable **Outbound Calling**
3. Set **Default Caller ID**: Your Twilio number
4. Configure **SIP Settings** (if required by LiveKit Cloud)

---

## Step 3: Configure Webhook in LiveKit Cloud

### 3.1 Set Webhook URL
1. In LiveKit Cloud dashboard: **Settings** → **Webhooks**
2. Add webhook URL:
   ```
   https://livekit-hubspot-serverless.vercel.app/webhooks/livekit
   ```
3. Enable these events:
   - ✅ `function_call`
   - ✅ `room_finished`
   - ✅ `participant_left`
   - ✅ `transcript`

### 3.2 Set Webhook Secret
1. Generate a webhook secret (or use existing one)
2. Add it to your Vercel environment variables as `WEBHOOK_SECRET`
3. Make sure it matches in both places

---

## Step 4: Configure Voice Agent in LiveKit Cloud

### 4.1 Agent Settings
1. Go to **Agents** → **Create Agent** or edit existing
2. **Agent Name**: Emily
3. **Agent Type**: Voice Agent

### 4.2 System Prompt
The system prompt is generated dynamically by your server based on contact data. For LiveKit Cloud, you can:
- Use a base prompt in LiveKit Cloud
- Or configure it to use the prompt from your API

### 4.3 Functions Configuration
1. In LiveKit Cloud agent settings, go to **Functions**
2. Import or manually add the functions from `src/livekit/functions.json`:
   - `record_gatekeeper`
   - `verify_address`
   - `verify_email`
   - `verify_dm`
   - `collect_direct_number`
   - `end_call`
   - `complete_call`

### 4.4 Voice Settings
- **TTS Provider**: ElevenLabs (recommended)
- **Voice**: Choose a professional female voice (e.g., "Rachel")
- **STT Provider**: Deepgram Nova-2 (recommended)

### 4.5 LLM Settings
- **Model**: GPT-4 Turbo or Claude 3
- **Temperature**: 0.7
- **Max Tokens**: 500

---

## Step 5: Making Outbound Calls

### Option A: Using LiveKit Cloud Dashboard (Manual)
1. Go to LiveKit Cloud dashboard
2. Navigate to **Rooms** or **Calls**
3. Create a new outbound call
4. Enter the phone number
5. Select your voice agent
6. The call will connect and the agent will handle it

### Option B: Using LiveKit Cloud API (Automated)
Your current code creates the room. To actually make the call, you need to:

1. **Use LiveKit Cloud's REST API** to initiate outbound call
2. Or configure LiveKit Cloud to auto-dial when a room is created with specific metadata

**Example API call** (if LiveKit Cloud provides this endpoint):
```javascript
// This would be added to agent.js
async startOutboundCall(roomName, phoneNumber, agentToken) {
  const response = await axios.post(
    `${config.livekit.url}/api/outbound-call`,
    {
      room: roomName,
      phoneNumber: phoneNumber,
      agentToken: agentToken,
    },
    {
      headers: {
        'Authorization': `Bearer ${config.livekit.apiKey}:${config.livekit.apiSecret}`,
      },
    }
  );
  return response.data;
}
```

### Option C: Configure Auto-Dial (Recommended)
In LiveKit Cloud settings, configure it to automatically dial outbound when:
- A room is created with metadata containing `phoneNumber`
- The room name matches pattern `verification-call-*`

---

## Step 6: Update Environment Variables

Add to your `.env` file:

```env
# Twilio (if needed for direct integration)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567

# LiveKit Cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LIVEKIT_URL=wss://your-project.livekit.cloud

# Outbound Caller ID
OUTBOUND_CALLER_ID=+15551234567
```

---

## Step 7: Test the Setup

### 7.1 Test Call Initiation
```bash
curl -X POST http://localhost:3000/api/initiate-call \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "390062197462",
    "phoneNumber": "+13462003801",
    "testMode": true
  }'
```

### 7.2 Verify
1. Check LiveKit Cloud dashboard for active calls
2. Check Twilio Console → **Monitor** → **Logs** → **Calls**
3. Your phone should ring
4. The agent should start the conversation

### 7.3 Monitor Webhooks
Check that webhooks are being received:
```bash
# Check Vercel logs
vercel logs --follow
```

---

## Troubleshooting

### Issue: "Call not connecting"
- **Check**: Twilio account has sufficient balance
- **Check**: Phone number has voice capabilities
- **Check**: LiveKit Cloud telephony is enabled
- **Check**: SIP credentials are correct

### Issue: "Agent not responding"
- **Check**: Agent is configured in LiveKit Cloud
- **Check**: Functions are properly imported
- **Check**: System prompt is set correctly

### Issue: "Webhooks not received"
- **Check**: Webhook URL is correct in LiveKit Cloud
- **Check**: Webhook secret matches
- **Check**: Vercel deployment is active
- **Check**: `HUBSPOT_ACCESS_TOKEN` is set in Vercel

---

## Next Steps

1. ✅ Configure Twilio in LiveKit Cloud
2. ✅ Set up webhook URL
3. ✅ Configure voice agent
4. ✅ Test with a real call
5. ✅ Monitor and adjust settings

---

## Support

- **LiveKit Cloud Docs**: https://docs.livekit.io/cloud
- **Twilio Docs**: https://www.twilio.com/docs
- **Your Webhook**: https://livekit-hubspot-serverless.vercel.app/webhooks/livekit
