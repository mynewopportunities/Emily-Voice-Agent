# LiveKit Cloud Trunk Configuration Guide

## Overview

This guide helps you configure a **Trunk** in LiveKit Cloud for making outbound phone calls with Emily.

---

## Trunk Configuration Values

### Basic Settings

**Trunk name:**
```
Emily Outbound Trunk
```
*Or any descriptive name you prefer*

**Trunk direction:**
- ✅ **Outbound** (selected - correct for making calls)

---

### Connection Settings

**Address:**
```
sip:your-project.livekit.cloud
```
*Replace `your-project` with your actual LiveKit Cloud project identifier*

**How to find your SIP address:**
1. In LiveKit Cloud dashboard, go to **Settings** → **Telephony**
2. Look for **SIP Domain** or **SIP Endpoint**
3. It should be in format: `sip:project-name.livekit.cloud` or `sip:your-project-id.livekit.cloud`

**Alternative (if using Twilio):**
If you're connecting to Twilio's SIP trunk, use:
```
sip:your-project.livekit.cloud:5060
```
*Port 5060 is standard for SIP*

---

**Transport:**
- ✅ **Auto** (recommended - will use UDP/TCP as needed)
- Or select **UDP** (faster, less reliable) or **TCP** (more reliable, slightly slower)

---

**Numbers:**
```
+15551234567,+15551234568
```
*Comma-separated list of phone numbers (DIDs) you own for outbound calling*

**Important:**
- Must be in **E.164 format**: `+[country code][number]`
- No spaces or dashes
- These are the numbers that will appear as caller ID
- You need at least one number to make outbound calls

**Where to get numbers:**
- **Twilio**: Buy from Twilio Console → Phone Numbers
- **Telnyx**: Buy from Telnyx Dashboard
- **Other SIP providers**: Purchase DIDs from your provider

---

### Optional Settings

**Media encryption (SRTP):**
- **For testing**: `Media encryption disabled` (easier to debug)
- **For production**: `Required` or `Optional` (more secure)

**Recommendation:** Start with `Media encryption disabled` for testing, then enable for production.

---

**Username:**
```
livekit-user
```
*Or any username you prefer - used for SIP authentication*

**Password:**
```
[Generate a strong password]
```
*Use a strong, unique password (save this securely!)*

**Password requirements:**
- At least 12 characters
- Mix of letters, numbers, and symbols
- Example: `Em1ly_Trunk_2024!Secure`

**Important:** Save this password - you'll need it for:
- LiveKit Cloud configuration
- SIP provider configuration (if connecting to Twilio/Telnyx)
- Environment variables

---

## Complete Example Configuration

```
Trunk name: Emily Outbound Trunk
Trunk direction: Outbound
Address: sip:core-it-voice-agent.livekit.cloud
Transport: Auto
Numbers: +15551234567,+15551234568
Media encryption (SRTP): Media encryption disabled
Username: livekit-user
Password: Em1ly_Trunk_2024!Secure
```

---

## After Creating the Trunk

### 1. Note the Trunk ID

After creation, LiveKit Cloud will assign a **Trunk ID** (e.g., `PN_PPN_ACRcLgLG8e2t`). Save this - you'll need it for:
- Dispatch rules
- API calls
- Configuration references

### 2. Configure Dispatch Rule

You'll need to create a dispatch rule that:
- Uses this trunk for outbound calls
- Routes calls to your Emily agent
- Handles the call flow

See `docs/DISPATCH_RULE_SETUP.md` for details.

### 3. Test the Trunk

1. Go to LiveKit Cloud dashboard
2. Navigate to **Telephony** → **Trunks**
3. Find your trunk and click **Test**
4. Or make a test call from the dashboard

---

## Common Configurations

### Configuration A: Direct LiveKit Cloud (No External SIP Provider)

**Use this if:** You're using LiveKit Cloud's built-in telephony

```
Address: sip:your-project.livekit.cloud
Transport: Auto
Numbers: [Your LiveKit Cloud assigned numbers]
Username: [Optional - if required by LiveKit]
Password: [Optional - if required by LiveKit]
```

### Configuration B: Twilio SIP Trunk

**Use this if:** You want to use Twilio for phone connectivity

**In LiveKit Cloud:**
```
Address: sip:your-project.livekit.cloud
Transport: Auto
Numbers: +15551234567 (your Twilio number)
Username: [From Twilio credentials]
Password: [From Twilio credentials]
```

**In Twilio Console:**
1. Go to **Elastic SIP Trunking** → **Trunks**
2. Create trunk or use existing
3. Under **Origination**, add:
   ```
   sip:your-project.livekit.cloud:5060
   ```
4. Assign credentials list with matching username/password

### Configuration C: Telnyx SIP Trunk

**Use this if:** You want to use Telnyx for phone connectivity

**In LiveKit Cloud:**
```
Address: sip:your-project.livekit.cloud
Transport: Auto
Numbers: +15551234567 (your Telnyx number)
Username: [From Telnyx credentials]
Password: [From Telnyx credentials]
```

**In Telnyx Dashboard:**
1. Go to **Telephony** → **SIP Connections**
2. Create connection
3. Set **SIP User** and **SIP Password** to match LiveKit Cloud
4. Configure **Outbound** to route to LiveKit Cloud SIP endpoint

---

## Troubleshooting

### "Invalid SIP Address"

- **Check format**: Must start with `sip:`
- **Check domain**: Verify your LiveKit Cloud project domain
- **Check port**: Add `:5060` if needed

### "Authentication Failed"

- **Check username/password**: Must match exactly (case-sensitive)
- **Check credentials**: Verify in both LiveKit Cloud and SIP provider
- **Check IP whitelist**: Some providers require IP whitelisting

### "No Route to Destination"

- **Check SIP provider**: Verify trunk is configured in your SIP provider (Twilio/Telnyx)
- **Check firewall**: Ensure SIP ports (5060, 5061) are open
- **Check DNS**: Verify SIP domain resolves correctly

### "Call Not Connecting"

- **Check numbers**: Verify phone numbers are in E.164 format
- **Check trunk status**: Ensure trunk is active/enabled
- **Check dispatch rule**: Verify dispatch rule is configured and active

---

## Security Best Practices

1. **Use strong passwords** (16+ characters, mixed case, numbers, symbols)
2. **Enable SRTP** for production (media encryption)
3. **Rotate credentials** periodically (every 90 days)
4. **Use IP whitelisting** if your SIP provider supports it
5. **Monitor trunk usage** for suspicious activity
6. **Never commit credentials** to Git

---

## Next Steps

After creating the trunk:

1. ✅ Note the Trunk ID
2. ✅ Create dispatch rule (see `docs/DISPATCH_RULE_SETUP.md`)
3. ✅ Test with a call to your own number
4. ✅ Configure webhook URL in LiveKit Cloud
5. ✅ Test full flow: API → Room → Call → Webhook → Google Sheets update

---

## Support

- **LiveKit Cloud Docs**: https://docs.livekit.io/cloud/telephony
- **SIP Trunking Guide**: https://docs.livekit.io/cloud/telephony/sip-trunking
- **Your Project**: https://cloud.livekit.io/projects/your-project-id/telephony
