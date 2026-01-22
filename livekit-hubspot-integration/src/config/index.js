/**
 * Configuration Management
 * Centralizes all environment variables and configuration
 */

require('dotenv').config();

const config = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // HubSpot
  hubspot: {
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
    apiVersion: 'v3',
  },
  
  // LiveKit
  livekit: {
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
    url: process.env.LIVEKIT_URL,
  },
  
  // Webhooks
  webhookSecret: process.env.WEBHOOK_SECRET,
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Agent Settings
  agent: {
    name: 'Emily',
    company: 'Core IT',
    voiceId: process.env.VOICE_ID || 'default', // Configure based on your TTS provider
  },
};

// Validation
function validateConfig() {
  const required = [
    ['HUBSPOT_ACCESS_TOKEN', config.hubspot.accessToken],
    ['LIVEKIT_API_KEY', config.livekit.apiKey],
    ['LIVEKIT_API_SECRET', config.livekit.apiSecret],
    ['LIVEKIT_URL', config.livekit.url],
    ['WEBHOOK_SECRET', config.webhookSecret],
  ];
  
  const missing = required.filter(([name, value]) => !value);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map(([name]) => name).join(', ')}`
    );
  }
}

// Only validate in production
if (config.nodeEnv === 'production') {
  validateConfig();
}

module.exports = config;
