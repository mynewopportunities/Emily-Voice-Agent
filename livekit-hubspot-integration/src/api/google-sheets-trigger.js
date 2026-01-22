/**
 * Google Sheets Integration API
 * 
 * Endpoints for triggering calls from Google Sheets data
 */

const express = require('express');
const router = express.Router();
const googleSheetsClient = require('../google-sheets/client');
const livekitAgent = require('../livekit/agent');
const logger = require('../utils/logger');
const { validateBusinessHours } = require('../utils/business-hours');
const analytics = require('../utils/analytics');

/**
 * GET /api/google-sheets/contacts-to-call
 * Returns list of contacts from Google Sheet that need verification calls
 */
router.get('/contacts-to-call', async (req, res) => {
  try {
    const {
      limit = 10,
      verificationStatus = 'not_verified',
      hasPhone = true
    } = req.query;

    const contacts = await googleSheetsClient.getContacts({
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
    logger.error('Failed to get contacts from Google Sheets', { error: error.message });
    res.status(500).json({
      error: 'Failed to get contacts',
      details: error.message
    });
  }
});

/**
 * POST /api/google-sheets/trigger-call
 * Trigger a call for a specific contact from Google Sheet
 * Can be called from N8N, manual API calls, or scheduled jobs
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

    const { rowNumber, contactId, phoneNumber } = req.body;

    if (!rowNumber && !contactId) {
      return res.status(400).json({
        error: 'Missing required field: rowNumber or contactId'
      });
    }

    // Get contact from sheet
    const contact = rowNumber 
      ? await googleSheetsClient.getContact(parseInt(rowNumber))
      : await googleSheetsClient.getContact(contactId);

    if (!contact) {
      return res.status(404).json({
        error: 'Contact not found in Google Sheet'
      });
    }

    // Use provided phone or contact's phone
    const phone = phoneNumber || contact.phone_number || contact.formatted?.phone_number;

    if (!phone) {
      return res.status(400).json({
        error: 'Contact does not have a phone number'
      });
    }

    // Validate phone number format
    if (!phone.match(/^\+[1-9]\d{1,14}$/)) {
      return res.status(400).json({
        error: 'Phone number must be in E.164 format (e.g., +14155551234)'
      });
    }

    // Format contact for call
    const contactData = googleSheetsClient.formatForCall(contact);
    
    // Add metadata to contact data so it's included in room metadata
    contactData.metadata = {
      source: 'google_sheets',
      rowNumber: contact.row_number,
      contactId: contact.contactId || contact.row_number?.toString()
    };

    // Initiate the call
    const callInfo = await livekitAgent.initiateCall(contactData, phone);

    // Store row number in call state for later updates
    livekitAgent.updateCallMetadata(callInfo.callId, {
      source: 'google_sheets',
      rowNumber: contact.row_number,
      contactId: contact.contactId || contact.row_number?.toString()
    });

    analytics.trackCallInitiated();
    logger.info(`Call triggered from Google Sheets for row ${contact.row_number}: ${callInfo.callId}`);

    res.json({
      success: true,
      callId: callInfo.callId,
      roomName: callInfo.roomName,
      rowNumber: contact.row_number,
      contactId: contact.contactId || contact.row_number?.toString(),
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
    logger.error('Failed to trigger call from Google Sheets', { error: error.message });
    res.status(500).json({
      error: 'Failed to trigger call',
      details: error.message
    });
  }
});

/**
 * POST /api/google-sheets/batch-trigger
 * Trigger calls for multiple contacts from Google Sheet
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

    const { rowNumbers, contactIds, maxConcurrent = 3 } = req.body;

    if (!rowNumbers && !contactIds) {
      return res.status(400).json({
        error: 'Missing required field: rowNumbers or contactIds array'
      });
    }

    const identifiers = rowNumbers || contactIds;
    const results = [];
    
    // Process contacts in batches
    for (let i = 0; i < identifiers.length; i += maxConcurrent) {
      const batch = identifiers.slice(i, i + maxConcurrent);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (identifier) => {
          try {
            const contact = await googleSheetsClient.getContact(identifier);
            const phone = contact.phone_number || contact.formatted?.phone_number;
            
            if (!phone || !phone.match(/^\+[1-9]\d{1,14}$/)) {
              throw new Error('Invalid or missing phone number');
            }

            const contactData = googleSheetsClient.formatForCall(contact);
            const callInfo = await livekitAgent.initiateCall(contactData, phone);

            // Store metadata
            livekitAgent.updateCallMetadata(callInfo.callId, {
              source: 'google_sheets',
              rowNumber: contact.row_number,
              contactId: contact.contactId || contact.row_number?.toString()
            });

            analytics.trackCallInitiated();
            
            return {
              rowNumber: contact.row_number,
              contactId: contact.contactId || contact.row_number?.toString(),
              success: true,
              callId: callInfo.callId,
              roomName: callInfo.roomName,
              phoneNumber: phone
            };
          } catch (error) {
            return {
              rowNumber: identifier,
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
      total: identifiers.length,
      results,
      message: 'Batch calls initiated. Dial manually from LiveKit Cloud dashboard for each call.'
    });
  } catch (error) {
    logger.error('Failed to batch trigger calls from Google Sheets', { error: error.message });
    res.status(500).json({
      error: 'Failed to batch trigger calls',
      details: error.message
    });
  }
});

module.exports = router;
