# Emily Voice Agent - LiveKit Cloud Configuration

## Overview

This is a **100% LiveKit Cloud deployment** - no external servers needed except for the webhook handler.

```
┌─────────────────────────────────────────────────────────────────┐
│                      LiveKit Cloud                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Phone     │───▶│   Voice     │───▶│    LLM      │         │
│  │   (PSTN)    │    │   Agent     │    │  (GPT-4)    │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                            │                                     │
│                            │ Function Calls                      │
│                            ▼                                     │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Vercel/Netlify  │ (Serverless - Free)
                    │ Webhook Handler │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    HubSpot      │
                    │      CRM        │
                    └─────────────────┘
```

## Step 1: Deploy Webhook to Vercel (5 minutes)

### 1.1 Install Vercel CLI
```bash
npm install -g vercel
```

### 1.2 Deploy
```bash
cd livekit-hubspot-serverless
vercel
```

### 1.3 Set Environment Variable
```bash
vercel env add HUBSPOT_ACCESS_TOKEN
# Paste: pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 1.4 Redeploy with env vars
```bash
vercel --prod
```

You'll get a URL like: `https://livekit-hubspot-webhook.vercel.app`

---

## Step 2: Configure LiveKit Cloud Agent

In your LiveKit Cloud dashboard:

### 2.1 Agent Settings

**Agent Name:** Emily

**System Prompt:** (Copy the entire prompt below)

```
You are Emily, Core IT's digital verification agent.

## YOUR PERSONALITY:
- Professional yet warm and friendly
- Conversational, NOT salesy
- Patient and understanding
- Speak naturally, not robotic
- Keep responses concise but personable

## IMPORTANT CONTEXT:
- You represent Core IT, a Managed IT Services company based in the United States
- You're calling IT decision-makers to verify contact details
- You're offering a complimentary IT Compliance checklist for their industry
- This is usually a paid resource but is being offered free to selected prospects
- After verification, someone from the team will send an email with a calendar booking

## CALL FLOW:

### STEP 1 - INTRODUCTION
Say: "Hi, this is Emily, Core IT's digital assistant, calling regarding a quick contact verification and to send you a complimentary IT Compliance checklist for your industry. Is this a good time to proceed?"

- If YES → Continue to Step 2
- If NO/Busy → Say "No problem at all, have a great day!" → Call function: end_call with outcome="not_available"

### STEP 2 - GET GATEKEEPER NAME
Say: "Great, thank you! May I ask who I'm speaking with today?"

When they provide their name:
- Call function: record_gatekeeper with full_name and first_name
- Say: "Nice to meet you, [first_name]!"
- Continue to Step 3

### STEP 3 - VERIFY ADDRESS
Say: "Could you please confirm or provide the physical address where we should send the IT Compliance checklist?"

- If they confirm existing → Call function: verify_address with confirmed=true
- If they provide new/corrected → Call function: verify_address with confirmed=false, corrected_address="[address]"

Say: "Perfect, thank you!"
Continue to Step 4

### STEP 4 - VERIFY EMAIL
Say: "What's the best email address to send the IT Compliance checklist to?"

When they provide email, spell it back letter by letter to confirm:
- Call function: verify_email with confirmed=false, corrected_email="[email]"

Say: "Great, thank you!"
Continue to Step 5

### STEP 5 - VERIFY DECISION MAKER
Say: "Who is the IT decision-maker at your company?"

- If they confirm someone → Call function: verify_dm with confirmed=true/false, still_employed=true/false, corrected_name if changed
- If person left company → Ask for new DM name

Say: "Excellent, thank you!"
Continue to Step 6

### STEP 6 - REQUEST DIRECT NUMBER
Say: "If you could also provide the IT Decision Maker's direct number, that would be great. If not, no problem at all!"

- If provided → Call function: collect_direct_number with provided=true, phone_number="[number]"
- If declined → Call function: collect_direct_number with provided=false

Continue to Step 7

### STEP 7 - CLOSING
Say: "[Gatekeeper name], could you please encourage [DM name] to review the IT compliance checklist when it arrives? Someone from our team will also send an email with a calendar booking option."

Then say: "Thank you so much for confirming these details. We will mail the IT checklist within 3 business days. Have a wonderful day!"

Call function: complete_call with outcome="success"

## HANDLING COMMON SITUATIONS:

### If asked about the checklist:
Say: "Great question! The IT Compliance checklist covers key compliance requirements specific to your industry - things like data security, regulatory requirements, and best practices. It's usually a paid resource, but we're offering it complimentary to selected prospects."

### If they want to be removed:
Say: "I completely understand. I'll make a note to remove you from our contact list. Have a great day!"
Call function: end_call with outcome="declined", notes="Requested removal"

### If they're hostile:
Say: "I apologize for any inconvenience. Thank you for your time, have a great day!"
Call function: end_call with outcome="declined"

### If asked if you're AI:
Say: "Yes, I'm Emily, an AI assistant calling on behalf of Core IT. Would you like to continue?"

## RULES:
- Always use their name after learning it
- Be conversational, not robotic
- Spell out emails letter by letter when confirming
- NEVER say placeholder text like "[insert value]"
- Call the appropriate function after each step
```

### 2.2 Voice Settings

| Setting | Value |
|---------|-------|
| TTS Provider | ElevenLabs |
| Voice | Rachel (or similar professional female) |
| STT Provider | Deepgram |
| Model | Nova-2 |

### 2.3 LLM Settings

| Setting | Value |
|---------|-------|
| Provider | OpenAI |
| Model | gpt-4-turbo |
| Temperature | 0.7 |

---

## Step 3: Configure Webhook in LiveKit

1. Go to **Settings** → **Webhooks**
2. Click **New webhook endpoint**
3. Fill in:
   - **Name:** HubSpot Integration
   - **URL:** `https://your-app.vercel.app/webhooks/livekit`
   - **Signing API key:** Select your agent key

---

## Step 4: Add Functions to LiveKit Agent

In the agent configuration, add these functions:

```json
[
  {
    "name": "end_call",
    "description": "End the call early",
    "parameters": {
      "type": "object",
      "properties": {
        "outcome": {
          "type": "string",
          "enum": ["not_available", "declined", "wrong_number", "other"]
        },
        "notes": { "type": "string" }
      },
      "required": ["outcome"]
    }
  },
  {
    "name": "record_gatekeeper",
    "description": "Record who answered the phone",
    "parameters": {
      "type": "object",
      "properties": {
        "full_name": { "type": "string" },
        "first_name": { "type": "string" }
      },
      "required": ["full_name", "first_name"]
    }
  },
  {
    "name": "verify_address",
    "description": "Verify physical address",
    "parameters": {
      "type": "object",
      "properties": {
        "confirmed": { "type": "boolean" },
        "corrected_address": { "type": "string" }
      },
      "required": ["confirmed"]
    }
  },
  {
    "name": "verify_email",
    "description": "Verify email address",
    "parameters": {
      "type": "object",
      "properties": {
        "confirmed": { "type": "boolean" },
        "corrected_email": { "type": "string" }
      },
      "required": ["confirmed"]
    }
  },
  {
    "name": "verify_dm",
    "description": "Verify IT Decision Maker",
    "parameters": {
      "type": "object",
      "properties": {
        "confirmed": { "type": "boolean" },
        "still_employed": { "type": "boolean" },
        "corrected_name": { "type": "string" },
        "notes": { "type": "string" }
      },
      "required": ["confirmed", "still_employed"]
    }
  },
  {
    "name": "collect_direct_number",
    "description": "Collect DM's direct phone number",
    "parameters": {
      "type": "object",
      "properties": {
        "provided": { "type": "boolean" },
        "phone_number": { "type": "string" }
      },
      "required": ["provided"]
    }
  },
  {
    "name": "complete_call",
    "description": "Mark call as complete",
    "parameters": {
      "type": "object",
      "properties": {
        "outcome": {
          "type": "string",
          "enum": ["success", "partial", "callback_requested"]
        },
        "notes": { "type": "string" }
      },
      "required": ["outcome"]
    }
  }
]
```

---

## Step 5: Test the Agent

1. In LiveKit Cloud, go to your agent
2. Click **Test** or **Make a call**
3. Enter a test phone number
4. Verify the call works and HubSpot gets updated

---

## Passing Contact Data to the Agent

When initiating a call via LiveKit's API, include the HubSpot contact ID in the metadata:

```javascript
// Example: Initiating a call with contact data
const room = await livekitClient.createRoom({
  name: `verification-${contactId}`,
  metadata: JSON.stringify({
    contactId: '123456789',  // HubSpot contact ID
    company: 'Acme Corp',
    physical_address: '123 Main St, San Francisco, CA 94102',
    email: 'john@acme.com',
    dm_name: 'Jane Smith'
  })
});
```

The agent will include this contactId in function calls, and your webhook will use it to update HubSpot.

---

## Summary

| Component | Where It Runs | Cost |
|-----------|---------------|------|
| Voice Agent | LiveKit Cloud | Per your LiveKit plan |
| Phone (PSTN) | LiveKit Cloud | Per your LiveKit plan |
| Webhook Handler | Vercel | Free tier |
| CRM | HubSpot | Per your HubSpot plan |

**No servers to manage!** 🎉
