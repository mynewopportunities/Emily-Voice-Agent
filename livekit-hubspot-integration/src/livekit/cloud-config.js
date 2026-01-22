/**
 * LiveKit Cloud Agent Configuration
 * 
 * This file contains the configuration to deploy the Emily voice agent
 * directly on LiveKit Cloud's managed agent infrastructure.
 * 
 * Use this if you're using LiveKit's hosted agent service rather than
 * self-hosting the agent.
 */

const agentConfig = {
  // Agent identity
  identity: {
    name: "Emily",
    role: "verification_agent",
    company: "Core IT",
  },

  // Voice configuration
  voice: {
    // TTS Provider (options: elevenlabs, deepgram, azure, google, aws)
    provider: "elevenlabs",
    
    // Voice settings
    settings: {
      // ElevenLabs specific
      voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel - professional female voice
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.0,
      useSpeakerBoost: true,
      
      // General settings
      speakingRate: 1.0,
      pitch: 0,
    },
  },

  // Speech-to-text configuration
  stt: {
    // STT Provider (options: deepgram, google, azure, aws, whisper)
    provider: "deepgram",
    
    settings: {
      model: "nova-2",
      language: "en-US",
      punctuate: true,
      profanityFilter: false,
      diarize: false,
      smartFormat: true,
      endpointing: 500, // ms of silence before processing
    },
  },

  // LLM configuration
  llm: {
    // Provider (options: openai, anthropic, google, azure)
    provider: "openai",
    
    settings: {
      model: "gpt-4-turbo-preview",
      temperature: 0.7,
      maxTokens: 500,
      topP: 0.9,
    },
  },

  // Turn-taking settings
  turnTaking: {
    // How long to wait for silence before agent responds (ms)
    silenceThreshold: 700,
    
    // Minimum speech duration to be considered valid input (ms)
    minSpeechDuration: 100,
    
    // Allow interruptions
    interruptible: true,
    
    // Time to wait after agent finishes before accepting input (ms)
    postSpeechDelay: 200,
  },

  // Webhook configuration
  webhooks: {
    // URL to receive function call events
    functionCallUrl: process.env.WEBHOOK_URL || "https://your-server.com/webhooks/livekit",
    
    // Events to send
    events: [
      "function_call",
      "room_finished",
      "participant_left",
      "transcript",
    ],
    
    // Authentication
    secret: process.env.WEBHOOK_SECRET,
  },

  // PSTN/SIP configuration for phone calls
  telephony: {
    // SIP trunk provider settings
    provider: "twilio", // or telnyx, vonage, etc.
    
    // Caller ID to display
    callerId: process.env.OUTBOUND_CALLER_ID || "+15551234567",
    
    // Ring timeout (seconds)
    ringTimeout: 30,
    
    // Auto-answer delay (ms)
    autoAnswerDelay: 0,
  },

  // Function definitions (imported from functions.json)
  functions: require('./functions.json').functions,

  // Metadata for tracking
  metadata: {
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  },
};

/**
 * Generates a complete agent session configuration
 * @param {Object} contactData - Formatted contact data
 * @param {string} systemPrompt - Compiled system prompt
 * @returns {Object} - Full agent session config
 */
function generateSessionConfig(contactData, systemPrompt) {
  return {
    ...agentConfig,
    
    // Session-specific system prompt
    systemPrompt,
    
    // Session metadata
    sessionMetadata: {
      contactId: contactData.contactId,
      company: contactData.company_name,
      timestamp: Date.now(),
    },
    
    // Initial context for the LLM
    initialContext: {
      role: "assistant",
      content: "I am Emily, Core IT's verification agent. I'm ready to make an outbound call.",
    },
  };
}

module.exports = {
  agentConfig,
  generateSessionConfig,
};
