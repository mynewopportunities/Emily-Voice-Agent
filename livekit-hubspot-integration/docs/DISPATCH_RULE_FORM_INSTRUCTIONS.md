# Dispatch Rule Creation - Form View Instructions

Since the JSON editor isn't working, use the **FORM VIEW** instead.

## Step-by-Step Instructions

### 1. Switch to Form View
- Click the **"DISPATCH RULE DETAILS"** tab (not JSON Editor)
- This should show a form with fields

### 2. Fill in Basic Fields

**Rule Name:**
```
Emily Voice Agent
```

**Rule Type:**
- Select: **Individual** (should already be selected)

**Room Prefix:**
```
verification-call-
```

**Phone Numbers:**
- Click "+ Add phone number" or similar button
- Enter: `+13464461101`

**Trunk:**
- Select or enter: `PN_PPN_ACRcLgLG8e2t`

### 3. Add Agent Configuration

Look for a button like:
- **"+ Add agent"**
- **"Add Agent"**
- **"Configure Agent"**

Click it to open the agent configuration form.

### 4. Configure Agent in Form

**Agent Name:**
```
Emily
```

**System Prompt:**
```
You are Emily, Core IT's digital verification agent. Your role is to verify contact information for HubSpot CRM records. Be professional, friendly, and concise. Always confirm information before updating records.
```

**LLM Settings:**
- Provider: **OpenAI**
- Model: **gpt-4-turbo**
- Temperature: **0.7**
- Max Tokens: **500**

**TTS Settings:**
- Provider: **ElevenLabs**
- Voice: **Rachel**

**STT Settings:**
- Provider: **Deepgram**
- Model: **nova-2**

**Functions:**
- Look for "Add Function" or "Functions" section
- Add each function one by one (or import from JSON if option available)

### 5. Alternative: Create Agent Separately First

If the form doesn't have an "Add agent" button:

1. **Go to Agents section** in LiveKit Cloud dashboard
2. **Create a new agent** named "Emily"
3. Configure all the settings there
4. **Then come back to dispatch rule**
5. **Select the "Emily" agent** from a dropdown

### 6. Check for Validation Errors

- Press **F12** in your browser
- Open **Console** tab
- Look for any red error messages
- These will tell you exactly what's missing

### 7. If Still Not Working

Try creating the dispatch rule with **MINIMAL configuration first**:
- Just room prefix
- Just trunk
- Just phone number
- **No agent** (add agent later)

Then edit the rule after creation to add the agent.
