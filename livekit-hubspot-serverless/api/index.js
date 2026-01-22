/**
 * Root endpoint - API information
 */
export default function handler(req, res) {
  res.status(200).json({
    service: 'LiveKit Google Sheets Webhook Handler',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      webhook: '/webhooks/livekit (POST only)'
    },
    timestamp: new Date().toISOString()
  });
}
