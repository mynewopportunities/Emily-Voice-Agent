# API Reference

## Base URL

```
http://localhost:3000
```

For production, replace with your deployed server URL.

---

## Endpoints

### Health Check

Check if the server is running.

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

---

### Initiate Call

Start a verification call to a HubSpot contact.

```http
POST /api/initiate-call
Content-Type: application/json
```

**Request Body:**
```json
{
  "contactId": "123456789",
  "phoneNumber": "+14155551234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contactId` | string | Yes | HubSpot contact ID |
| `phoneNumber` | string | Yes | Phone number in E.164 format |

**Success Response (200):**
```json
{
  "success": true,
  "callId": "550e8400-e29b-41d4-a716-446655440000",
  "roomName": "verification-call-550e8400-e29b-41d4-a716-446655440000",
  "message": "Call initiated successfully"
}
```

**Error Response (400):**
```json
{
  "error": "Phone number must be in E.164 format (e.g., +14155551234)"
}
```

---

### Batch Calls

Initiate calls to multiple contacts from a HubSpot list.

```http
POST /api/batch-calls
Content-Type: application/json
```

**Request Body:**
```json
{
  "listId": "12345",
  "maxConcurrent": 5
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `listId` | string | Yes | - | HubSpot list ID |
| `maxConcurrent` | number | No | 5 | Max simultaneous calls |

**Response:**
```json
{
  "success": true,
  "totalContacts": 50,
  "validContacts": 45,
  "results": [
    {
      "contactId": "123456789",
      "status": "fulfilled",
      "callId": "550e8400-e29b-41d4-a716-446655440000",
      "error": null
    },
    {
      "contactId": "987654321",
      "status": "rejected",
      "callId": null,
      "error": "Invalid phone number format"
    }
  ]
}
```

---

### Get Call Status

Get the current status of a call.

```http
GET /api/call-status/:callId
```

**Response:**
```json
{
  "callId": "550e8400-e29b-41d4-a716-446655440000",
  "contactId": "123456789",
  "phoneNumber": "+14155551234",
  "status": "in_progress",
  "duration": 45000,
  "startTime": "2024-01-15T10:30:00.000Z",
  "endTime": null,
  "collectedData": {
    "record_gatekeeper": {
      "full_name": "Sarah Johnson",
      "first_name": "Sarah",
      "timestamp": 1705314600000
    },
    "verify_address": {
      "confirmed": true,
      "timestamp": 1705314615000
    }
  },
  "endReason": null
}
```

**Call Status Values:**
- `initiating` - Call is being set up
- `in_progress` - Call is active
- `completed` - Call finished successfully
- `ended_early` - Call ended before completion

---

### List Active Calls

Get all currently active calls.

```http
GET /api/active-calls
```

**Response:**
```json
{
  "calls": [
    {
      "callId": "550e8400-e29b-41d4-a716-446655440000",
      "contactId": "123456789",
      "status": "in_progress",
      "duration": 45000
    }
  ],
  "count": 1
}
```

---

### End Call

Manually end an active call.

```http
POST /api/end-call/:callId
```

**Response:**
```json
{
  "success": true,
  "message": "Call ended"
}
```

---

### Preview Prompt

Preview the compiled system prompt for a contact. Useful for debugging.

```http
GET /api/preview-prompt/:contactId
```

**Response:**
```json
{
  "contactId": "123456789",
  "rawData": {
    "firstname": "John",
    "lastname": "Doe",
    "email": "john.doe@acme.com",
    "phone": "+14155551234",
    "company": "Acme Technologies",
    "address": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94102",
    "it_decision_maker": "Jane Smith"
  },
  "formattedData": {
    "company_name": "Acme Technologies",
    "physical_address": "123 Main St, San Francisco, CA, 94102",
    "email_address": "john.doe@acme.com",
    "email_spelled": "john dot doe at acme dot com",
    "dm_name": "Jane Smith",
    "phone_number": "+14155551234"
  },
  "compiledPrompt": "You are Emily, Core IT's digital verification agent..."
}
```

---

### Setup HubSpot

Create required custom properties in HubSpot. Run once during initial setup.

```http
POST /api/setup-hubspot
```

**Response:**
```json
{
  "success": true,
  "message": "HubSpot properties created"
}
```

---

## Webhooks

### LiveKit Webhook

Receives events from LiveKit Cloud.

```http
POST /webhooks/livekit
X-LiveKit-Signature: <signature>
Content-Type: application/json
```

**Event Types:**

#### function_call
Triggered when the agent calls a function.

```json
{
  "type": "function_call",
  "callId": "550e8400-e29b-41d4-a716-446655440000",
  "roomName": "verification-call-550e8400...",
  "functionName": "verify_address",
  "parameters": {
    "confirmed": true
  }
}
```

#### room_finished
Triggered when a call room is closed.

```json
{
  "type": "room_finished",
  "roomName": "verification-call-550e8400..."
}
```

#### participant_left
Triggered when someone leaves the call.

```json
{
  "type": "participant_left",
  "roomName": "verification-call-550e8400...",
  "participantIdentity": "pstn-participant"
}
```

---

## Function Definitions

These functions are available to the voice agent:

### end_call

End the call early.

```json
{
  "outcome": "not_available|declined|wrong_number|other",
  "notes": "Optional context"
}
```

### record_gatekeeper

Record who answered the phone.

```json
{
  "full_name": "Sarah Johnson",
  "first_name": "Sarah"
}
```

### verify_address

Verify or update the physical address.

```json
{
  "confirmed": true,
  "address": "123 Main St, SF, CA 94102"
}
```
or
```json
{
  "confirmed": false,
  "corrected_address": "456 Oak Ave, SF, CA 94103"
}
```

### verify_email

Verify or update the email address.

```json
{
  "confirmed": true,
  "email": "john@acme.com"
}
```
or
```json
{
  "confirmed": false,
  "corrected_email": "john.doe@acme.com"
}
```

### verify_dm

Verify IT Decision Maker information.

```json
{
  "confirmed": true,
  "still_employed": true,
  "dm_name": "Jane Smith"
}
```
or
```json
{
  "confirmed": false,
  "still_employed": false,
  "corrected_name": "Bob Wilson",
  "notes": "Jane Smith left 3 months ago"
}
```

### collect_direct_number

Record DM's direct phone number.

```json
{
  "provided": true,
  "phone_number": "+14155559999"
}
```
or
```json
{
  "provided": false,
  "notes": "Company policy prevents sharing"
}
```

### complete_call

Mark the call as successfully completed.

```json
{
  "outcome": "success|partial|callback_requested",
  "notes": "Optional summary"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid webhook signature |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Rate Limits

- HubSpot API: 100 requests per 10 seconds
- LiveKit: Based on your plan
- Server: No built-in rate limiting (add if needed)
