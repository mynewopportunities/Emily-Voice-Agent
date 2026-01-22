/**
 * Root endpoint - API information
 */
export default function handler(req, res) {
  res.status(200).json({
    service: 'LiveKit HubSpot Webhook Handler',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      webhook: '/webhooks/livekit (POST only)'
    },
    timestamp: new Date().toISOString()
  });
}
