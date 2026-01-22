/**
 * HubSpot API Client
 * Handles all interactions with HubSpot CRM
 */

const hubspot = require('@hubspot/api-client');
const config = require('../config');
const logger = require('../utils/logger');
const { formatEmailForSpeech } = require('../utils/email-formatter');
const { CONTACT_PROPERTIES, FETCH_PROPERTIES, PROMPT_PROPERTIES } = require('./properties');

class HubSpotClient {
  constructor() {
    this.client = new hubspot.Client({ accessToken: config.hubspot.accessToken });
  }

  /**
   * Fetches a contact by ID and formats data for the voice agent
   * @param {string} contactId - HubSpot contact ID
   * @returns {Object} - Formatted contact data for prompt injection
   */
  async getContactForCall(contactId) {
    try {
      logger.info(`Fetching contact ${contactId} from HubSpot`);

      const response = await this.client.crm.contacts.basicApi.getById(
        contactId,
        FETCH_PROPERTIES
      );

      const properties = response.properties;
      
      // Format the data for the prompt template
      const formattedData = this.formatForPrompt(properties);
      
      logger.info(`Contact ${contactId} fetched successfully`, { 
        company: formattedData.company_name,
        hasDM: !!formattedData.dm_name,
        hasEmail: !!formattedData.email_address,
      });

      return {
        contactId,
        raw: properties,
        formatted: formattedData,
      };
    } catch (error) {
      logger.error(`Failed to fetch contact ${contactId}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Formats HubSpot contact properties for the prompt template
   * @param {Object} properties - Raw HubSpot properties
   * @returns {Object} - Formatted data for prompt injection
   */
  formatForPrompt(properties) {
    // Use the combined field if available, otherwise build from individual fields
    let physicalAddress = properties.full_physical_address;
    
    if (!physicalAddress) {
      // Fallback: Build from individual address fields
      const addressParts = [
        properties.address,
        properties.city,
        properties.state,
        properties.zip,
      ].filter(Boolean);
      
      physicalAddress = addressParts.length > 0 ? addressParts.join(', ') : null;
    }

    // Format email for speech
    const emailAddress = properties.email;
    const emailSpelled = emailAddress ? formatEmailForSpeech(emailAddress) : null;

    return {
      company_name: properties.company || null,
      physical_address: physicalAddress,
      email_address: emailAddress,
      email_spelled: emailSpelled,
      dm_name: properties.it_decision_maker || null,
      phone_number: properties.phone || null,
      gatekeeper_name: properties.gatekeeper_name || null,
      firstname: properties.firstname || null,
      lastname: properties.lastname || null,
    };
  }

  /**
   * Updates contact with verification results
   * @param {string} contactId - HubSpot contact ID
   * @param {Object} updates - Property updates
   */
  async updateContact(contactId, updates) {
    try {
      logger.info(`Updating contact ${contactId}`, { updates });

      await this.client.crm.contacts.basicApi.update(contactId, {
        properties: updates,
      });

      logger.info(`Contact ${contactId} updated successfully`);
    } catch (error) {
      logger.error(`Failed to update contact ${contactId}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Records gatekeeper information
   * @param {string} contactId - HubSpot contact ID
   * @param {string} fullName - Gatekeeper's full name
   */
  async recordGatekeeper(contactId, fullName) {
    await this.updateContact(contactId, {
      gatekeeper_name: fullName,
    });
  }

  /**
   * Updates address verification
   * @param {string} contactId - HubSpot contact ID
   * @param {boolean} confirmed - Whether existing address was confirmed
   * @param {string} correctedAddress - New address if not confirmed
   */
  async updateAddress(contactId, confirmed, correctedAddress = null) {
    if (!confirmed && correctedAddress) {
      // Save to the combined field directly
      await this.updateContact(contactId, {
        full_physical_address: correctedAddress,
      });
      
      // Also try to parse and save individual fields for compatibility
      const addressParts = this.parseAddress(correctedAddress);
      if (Object.keys(addressParts).length > 0) {
        await this.updateContact(contactId, addressParts);
      }
    }
    // If confirmed, no update needed
  }

  /**
   * Simple address parser - enhance based on your needs
   * @param {string} addressString - Full address string
   * @returns {Object} - Parsed address components
   */
  parseAddress(addressString) {
    // This is a simplified parser - consider using a proper address parsing library
    // like 'parse-address' for production use
    const parts = addressString.split(',').map(p => p.trim());
    
    const result = {};
    
    if (parts.length >= 1) {
      result.address = parts[0];
    }
    if (parts.length >= 2) {
      result.city = parts[1];
    }
    if (parts.length >= 3) {
      // Try to extract state and zip
      const stateZip = parts[2].trim().split(' ');
      if (stateZip.length >= 1) {
        result.state = stateZip[0];
      }
      if (stateZip.length >= 2) {
        result.zip = stateZip[1];
      }
    }
    if (parts.length >= 4) {
      result.country = parts[3];
    }

    return result;
  }

  /**
   * Updates email verification
   * @param {string} contactId - HubSpot contact ID
   * @param {boolean} confirmed - Whether existing email was confirmed
   * @param {string} correctedEmail - New email if not confirmed
   */
  async updateEmail(contactId, confirmed, correctedEmail = null) {
    if (!confirmed && correctedEmail) {
      await this.updateContact(contactId, {
        email: correctedEmail,
      });
    }
  }

  /**
   * Updates IT Decision Maker information
   * @param {string} contactId - HubSpot contact ID
   * @param {boolean} confirmed - Whether DM info was confirmed
   * @param {boolean} stillEmployed - Whether DM is still with company
   * @param {string} correctedName - New DM name if changed
   * @param {string} notes - Additional notes
   */
  async updateDecisionMaker(contactId, confirmed, stillEmployed, correctedName = null, notes = null) {
    const updates = {
      dm_employment_status: stillEmployed ? 'employed' : 'left',
    };

    if (!confirmed && correctedName) {
      updates.it_decision_maker = correctedName;
    }

    if (notes) {
      updates.last_call_notes = notes;
    }

    await this.updateContact(contactId, updates);
  }

  /**
   * Records direct phone number
   * @param {string} contactId - HubSpot contact ID
   * @param {boolean} provided - Whether number was provided
   * @param {string} phoneNumber - The direct number
   * @param {string} notes - Notes if not provided
   */
  async updateDirectNumber(contactId, provided, phoneNumber = null, notes = null) {
    const updates = {};

    if (provided && phoneNumber) {
      updates.it_dm_direct_number = phoneNumber;
    }

    if (notes) {
      updates.last_call_notes = notes;
    }

    if (Object.keys(updates).length > 0) {
      await this.updateContact(contactId, updates);
    }
  }

  /**
   * Marks call as complete with final status
   * @param {string} contactId - HubSpot contact ID
   * @param {string} outcome - Call outcome (success, partial, callback_requested)
   * @param {string} notes - Call notes
   */
  async completeCall(contactId, outcome, notes = null) {
    const statusMap = {
      success: 'verified',
      partial: 'partial',
      callback_requested: 'not_verified',
    };

    const updates = {
      verification_status: statusMap[outcome] || 'partial',
      last_verification_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    };

    if (notes) {
      updates.last_call_notes = notes;
    }

    // Increment call attempts
    await this.incrementCallAttempts(contactId);
    await this.updateContact(contactId, updates);
  }

  /**
   * Marks call as ended early
   * @param {string} contactId - HubSpot contact ID
   * @param {string} outcome - End reason (not_available, declined, wrong_number, other)
   * @param {string} notes - Notes about why call ended
   */
  async endCall(contactId, outcome, notes = null) {
    const statusMap = {
      not_available: 'unreachable',
      declined: 'declined',
      wrong_number: 'wrong_number',
      other: 'not_verified',
    };

    const updates = {
      verification_status: statusMap[outcome] || 'not_verified',
      last_verification_date: new Date().toISOString().split('T')[0],
    };

    if (notes) {
      updates.last_call_notes = notes;
    }

    await this.incrementCallAttempts(contactId);
    await this.updateContact(contactId, updates);
  }

  /**
   * Increments the call attempts counter
   * @param {string} contactId - HubSpot contact ID
   */
  async incrementCallAttempts(contactId) {
    try {
      // First get current value
      const contact = await this.client.crm.contacts.basicApi.getById(
        contactId,
        ['call_attempts']
      );

      const currentAttempts = parseInt(contact.properties.call_attempts) || 0;

      await this.updateContact(contactId, {
        call_attempts: (currentAttempts + 1).toString(),
      });
    } catch (error) {
      logger.warn(`Failed to increment call attempts for ${contactId}`, { error: error.message });
      // Don't throw - this is not critical
    }
  }

  /**
   * Creates an engagement (call log) in HubSpot
   * @param {string} contactId - HubSpot contact ID
   * @param {Object} callData - Call details
   */
  async logCall(contactId, callData) {
    try {
      const { duration, outcome, notes, recordingUrl } = callData;

      // Create a call engagement
      await this.client.crm.objects.calls.basicApi.create({
        properties: {
          hs_call_title: 'Verification Call - Emily (Voice Agent)',
          hs_call_body: notes || 'Automated verification call',
          hs_call_duration: duration ? Math.round(duration / 1000).toString() : '0', // Convert ms to seconds
          hs_call_status: outcome === 'success' ? 'COMPLETED' : 'NO_ANSWER',
          hs_call_direction: 'OUTBOUND',
          hs_timestamp: Date.now().toString(),
          hs_call_recording_url: recordingUrl || '',
        },
        associations: [
          {
            to: { id: contactId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 194 }], // Call to Contact
          },
        ],
      });

      logger.info(`Call logged for contact ${contactId}`);
    } catch (error) {
      logger.error(`Failed to log call for contact ${contactId}`, { error: error.message });
      // Don't throw - logging is not critical
    }
  }

  /**
   * Gets contacts from a HubSpot list for batch calling
   * @param {string} listId - HubSpot list ID
   * @param {number} limit - Maximum contacts to return
   * @returns {Array} - Array of contacts
   */
  async getContactsFromList(listId, limit = 100) {
    try {
      const response = await this.client.crm.lists.membershipsApi.getPage(
        listId,
        undefined,
        limit
      );

      const contactIds = response.results.map(r => r.recordId);
      
      // Fetch full contact details
      const contacts = await Promise.all(
        contactIds.map(id => this.getContactForCall(id))
      );

      return contacts;
    } catch (error) {
      logger.error(`Failed to get contacts from list ${listId}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Creates custom properties if they don't exist
   * Call this during initial setup
   */
  async setupCustomProperties() {
    logger.info('Setting up HubSpot custom properties...');

    for (const property of CONTACT_PROPERTIES) {
      try {
        await this.client.crm.properties.coreApi.create('contacts', property);
        logger.info(`Created property: ${property.name}`);
      } catch (error) {
        if (error.code === 409) {
          logger.info(`Property ${property.name} already exists`);
        } else {
          logger.error(`Failed to create property ${property.name}`, { error: error.message });
        }
      }
    }

    logger.info('Custom properties setup complete');
  }
}

module.exports = new HubSpotClient();
