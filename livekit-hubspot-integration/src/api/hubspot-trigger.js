/**
 * HubSpot Free Tier Integration
 * 
 * Since HubSpot Free tier doesn't have Workflows, we provide:
 * 1. API endpoint to trigger calls manually
 * 2. Scheduled job to check for contacts needing verification
 * 3. Custom action integration options
 */

const express = require('express');
const router = express.Router();
const hubspotClient = require('../hubspot/client');
const livekitAgent = require('../livekit/agent');
const logger = require('../utils/logger');
const { validateBusinessHours } = require('../utils/business-hours');
const analytics = require('../utils/analytics');

/**
 * GET /api/hubspot/contacts-to-call
 * Returns list of contacts that need verification calls
 * Can be used with external automation tools (Zapier, Make.com, etc.)
 */
router.get('/contacts-to-call', async (req, res) => {
  try {
    const { 
      limit = 10,
      verificationStatus = 'not_verified',
      hasPhone = true 
    } = req.query;

    // Get contacts from HubSpot that need verification
    const contacts = await hubspotClient.getContactsNeedingVerification({
      limit: parseInt(limit),
      verificationStatus,
      hasPhone: hasPhone === 'true'
    });

    res.json({
      success: true,
      contacts,
      count: contacts.length,
      message: 'Contacts ready for verification calls'
    });
  } catch (error) {
    logger.error('Failed to get contacts to call', { error: error.message });
    res.status(500).json({
      error: 'Failed to get contacts',
      details: error.message
    });
  }
});

/**
 * POST /api/hubspot/trigger-call
 * Manually trigger a call for a specific HubSpot contact
 * Can be called from HubSpot custom actions, Zapier, or manually
 */
router.post('/trigger-call', async (req, res) => {
  try {
    const testMode = req.body.testMode === true || process.env.TEST_MODE === 'true';
    
    if (!testMode) {
      try {
        validateBusinessHours();
      } catch (businessHoursError) {
        analytics.trackBusinessHoursBlock();
        return res.status(403).json({
          error: 'Call outside business hours',
          message: businessHoursError.message
        });
      }
    }

    const { contactId, phoneNumber } = req.body;

    if (!contactId) {
      return res.status(400).json({
        error: 'Missing required field: contactId'
      });
    }

    // If phone number not provided, fetch from HubSpot
    let phone = phoneNumber;
    if (!phone) {
      const contact = await hubspotClient.getContactForCall(contactId);
      phone = contact.formatted.phone_number;
      
      if (!phone) {
        return res.status(400).json({
          error: 'Contact does not have a phone number'
        });
      }
    }

    // Validate phone number format
    if (!phone.match(/^\+[1-9]\d{1,14}$/)) {
      return res.status(400).json({
        error: 'Phone number must be in E.164 format (e.g., +14155551234)'
      });
    }

    // Fetch contact data
    const contactData = await hubspotClient.getContactForCall(contactId);

    // Initiate the call
    const callInfo = await livekitAgent.initiateCall(contactData, phone);

    analytics.trackCallInitiated();
    logger.info(`Call triggered from HubSpot for contact ${contactId}: ${callInfo.callId}`);

    res.json({
      success: true,
      callId: callInfo.callId,
      roomName: callInfo.roomName,
      contactId,
      phoneNumber: phone,
      message: 'Call initiated successfully. Dial manually from LiveKit Cloud dashboard.',
      instructions: {
        step1: 'Go to LiveKit Cloud dashboard',
        step2: 'Open agent "Emily"',
        step3: 'Click "Make a call"',
        step4: `Enter phone number: ${phone}`,
        step5: 'Agent will join the room automatically'
      }
    });
  } catch (error) {
    logger.error('Failed to trigger call from HubSpot', { error: error.message });
    res.status(500).json({
      error: 'Failed to trigger call',
      details: error.message
    });
  }
});

/**
 * POST /api/hubspot/batch-trigger
 * Trigger calls for multiple contacts
 * Useful for scheduled jobs or batch processing
 */
router.post('/batch-trigger', async (req, res) => {
  try {
    const testMode = req.body.testMode === true || process.env.TEST_MODE === 'true';
    
    if (!testMode) {
      try {
        validateBusinessHours();
      } catch (businessHoursError) {
        return res.status(403).json({
          error: 'Call outside business hours',
          message: businessHoursError.message
        });
      }
    }

    const { contactIds, maxConcurrent = 3 } = req.body;

    if (!contactIds || !Array.isArray(contactIds)) {
      return res.status(400).json({
        error: 'Missing or invalid contactIds array'
      });
    }

    const results = [];
    
    // Process contacts in batches
    for (let i = 0; i < contactIds.length; i += maxConcurrent) {
      const batch = contactIds.slice(i, i + maxConcurrent);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (contactId) => {
          try {
            const contact = await hubspotClient.getContactForCall(contactId);
            const phone = contact.formatted.phone_number;
            
            if (!phone || !phone.match(/^\+[1-9]\d{1,14}$/)) {
              throw new Error('Invalid or missing phone number');
            }

            const callInfo = await livekitAgent.initiateCall(contact, phone);
            analytics.trackCallInitiated();
            
            return {
              contactId,
              success: true,
              callId: callInfo.callId,
              roomName: callInfo.roomName,
              phoneNumber: phone
            };
          } catch (error) {
            return {
              contactId,
              success: false,
              error: error.message
            };
          }
        })
      );

      results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : r.reason));
    }

    res.json({
      success: true,
      total: contactIds.length,
      results,
      message: 'Batch calls initiated. Dial manually from LiveKit Cloud dashboard for each call.'
    });
  } catch (error) {
    logger.error('Failed to batch trigger calls', { error: error.message });
    res.status(500).json({
      error: 'Failed to batch trigger calls',
      details: error.message
    });
  }
});

module.exports = router;
