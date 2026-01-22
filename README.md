# Emily Voice Agent

A complete LiveKit Voice Agent integration with HubSpot CRM for Core IT's digital verification agent, Emily.

## Project Structure

This repository contains two main components:

### 1. LiveKit HubSpot Integration (`livekit-hubspot-integration/`)
The main Express.js server that handles:
- Call initiation and management
- HubSpot CRM integration
- Business hours validation (Monday-Friday, 9 AM - 5 PM CST)
- API analytics and metrics tracking
- Dynamic prompt generation with contact data

### 2. LiveKit HubSpot Serverless (`livekit-hubspot-serverless/`)
Vercel serverless functions for:
- Webhook handling from LiveKit Cloud
- Real-time HubSpot contact updates
- Health check endpoints

## Features

- ✅ **Business Hours Protection**: Calls only allowed Monday-Friday, 9 AM - 5 PM CST
- ✅ **Real-time CRM Updates**: Automatic HubSpot contact updates during calls
- ✅ **Analytics Tracking**: API usage metrics and call statistics
- ✅ **Serverless Webhooks**: Vercel-deployed webhook handlers
- ✅ **Dynamic Prompts**: Context-aware system prompts with contact data

## Quick Start

### Prerequisites
- Node.js 18+
- HubSpot account with Private App access token
- LiveKit Cloud account
- Vercel account (for serverless deployment)

### Installation

```bash
# Install dependencies for main integration
cd livekit-hubspot-integration
npm install

# Install dependencies for serverless functions
cd ../livekit-hubspot-serverless
npm install
```

### Environment Variables

#### Main Integration (`livekit-hubspot-integration/.env`)
```env
HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxx
LIVEKIT_URL=wss://your-project.livekit.cloud
WEBHOOK_SECRET=your-generated-secret
PORT=3000
NODE_ENV=production
```

#### Serverless Functions (Vercel Environment Variables)
- `HUBSPOT_ACCESS_TOKEN`: Your HubSpot private app access token

## Deployment

### Main Integration
Deploy to your preferred platform (Docker, Railway, Render, etc.)

### Serverless Functions
```bash
cd livekit-hubspot-serverless
vercel --prod
```

## API Endpoints

### Main Integration
- `POST /api/initiate-call` - Initiate a call to a HubSpot contact
- `POST /api/batch-calls` - Batch call multiple contacts
- `GET /api/business-hours` - Check current business hours status
- `GET /api/analytics` - View API usage metrics
- `GET /health` - Health check

### Serverless Functions
- `GET /` - API information
- `GET /health` - Health check
- `POST /webhooks/livekit` - LiveKit webhook handler

## Documentation

- [Setup Guide](livekit-hubspot-integration/docs/SETUP_GUIDE.md)
- [API Reference](livekit-hubspot-integration/docs/API_REFERENCE.md)

## License

MIT

## Author

Core IT
