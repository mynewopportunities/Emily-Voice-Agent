# DNS Resolution Error - Trunk & Dispatch Rule Creation

## Error Messages

### Trunk Creation Error
```
[internal] twirp error internal: failed to do request: Post "https://core-technology-services-contact-details-verification-voice-agent-emily-6e0eywx5.livekit.cloud/twirp/livekit.SIP/CreateSIPOutboundTrunk": dial tcp: lookup core-technology-services-contact-details-verification-voice-agent-emily-6e0eywx5.livekit.cloud: no such host
```

### Dispatch Rule Creation Error
```
[internal] twirp error internal: failed to do request: Post "https://core-technology-services-contact-details-verification-voice-agent-emily-6e0eywx5.livekit.cloud/twirp/livekit.SIP/CreateSIPDispatchRule": dial tcp: lookup core-technology-services-contact-details-verification-voice-agent-emily-6e0eywx5.livekit.cloud: no such host
```

## What This Means

LiveKit Cloud's backend cannot resolve your project domain DNS. This affects:
- ❌ **Trunk Creation** - Cannot create SIP trunks for telephony
- ❌ **Dispatch Rule Creation** - Cannot create rules to route calls

This is **not a configuration issue** - it's an infrastructure/DNS problem on LiveKit Cloud's side.

**Your Project:** `core-technology-services-contact-details-verification-voice-agent-emily-6e0eywx5`

---

## Solutions to Try

### Solution 1: Wait and Retry (Most Common Fix)

Sometimes this is a temporary DNS propagation issue:

1. **Wait 10-15 minutes** for DNS propagation
2. **Refresh the LiveKit Cloud dashboard**
3. **Try creating the trunk/dispatch rule again**

If it persists after 15 minutes, proceed to other solutions.

---

### Solution 2: Verify Project Status

1. Go to your LiveKit Cloud dashboard
2. Check your project status - should be **"Active"** or **"Running"**
3. Verify the project URL matches: `wss://core-technology-services-contact-details-verification-voice-agent-emily-6e0eywx5.livekit.cloud`
4. Check if you can create other resources (agents work, but trunks/dispatch rules fail)

---

### Solution 3: Contact LiveKit Support (Recommended)

If the error persists after waiting:

1. **Contact LiveKit Cloud Support:**
   - **Email**: support@livekit.io
   - **Discord**: https://discord.gg/livekit (community support)
   - **Support Portal**: https://livekit.io/support
   
2. **Include in your message:**
   - Your project ID: `core-technology-services-contact-details-verification-voice-agent-emily-6e0eywx5`
   - The exact error message (copy from the error dialog)
   - Screenshot of the error
   - When the project was created
   - What you were trying to do (create trunk/dispatch rule)
   - Mention that:
     - ✅ Agents can be created successfully
     - ✅ Rooms can be created via API
     - ✅ Manual dialing works
     - ❌ Trunk creation fails with DNS error
     - ❌ Dispatch rule creation fails with DNS error

---

### Solution 4: Workaround - Manual Dialing (Temporary)

Until the DNS issue is resolved, you can still make calls manually:

1. **Create the agent** (this works - agents can be created successfully)
2. **Create the room** via your API (this works)
3. **Manually dial from LiveKit Cloud dashboard:**
   - Go to your agent in LiveKit Cloud
   - Click "Make a call" or "Dial"
   - Enter the phone number
   - The agent will join the room automatically

**Note:** This workaround means:
- ✅ Calls can be made manually
- ✅ Agent works correctly
- ✅ Webhooks work correctly
- ✅ Google Sheets updates work
- ❌ Cannot automate trunk/dispatch rule creation
- ❌ Cannot use automated outbound calling (must dial manually)

This is a temporary workaround until LiveKit fixes the DNS issue.

---

## Current Status

**What Works:**
- ✅ Agent creation
- ✅ Room creation via API
- ✅ Manual dialing from dashboard
- ✅ Webhooks to your server
- ✅ Google Sheets updates

**What Doesn't Work:**
- ❌ Trunk creation (DNS error)
- ❌ Dispatch rule creation (DNS error)

---

## Prevention

This is a known issue with some LiveKit Cloud projects. To minimize the chance of encountering it:

1. **Wait a few minutes** after creating a new project before configuring advanced features
2. **Create agents first** (these usually work)
3. **Then create trunks/dispatch rules** (these may fail with DNS error)
4. **Contact support early** if you encounter this issue

---

## Next Steps

1. **Contact LiveKit Support** with the error details (recommended)
2. **Use manual dialing** as a workaround in the meantime
3. **Once DNS is fixed**, create trunk and dispatch rule
4. **Then automate** outbound calling

---

## Additional Resources

- **LiveKit Cloud Docs**: https://docs.livekit.io/cloud
- **LiveKit Support**: support@livekit.io
- **LiveKit Discord**: https://discord.gg/livekit
