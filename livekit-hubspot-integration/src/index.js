/**
 * Main Express Server
 * Entry point for the LiveKit-HubSpot integration
 */

const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const hubspotClient = require('./hubspot/client');
const livekitAgent = require('./livekit/agent');
const webhookHandler = require('./webhooks/handler');
const { validateBusinessHours, isBusinessHours } = require('./utils/business-hours');
const analytics = require('./utils/analytics');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging and analytics tracking
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.info(`${req.method} ${req.path}`, { 
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Track response when it finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    analytics.trackRequest(req.method, req.path, res.statusCode, duration);
  });

  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Business hours check
app.get('/api/business-hours', (req, res) => {
  const check = isBusinessHours();
  res.json(check);
});

// Analytics/metrics endpoint
app.get('/api/analytics', (req, res) => {
  const metrics = analytics.getMetrics();
  res.json({
    timestamp: new Date().toISOString(),
    metrics,
  });
});

/**
 * POST /api/initiate-call
 * Initiates a call to a HubSpot contact
 */
app.post('/api/initiate-call', async (req, res) => {
  try {
    // Check business hours first
    try {
      validateBusinessHours();
    } catch (businessHoursError) {
      analytics.trackBusinessHoursBlock();
      analytics.trackCallBlocked();
      return res.status(403).json({ 
        error: 'Call outside business hours',
        message: businessHoursError.message
      });
    }

    const { contactId, phoneNumber } = req.body;

    if (!contactId || !phoneNumber) {
      return res.status(400).json({ 
        error: 'Missing required fields: contactId and phoneNumber' 
      });
    }

    // Validate phone number format (basic E.164 check)
    if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      return res.status(400).json({ 
        error: 'Phone number must be in E.164 format (e.g., +14155551234)' 
      });
    }

    // Fetch contact data from HubSpot
    const contactData = await hubspotClient.getContactForCall(contactId);

    // Initiate the call
    const callInfo = await livekitAgent.initiateCall(contactData, phoneNumber);

    analytics.trackCallInitiated();
    logger.info(`Call initiated: ${callInfo.callId}`);

    res.json({
      success: true,
      callId: callInfo.callId,
      roomName: callInfo.roomName,
      message: 'Call initiated successfully',
    });
  } catch (error) {
    logger.error('Failed to initiate call', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to initiate call',
      details: error.message,
    });
  }
});

/**
 * POST /api/batch-calls
 * Initiates calls to multiple contacts from a HubSpot list
 */
app.post('/api/batch-calls', async (req, res) => {
  try {
    // Check business hours first
    try {
      validateBusinessHours();
    } catch (businessHoursError) {
      analytics.trackBusinessHoursBlock();
      analytics.trackCallBlocked();
      return res.status(403).json({ 
        error: 'Call outside business hours',
        message: businessHoursError.message
      });
    }

    const { listId, maxConcurrent = 5 } = req.body;

    if (!listId) {
      return res.status(400).json({ error: 'Missing required field: listId' });
    }

    // Get contacts from list
    const contacts = await hubspotClient.getContactsFromList(listId, 100);

    // Filter contacts with valid phone numbers
    const validContacts = contacts.filter(c => {
      const phone = c.raw.phone;
      return phone && phone.match(/^\+[1-9]\d{1,14}$/);
    });

    logger.info(`Found ${validContacts.length} valid contacts for batch calling`);

    // Initiate calls (respecting max concurrent)
    const results = [];
    
    for (let i = 0; i < validContacts.length; i += maxConcurrent) {
      const batch = validContacts.slice(i, i + maxConcurrent);
      
      const batchResults = await Promise.allSettled(
        batch.map(contact => 
          livekitAgent.initiateCall(contact, contact.raw.phone)
        )
      );

      results.push(...batchResults.map((result, idx) => {
        if (result.status === 'fulfilled') {
          analytics.trackCallInitiated();
        }
        return {
          contactId: batch[idx].contactId,
          status: result.status,
          callId: result.status === 'fulfilled' ? result.value.callId : null,
          error: result.status === 'rejected' ? result.reason.message : null,
        };
      }));

      // Small delay between batches
      if (i + maxConcurrent < validContacts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    res.json({
      success: true,
      totalContacts: contacts.length,
      validContacts: validContacts.length,
      results,
    });
  } catch (error) {
    logger.error('Failed to initiate batch calls', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to initiate batch calls',
      details: error.message,
    });
  }
});

/**
 * GET /api/call-status/:callId
 * Gets the status of a call
 */
app.get('/api/call-status/:callId', (req, res) => {
  const { callId } = req.params;

  const summary = livekitAgent.getCallSummary(callId);

  if (!summary) {
    return res.status(404).json({ error: 'Call not found' });
  }

  res.json(summary);
});

/**
 * GET /api/active-calls
 * Lists all active calls
 */
app.get('/api/active-calls', (req, res) => {
  const calls = livekitAgent.listActiveCalls();
  res.json({ calls, count: calls.length });
});

/**
 * POST /api/end-call/:callId
 * Manually ends a call
 */
app.post('/api/end-call/:callId', async (req, res) => {
  const { callId } = req.params;

  try {
    await livekitAgent.endCall(callId);
    res.json({ success: true, message: 'Call ended' });
  } catch (error) {
    logger.error(`Failed to end call ${callId}`, { error: error.message });
    res.status(500).json({ error: 'Failed to end call' });
  }
});

/**
 * POST /webhooks/livekit
 * Receives webhooks from LiveKit
 */
app.post('/webhooks/livekit', (req, res) => {
  webhookHandler.handleWebhook(req, res);
});

/**
 * POST /api/setup-hubspot
 * Creates custom properties in HubSpot (run once during setup)
 */
app.post('/api/setup-hubspot', async (req, res) => {
  try {
    await hubspotClient.setupCustomProperties();
    res.json({ success: true, message: 'HubSpot properties created' });
  } catch (error) {
    logger.error('Failed to setup HubSpot', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to setup HubSpot properties',
      details: error.message,
    });
  }
});

/**
 * GET /api/preview-prompt/:contactId
 * Preview the compiled prompt for a contact (for debugging)
 */
app.get('/api/preview-prompt/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const contactData = await hubspotClient.getContactForCall(contactId);
    const { compilePrompt } = require('./livekit/prompt-template');
    const prompt = compilePrompt(contactData.formatted);
    
    res.json({
      contactId,
      rawData: contactData.raw,
      formattedData: contactData.formatted,
      compiledPrompt: prompt,
    });
  } catch (error) {
    logger.error('Failed to preview prompt', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`LiveKit URL: ${config.livekit.url}`);
});

module.exports = app;
