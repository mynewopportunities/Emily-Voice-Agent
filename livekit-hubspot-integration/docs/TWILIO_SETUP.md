# Twilio Setup Guide for LiveKit Cloud

This guide will help you configure Twilio to enable outbound phone calls through LiveKit Cloud.

## Prerequisites

- Twilio account (sign up at https://www.twilio.com)
- LiveKit Cloud project
- Phone number in Twilio (for caller ID)

---

## Step 1: Get Twilio Credentials

### 1.1 Create Twilio Account
1. Go to https://www.twilio.com/try-twilio
2. Sign up for a free trial account
3. Verify your phone number

### 1.2 Get Your Twilio Credentials
1. Go to Twilio Console: https://console.twilio.com
2. Navigate to **Account** → **API Keys & Tokens**
3. Note down:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click "View" to reveal)
   - **API Key SID** (create one if needed)
   - **API Secret** (create one if needed)

### 1.3 Get a Phone Number
1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Buy a number**
2. Choose a number with voice capabilities
3. Purchase the number (free trial includes $15.50 credit)
4. Note the phone number (e.g., `+15551234567`)

---

## Step 2: Configure Twilio SIP Trunk

### 2.1 Create SIP Trunk in Twilio
1. Go to **Elastic SIP Trunking** → **Trunks**
2. Click **Create Trunk**
3. Name it: `LiveKit Cloud Trunk`
4. Click **Create**

### 2.2 Configure SIP Credentials
1. In your trunk, go to **Credentials Lists**
2. Click **Create Credentials List**
3. Name it: `livekit-credentials`
4. Add a credential:
   - **Username**: `livekit-user` (or any username)
   - **Password**: Generate a strong password (save this!)
5. Click **Save**

### 2.3 Get LiveKit Cloud SIP Endpoint
You'll need to get the SIP endpoint from LiveKit Cloud:
- In LiveKit Cloud dashboard, go to **Settings** → **Telephony**
- Copy the **SIP URI** (format: `sip:your-project.livekit.cloud`)

---

## Step 3: Configure LiveKit Cloud

### 3.1 Add Twilio Credentials in LiveKit Cloud
1. Go to your LiveKit Cloud project dashboard
2. Navigate to **Settings** → **Telephony** or **Integrations**
3. Add Twilio configuration:
   - **Provider**: Twilio
   - **Account SID**: Your Twilio Account SID
   - **Auth Token**: Your Twilio Auth Token
   - **SIP Username**: The username from Step 2.2
   - **SIP Password**: The password from Step 2.2
   - **SIP Domain**: Your LiveKit Cloud SIP domain

### 3.2 Configure Outbound Calling
1. In LiveKit Cloud, go to **Settings** → **Voice Agent** or **Telephony**
2. Set **Outbound Caller ID**: Your Twilio phone number (e.g., `+15551234567`)
3. Enable **Outbound Calling**

---

## Step 4: Configure Twilio to Route to LiveKit Cloud

### 4.1 Set Up SIP URI
1. In Twilio Console, go to your trunk
2. Under **Origination**, click **Add URI**
3. Enter your LiveKit Cloud SIP URI:
   ```
   sip:your-project.livekit.cloud
   ```
4. Set **Priority**: `1`
5. Click **Save**

### 4.2 Configure Authentication
1. In your trunk, go to **Credentials Lists**
2. Make sure `livekit-credentials` is assigned
3. Verify the username/password match what you set in LiveKit Cloud

---

## Step 5: Update Your Code

### 5.1 Add Environment Variables
Add to your `.env` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567

# LiveKit Cloud Telephony
LIVEKIT_SIP_DOMAIN=your-project.livekit.cloud
OUTBOUND_CALLER_ID=+15551234567
```

### 5.2 Update Call Initiation Code
The code will need to use LiveKit Cloud's API to actually make the call. See the updated `agent.js` implementation.

---

## Step 6: Test the Setup

### 6.1 Test SIP Connection
1. In LiveKit Cloud dashboard, check **Telephony** status
2. Should show "Connected" or "Active"

### 6.2 Make a Test Call
Use your API to initiate a test call:

```bash
curl -X POST http://localhost:3000/api/initiate-call \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "390062197462",
    "phoneNumber": "+13462003801",
    "testMode": true
  }'
```

### 6.3 Verify Call
- Check Twilio Console → **Monitor** → **Logs** → **Calls**
- Check LiveKit Cloud dashboard for active calls
- Your phone should ring!

---

## Troubleshooting

### Issue: "SIP Authentication Failed"
- **Solution**: Verify username/password match in both Twilio and LiveKit Cloud
- Check credentials are assigned to the trunk

### Issue: "No Route to Destination"
- **Solution**: Verify SIP URI is correct in Twilio trunk origination
- Check LiveKit Cloud SIP domain is accessible

### Issue: "Call Not Connecting"
- **Solution**: 
  - Verify Twilio phone number has voice capabilities
  - Check Twilio account has sufficient balance
  - Verify LiveKit Cloud telephony is enabled

### Issue: "Invalid Phone Number Format"
- **Solution**: Ensure phone numbers are in E.164 format: `+[country code][number]`
- Example: `+13462003801` (not `13462003801` or `(346) 200-3801`)

---

## Cost Considerations

### Twilio Pricing (US)
- **Phone Number**: ~$1/month
- **Outbound Calls**: ~$0.013/minute (US)
- **Free Trial**: $15.50 credit included

### LiveKit Cloud Pricing
- Check your LiveKit Cloud plan for telephony costs
- Usually included in paid plans

---

## Security Best Practices

1. **Never commit credentials** to Git
2. **Use environment variables** for all secrets
3. **Rotate credentials** periodically
4. **Use API keys** instead of Auth Token when possible
5. **Enable 2FA** on Twilio account

---

## Next Steps

After Twilio is configured:
1. ✅ Test a call to your own number
2. ✅ Verify webhook receives function calls
3. ✅ Check HubSpot updates correctly
4. ✅ Monitor call quality and adjust settings
5. ✅ Set up call recording (optional)

---

## Support Resources

- **Twilio Docs**: https://www.twilio.com/docs
- **LiveKit Cloud Docs**: https://docs.livekit.io/cloud
- **SIP Trunking Guide**: https://www.twilio.com/docs/sip-trunking
