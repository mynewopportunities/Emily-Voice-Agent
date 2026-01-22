# LiveKit Voice Agent + HubSpot CRM Integration

A complete solution for running Emily, Core IT's digital verification agent, with full HubSpot CRM integration.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    HubSpot      │────▶│  Node.js Server  │────▶│  LiveKit Cloud  │
│    CRM          │     │  (Middleware)    │     │  Voice Agent    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        ▲                        │                        │
        │                        │                        │
        └────────────────────────┴────────────────────────┘
                    Function call results update CRM
```

## Features

- **Pre-call data fetch**: Pulls prospect data from HubSpot before initiating calls
- **Dynamic prompt generation**: Injects CRM data into the agent's system prompt
- **Real-time CRM updates**: Function calls from the voice agent update HubSpot in real-time
- **Call logging**: Automatically logs call outcomes and notes to HubSpot
- **Webhook support**: Handles LiveKit function call webhooks

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `HUBSPOT_ACCESS_TOKEN` - Your HubSpot private app access token
- `LIVEKIT_API_KEY` - LiveKit Cloud API key
- `LIVEKIT_API_SECRET` - LiveKit Cloud API secret
- `LIVEKIT_URL` - Your LiveKit Cloud URL (e.g., wss://your-app.livekit.cloud)
- `WEBHOOK_SECRET` - Secret for validating webhooks (generate a random string)

### 3. HubSpot Setup

Create these custom properties in HubSpot Contacts:

| Property Name | Internal Name | Type |
|---------------|---------------|------|
| IT Decision Maker | `it_decision_maker` | Single-line text |
| IT DM Direct Number | `it_dm_direct_number` | Phone number |
| Gatekeeper Name | `gatekeeper_name` | Single-line text |
| Last Verification Date | `last_verification_date` | Date |
| Verification Status | `verification_status` | Dropdown |
| DM Employment Status | `dm_employment_status` | Dropdown |

### 4. Run the Server

```bash
# Development
npm run dev

# Production
npm start
```

### 5. Configure LiveKit Cloud

1. Go to your LiveKit Cloud dashboard
2. Set the webhook URL to: `https://your-server.com/webhooks/livekit`
3. Configure the agent with the functions defined in `src/livekit/functions.json`

## Project Structure

```
├── src/
│   ├── index.js              # Main Express server
│   ├── config/
│   │   └── index.js          # Configuration management
│   ├── hubspot/
│   │   ├── client.js         # HubSpot API client
│   │   └── properties.js     # Custom property definitions
│   ├── livekit/
│   │   ├── agent.js          # LiveKit agent management
│   │   ├── functions.json    # Function definitions for LiveKit
│   │   └── prompt-template.js # System prompt with Handlebars
│   ├── webhooks/
│   │   └── handler.js        # Webhook processing
│   └── utils/
│       ├── email-formatter.js # Email spelling utility
│       └── logger.js         # Logging utility
├── .env.example
├── package.json
└── README.md
```

## API Endpoints

### POST /api/initiate-call
Initiates a call to a HubSpot contact.

```json
{
  "contactId": "123456789",
  "phoneNumber": "+1234567890"
}
```

### POST /api/batch-calls
Initiates calls to multiple contacts from a HubSpot list.

```json
{
  "listId": "12345",
  "maxConcurrent": 5
}
```

### POST /webhooks/livekit
Receives function call webhooks from LiveKit.

### GET /api/call-status/:callId
Gets the status of an ongoing or completed call.

## Function Calls

The voice agent can trigger these functions during a call:

| Function | Description |
|----------|-------------|
| `record_gatekeeper` | Records the name of the person who answered |
| `verify_address` | Confirms or updates the physical address |
| `verify_email` | Confirms or updates the email address |
| `verify_dm` | Confirms IT Decision Maker details |
| `collect_direct_number` | Records DM's direct phone number |
| `end_call` | Ends call early with reason |
| `complete_call` | Marks call as successfully completed |

## Troubleshooting

### Variables showing as "[insert value]"
- Ensure HubSpot contact has the required fields populated
- Check that the contact ID is correct
- Verify HubSpot API token has read permissions

### Function calls not updating HubSpot
- Verify webhook URL is accessible from the internet
- Check webhook secret matches in LiveKit and .env
- Review logs for API errors

### Call not initiating
- Verify LiveKit credentials are correct
- Ensure phone number is in E.164 format
- Check LiveKit Cloud dashboard for errors

## License

MIT
