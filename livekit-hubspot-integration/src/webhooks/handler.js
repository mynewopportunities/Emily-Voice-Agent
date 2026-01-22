/**
 * Webhook Handler
 * Processes webhooks from LiveKit for function calls
 */

const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');
const hubspotClient = require('../hubspot/client');
const livekitAgent = require('../livekit/agent');

class WebhookHandler {
  /**
   * Validates webhook signature
   * @param {string} payload - Raw request body
   * @param {string} signature - Signature from header
   * @returns {boolean} - Whether signature is valid
   */
  validateSignature(payload, signature) {
    if (!config.webhookSecret) {
      logger.warn('Webhook secret not configured, skipping validation');
      return true;
    }

    const expectedSignature = crypto
      .createHmac('sha256', config.webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature || ''),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Main webhook handler
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async handleWebhook(req, res) {
    try {
      // Validate signature
      const signature = req.headers['x-livekit-signature'];
      const isValid = this.validateSignature(JSON.stringify(req.body), signature);

      if (!isValid) {
        logger.warn('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const event = req.body;
      logger.info('Received webhook', { type: event.type });

      // Route to appropriate handler
      switch (event.type) {
        case 'function_call':
          await this.handleFunctionCall(event);
          break;
        case 'room_finished':
          await this.handleRoomFinished(event);
          break;
        case 'participant_left':
          await this.handleParticipantLeft(event);
          break;
        default:
          logger.info(`Unhandled webhook type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Webhook processing error', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handles function call events from the agent
   * @param {Object} event - Function call event
   */
  async handleFunctionCall(event) {
    const { functionName, parameters, callId, roomName } = event;

    logger.info(`Processing function call: ${functionName}`, { callId, parameters });

    // Get call state to find contact ID
    const callState = livekitAgent.getCallState(callId);
    
    if (!callState) {
      logger.error(`Call state not found for ${callId}`);
      return;
    }

    const contactId = callState.contactId;

    // Update local call state
    livekitAgent.updateCallState(callId, functionName, parameters);

    // Route to appropriate HubSpot update
    try {
      switch (functionName) {
        case 'record_gatekeeper':
          await hubspotClient.recordGatekeeper(contactId, parameters.full_name);
          break;

        case 'verify_address':
          await hubspotClient.updateAddress(
            contactId,
            parameters.confirmed,
            parameters.corrected_address
          );
          break;

        case 'verify_email':
          await hubspotClient.updateEmail(
            contactId,
            parameters.confirmed,
            parameters.corrected_email
          );
          break;

        case 'verify_dm':
          await hubspotClient.updateDecisionMaker(
            contactId,
            parameters.confirmed,
            parameters.still_employed,
            parameters.corrected_name,
            parameters.notes
          );
          break;

        case 'collect_direct_number':
          await hubspotClient.updateDirectNumber(
            contactId,
            parameters.provided,
            parameters.phone_number,
            parameters.notes
          );
          break;

        case 'end_call':
          await hubspotClient.endCall(
            contactId,
            parameters.outcome,
            parameters.notes
          );
          // Log the call in HubSpot
          await this.logCallToHubSpot(callId);
          // Cleanup
          await livekitAgent.endCall(callId);
          break;

        case 'complete_call':
          await hubspotClient.completeCall(
            contactId,
            parameters.outcome,
            parameters.notes
          );
          // Log the call in HubSpot
          await this.logCallToHubSpot(callId);
          // Cleanup
          await livekitAgent.endCall(callId);
          break;

        default:
          logger.warn(`Unknown function: ${functionName}`);
      }

      logger.info(`HubSpot updated for ${functionName}`, { contactId });
    } catch (error) {
      logger.error(`Failed to update HubSpot for ${functionName}`, { 
        error: error.message,
        contactId,
      });
    }
  }

  /**
   * Logs completed call to HubSpot as an engagement
   * @param {string} callId - Call identifier
   */
  async logCallToHubSpot(callId) {
    const summary = livekitAgent.getCallSummary(callId);
    
    if (!summary) {
      logger.warn(`Cannot log call - summary not found for ${callId}`);
      return;
    }

    // Build notes from collected data
    const notes = this.buildCallNotes(summary);

    await hubspotClient.logCall(summary.contactId, {
      duration: summary.duration,
      outcome: summary.status === 'completed' ? 'success' : summary.endReason,
      notes,
    });
  }

  /**
   * Builds human-readable notes from collected data
   * @param {Object} summary - Call summary
   * @returns {string} - Formatted notes
   */
  buildCallNotes(summary) {
    const lines = [
      `Call ID: ${summary.callId}`,
      `Status: ${summary.status}`,
      `Duration: ${Math.round(summary.duration / 1000)} seconds`,
      '',
      'Collected Information:',
    ];

    const { collectedData } = summary;

    if (collectedData.record_gatekeeper) {
      lines.push(`- Gatekeeper: ${collectedData.record_gatekeeper.full_name}`);
    }

    if (collectedData.verify_address) {
      const addr = collectedData.verify_address;
      lines.push(`- Address: ${addr.confirmed ? 'Confirmed' : `Updated to: ${addr.corrected_address}`}`);
    }

    if (collectedData.verify_email) {
      const email = collectedData.verify_email;
      lines.push(`- Email: ${email.confirmed ? 'Confirmed' : `Updated to: ${email.corrected_email}`}`);
    }

    if (collectedData.verify_dm) {
      const dm = collectedData.verify_dm;
      const status = dm.still_employed ? 'still employed' : 'no longer with company';
      const name = dm.confirmed ? dm.dm_name : dm.corrected_name;
      lines.push(`- IT Decision Maker: ${name} (${status})`);
      if (dm.notes) {
        lines.push(`  Note: ${dm.notes}`);
      }
    }

    if (collectedData.collect_direct_number) {
      const num = collectedData.collect_direct_number;
      if (num.provided) {
        lines.push(`- Direct Number: ${num.phone_number}`);
      } else {
        lines.push(`- Direct Number: Not provided${num.notes ? ` (${num.notes})` : ''}`);
      }
    }

    if (summary.endReason) {
      lines.push('', `End Reason: ${summary.endReason}`);
    }

    return lines.join('\n');
  }

  /**
   * Handles room finished events
   * @param {Object} event - Room finished event
   */
  async handleRoomFinished(event) {
    const { roomName } = event;
    logger.info(`Room finished: ${roomName}`);

    // Find and cleanup any associated calls
    const calls = livekitAgent.listActiveCalls();
    const call = calls.find(c => c.roomName === roomName);

    if (call && call.status !== 'completed' && call.status !== 'ended_early') {
      // Call ended unexpectedly
      logger.warn(`Call ${call.callId} ended unexpectedly`);
      
      // Update HubSpot
      await hubspotClient.endCall(call.contactId, 'other', 'Call disconnected unexpectedly');
      await this.logCallToHubSpot(call.callId);
      await livekitAgent.endCall(call.callId);
    }
  }

  /**
   * Handles participant left events
   * @param {Object} event - Participant left event
   */
  async handleParticipantLeft(event) {
    const { roomName, participantIdentity } = event;
    logger.info(`Participant left: ${participantIdentity} from ${roomName}`);
    
    // Handle if the prospect hung up before completion
    // The room_finished event will handle final cleanup
  }
}

module.exports = new WebhookHandler();
