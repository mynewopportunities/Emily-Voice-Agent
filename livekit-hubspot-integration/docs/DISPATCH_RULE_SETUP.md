# LiveKit Cloud Dispatch Rule Configuration

## Your Setup
- **Phone Number**: +13464461101 (LiveKit Cloud free number)
- **Trunk ID**: PN_PPN_ACRcLgLG8e2t
- **Room Prefix**: `verification-call-` (matches your code)

---

## Dispatch Rule Configuration

### In LiveKit Cloud Dashboard:

1. **Rule Name**: `Emily Voice Agent - HubSpot Integration`

2. **Rule Type**: `Individual` ✓ (you have this selected)

3. **Room Prefix**: `verification-call-` 
   - This matches the prefix your code uses: `verification-call-${callId}`
   - Important: Keep this exact prefix

4. **Agent Dispatch** → Click "+ Add agent":
   - **Agent Name**: Emily
   - **System Prompt**: (See below - you can use a base prompt, or it will be set per call)
   - **Functions**: Import from `src/livekit/functions.json` (all 7 functions)
   - **LLM**: GPT-4 Turbo, Temperature 0.7
   - **TTS**: ElevenLabs, Voice: Rachel
   - **STT**: Deepgram Nova-2

5. **Inbound Routing**:
   - **Phone Numbers**: ✅ +13464461101 (you have this selected)
   - **Trunks**: ✅ PN_PPN_ACRcLgLG8e2t (add this)

6. **Webhook Configuration** (in Agent Settings, not dispatch rule):
   - **Webhook URL**: `https://livekit-hubspot-serverless.vercel.app/webhooks/livekit`
   - **Events**: function_call, room_finished, participant_left

---

## System Prompt (Base - will be enhanced per call)

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

## PROSPECT DATA:
Contact data will be provided dynamically for each call. Use the information to personalize your conversation.

## CALL FLOW:
[The full call flow from your prompt template - see prompt-template.js]
```

---

## JSON Configuration (for JSON Editor tab)

If you prefer to use the JSON Editor, here's the complete configuration:

```json
{
  "rule": {
    "name": "Emily Voice Agent - HubSpot Integration",
    "dispatchRuleIndividual": {
      "roomPrefix": "verification-call-",
      "agentDispatch": {
        "agentId": "YOUR_AGENT_ID_HERE",
        "agentName": "Emily",
        "systemPrompt": "You are Emily, Core IT's digital verification agent. [Full prompt - see above]",
        "functions": [
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
            "description": "Verify or correct the physical address",
            "parameters": {
              "type": "object",
              "properties": {
                "confirmed": { "type": "boolean" },
                "address": { "type": "string" },
                "corrected_address": { "type": "string" }
              },
              "required": ["confirmed"]
            }
          },
          {
            "name": "verify_email",
            "description": "Verify or correct the email address",
            "parameters": {
              "type": "object",
              "properties": {
                "confirmed": { "type": "boolean" },
                "email": { "type": "string" },
                "corrected_email": { "type": "string" }
              },
              "required": ["confirmed"]
            }
          },
          {
            "name": "verify_dm",
            "description": "Verify IT Decision Maker details",
            "parameters": {
              "type": "object",
              "properties": {
                "confirmed": { "type": "boolean" },
                "still_employed": { "type": "boolean" },
                "dm_name": { "type": "string" },
                "corrected_name": { "type": "string" },
                "notes": { "type": "string" }
              },
              "required": ["confirmed", "still_employed"]
            }
          },
          {
            "name": "collect_direct_number",
            "description": "Collect the IT Decision Maker's direct phone number",
            "parameters": {
              "type": "object",
              "properties": {
                "provided": { "type": "boolean" },
                "phone_number": { "type": "string" },
                "notes": { "type": "string" }
              },
              "required": ["provided"]
            }
          },
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
            "name": "complete_call",
            "description": "Complete the verification call successfully",
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
        ],
        "llm": {
          "provider": "openai",
          "model": "gpt-4-turbo",
          "temperature": 0.7,
          "maxTokens": 500
        },
        "tts": {
          "provider": "elevenlabs",
          "voice": "Rachel"
        },
        "stt": {
          "provider": "deepgram",
          "model": "nova-2"
        }
      }
    }
  },
  "trunkIds": [
    "PN_PPN_ACRcLgLG8e2t"
  ],
  "phoneNumbers": [
    "+13464461101"
  ],
  "roomConfig": {
    "emptyTimeout": 300,
    "maxParticipants": 3
  }
}
```

---

## Important Notes

1. **Room Prefix Must Match**: Your code creates rooms with prefix `verification-call-`, so the dispatch rule must use the same prefix.

2. **Outbound Calls**: For outbound calls (calling from your API), you'll need to:
   - Create the room via your API (which you're already doing)
   - Then use LiveKit Cloud's API or dashboard to dial the phone number and connect it to that room
   - OR configure LiveKit Cloud to auto-dial when rooms are created with specific metadata

3. **Webhook**: Configure the webhook separately in Agent Settings, not in the dispatch rule.

4. **Metadata**: Your code sets metadata with `contactId` - make sure the agent can access this for webhook processing.

---

## Testing

After configuring the dispatch rule:

1. **Test Inbound**: Call +13464461101 - the agent should answer
2. **Test Outbound**: Use your API to create a room, then trigger the call
3. **Verify Webhooks**: Check that function calls are received at your webhook URL

---

## Next Steps

1. ✅ Configure the dispatch rule with the settings above
2. ✅ Add all 7 functions to the agent
3. ✅ Set webhook URL in Agent Settings
4. ✅ Test with a call
5. ✅ Verify HubSpot updates via webhooks
