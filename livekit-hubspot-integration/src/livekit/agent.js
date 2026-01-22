/**
 * LiveKit Agent Management
 * Handles creating rooms, dispatching agents, and managing calls
 */

const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');
const { compilePrompt } = require('./prompt-template');
const functions = require('./functions.json');

class LiveKitAgent {
  constructor() {
    this.roomService = new RoomServiceClient(
      config.livekit.url.replace('wss://', 'https://'),
      config.livekit.apiKey,
      config.livekit.apiSecret
    );
    
    // Track active calls
    this.activeCalls = new Map();
  }

  /**
   * Initiates a call to a prospect
   * @param {Object} contactData - Formatted contact data from HubSpot
   * @param {string} phoneNumber - Phone number to call (E.164 format)
   * @returns {Object} - Call session info
   */
  async initiateCall(contactData, phoneNumber) {
    const callId = uuidv4();
    const roomName = `verification-call-${callId}`;

    try {
      logger.info(`Initiating call ${callId} to ${phoneNumber}`);

      // Create the room
      const room = await this.roomService.createRoom({
        name: roomName,
        emptyTimeout: 300, // 5 minutes
        maxParticipants: 3, // Agent, PSTN participant, potential supervisor
        metadata: JSON.stringify({
          callId,
          contactId: contactData.contactId,
          phoneNumber,
          startTime: Date.now(),
        }),
      });

      // Compile the system prompt with contact data
      const systemPrompt = compilePrompt(contactData.formatted);

      // Generate agent token
      const agentToken = await this.generateAgentToken(roomName, callId);

      // Store call state
      const callState = {
        callId,
        roomName,
        contactId: contactData.contactId,
        contactData: contactData.formatted,
        phoneNumber,
        status: 'initiating',
        startTime: Date.now(),
        systemPrompt,
        collectedData: {},
      };
      
      this.activeCalls.set(callId, callState);

      logger.info(`Call ${callId} room created: ${roomName}`);

      // Return configuration for LiveKit Cloud
      // The actual agent dispatch depends on your LiveKit Cloud setup
      return {
        callId,
        roomName,
        agentToken,
        agentConfig: {
          systemPrompt,
          functions: functions.functions,
          voice: {
            provider: 'elevenlabs', // or your TTS provider
            voiceId: config.agent.voiceId,
          },
          stt: {
            provider: 'deepgram', // or your STT provider
          },
          phoneNumber, // For SIP/PSTN integration
        },
      };
    } catch (error) {
      logger.error(`Failed to initiate call ${callId}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Generates an access token for the agent
   * @param {string} roomName - Room to join
   * @param {string} callId - Call identifier
   * @returns {string} - JWT token
   */
  async generateAgentToken(roomName, callId) {
    const token = new AccessToken(
      config.livekit.apiKey,
      config.livekit.apiSecret,
      {
        identity: `emily-agent-${callId}`,
        name: 'Emily',
        metadata: JSON.stringify({ role: 'agent', callId }),
      }
    );

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return token.toJwt();
  }

  /**
   * Updates call state with collected data
   * @param {string} callId - Call identifier
   * @param {string} functionName - Function that was called
   * @param {Object} data - Data from the function call
   */
  updateCallState(callId, functionName, data) {
    const callState = this.activeCalls.get(callId);
    
    if (!callState) {
      logger.warn(`Call ${callId} not found in active calls`);
      return;
    }

    // Store the collected data
    callState.collectedData[functionName] = {
      ...data,
      timestamp: Date.now(),
    };

    // Update status based on function
    if (functionName === 'complete_call') {
      callState.status = 'completed';
      callState.endTime = Date.now();
    } else if (functionName === 'end_call') {
      callState.status = 'ended_early';
      callState.endTime = Date.now();
      callState.endReason = data.outcome;
    } else {
      callState.status = 'in_progress';
    }

    this.activeCalls.set(callId, callState);
    
    logger.info(`Call ${callId} state updated`, { functionName, status: callState.status });
  }

  /**
   * Gets call state
   * @param {string} callId - Call identifier
   * @returns {Object|null} - Call state or null
   */
  getCallState(callId) {
    return this.activeCalls.get(callId) || null;
  }

  /**
   * Ends a call and cleans up resources
   * @param {string} callId - Call identifier
   */
  async endCall(callId) {
    const callState = this.activeCalls.get(callId);
    
    if (!callState) {
      logger.warn(`Call ${callId} not found for cleanup`);
      return;
    }

    try {
      // Delete the room
      await this.roomService.deleteRoom(callState.roomName);
      logger.info(`Room ${callState.roomName} deleted`);
    } catch (error) {
      logger.warn(`Failed to delete room ${callState.roomName}`, { error: error.message });
    }

    // Keep the call state for a while for reference, then clean up
    setTimeout(() => {
      this.activeCalls.delete(callId);
      logger.info(`Call ${callId} removed from active calls`);
    }, 60000); // Keep for 1 minute
  }

  /**
   * Gets call summary for logging
   * @param {string} callId - Call identifier
   * @returns {Object} - Call summary
   */
  getCallSummary(callId) {
    const callState = this.activeCalls.get(callId);
    
    if (!callState) {
      return null;
    }

    const duration = callState.endTime 
      ? callState.endTime - callState.startTime 
      : Date.now() - callState.startTime;

    return {
      callId,
      contactId: callState.contactId,
      phoneNumber: callState.phoneNumber,
      status: callState.status,
      duration,
      startTime: new Date(callState.startTime).toISOString(),
      endTime: callState.endTime ? new Date(callState.endTime).toISOString() : null,
      collectedData: callState.collectedData,
      endReason: callState.endReason || null,
    };
  }

  /**
   * Lists all active calls
   * @returns {Array} - Array of call summaries
   */
  listActiveCalls() {
    const calls = [];
    
    for (const [callId] of this.activeCalls) {
      const summary = this.getCallSummary(callId);
      if (summary) {
        calls.push(summary);
      }
    }

    return calls;
  }
}

module.exports = new LiveKitAgent();
