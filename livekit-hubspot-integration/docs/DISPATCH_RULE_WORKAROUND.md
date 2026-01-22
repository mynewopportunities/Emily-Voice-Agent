# Dispatch Rule DNS Error - Workaround Guide

## The Problem

You're getting this DNS error when creating the dispatch rule:
```
dial tcp: lookup core-technology-services-contact-details-verification-voice-agent-emily-6e0eywx5.livekit.cloud: no such host
```

This is a **LiveKit Cloud infrastructure issue** - the project domain cannot be resolved.

## Why This Happens

- Project domain not fully provisioned
- DNS propagation delay
- LiveKit Cloud backend cannot resolve the project domain
- Temporary infrastructure issue

## Solutions

### Solution 1: Contact LiveKit Cloud Support (Recommended)

1. Go to https://livekit.io/support
2. Report the DNS resolution error
3. Include:
   - Your project name/domain
   - The exact error message
   - Screenshot of the error
   - When it started happening

They need to fix the DNS resolution on their end.

### Solution 2: Wait and Retry

1. Wait 15-30 minutes
2. Refresh the LiveKit Cloud dashboard
3. Try creating the dispatch rule again
4. DNS propagation can take time

### Solution 3: Workaround - Manual Dialing (For Now)

**Important:** The dispatch rule is primarily for **INBOUND calls** (when someone calls your LiveKit number).

For **OUTBOUND calls** from HubSpot, you can work around this:

#### Option A: Use LiveKit Cloud Dashboard to Dial

1. Your HubSpot workflow calls your API
2. Your API creates a LiveKit room with prefix `verification-call-`
3. **Manually dial from LiveKit Cloud dashboard:**
   - Go to your agent "Emily"
   - Click "Make a call"
   - Enter the phone number
   - The agent will join the room automatically

#### Option B: Use LiveKit Cloud API (If Available)

If LiveKit Cloud provides a REST API for outbound calls, you can call it from your server after creating the room.

#### Option C: Skip Dispatch Rule for Outbound

The dispatch rule is mainly needed for:
- **Inbound calls** (when someone calls your LiveKit number)
- **Automatic agent dispatch** when rooms are created

For outbound calls triggered from HubSpot:
- Your API creates the room
- You manually dial (or use API if available)
- The agent joins based on room metadata

### Solution 4: Verify Project Configuration

1. Go to LiveKit Cloud dashboard
2. Check **Project Settings**
3. Verify:
   - Project is "Active"
   - API keys are configured
   - Telephony/SIP is enabled
   - Project URL matches: `wss://core-technology-services-contact-details-verification-voice-agent-emily-6e0eywx5.livekit.cloud`

If the project URL doesn't match, there might be a configuration issue.

## Current Workflow (Without Dispatch Rule)

Even without the dispatch rule, you can still make calls:

1. **HubSpot Workflow** → Calls your API
2. **Your API** → Creates LiveKit room (`verification-call-{callId}`)
3. **Manual Step** → Dial from LiveKit Cloud dashboard
   - OR use LiveKit Cloud API if available
4. **Agent** → Joins room and starts conversation
5. **Webhook** → Updates HubSpot with results

## Next Steps

1. **Contact LiveKit Cloud support** about the DNS issue
2. **Use manual dialing** as a workaround for now
3. **Set up HubSpot workflow** - it will work once you dial manually
4. **Once dispatch rule is created**, you can automate the dialing

## Testing Without Dispatch Rule

You can still test the full flow:

1. Trigger call from HubSpot workflow
2. Check your server logs - room should be created
3. Go to LiveKit Cloud dashboard
4. Manually dial the phone number
5. Agent will join and start conversation
6. Webhook will update HubSpot

The only missing piece is **automatic dialing** - which requires the dispatch rule or LiveKit Cloud API.
