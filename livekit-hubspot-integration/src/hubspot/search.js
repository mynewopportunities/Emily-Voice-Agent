/**
 * Helper to search for HubSpot contacts by phone number
 */

const hubspot = require('@hubspot/api-client');
const config = require('../config');
const logger = require('../utils/logger');

class HubSpotSearch {
  constructor() {
    this.client = new hubspot.Client({ accessToken: config.hubspot.accessToken });
  }

  /**
   * Search for a contact by phone number
   * @param {string} phoneNumber - Phone number to search for (E.164 format)
   * @returns {Promise<Array>} - Array of matching contacts
   */
  async searchByPhone(phoneNumber) {
    try {
      // Normalize phone number (remove spaces, dashes, etc.)
      const normalized = phoneNumber.replace(/[\s\-\(\)]/g, '');
      
      logger.info(`Searching for contact with phone: ${phoneNumber}`);

      // Search using HubSpot search API
      const searchRequest = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'phone',
                operator: 'EQ',
                value: normalized,
              },
            ],
          },
        ],
        properties: ['firstname', 'lastname', 'email', 'phone', 'company', 'hs_object_id'],
        limit: 10,
      };

      const response = await this.client.crm.contacts.searchApi.doSearch(searchRequest);
      
      logger.info(`Found ${response.results.length} contacts matching phone ${phoneNumber}`);
      
      return response.results.map(contact => ({
        contactId: contact.id,
        firstName: contact.properties.firstname,
        lastName: contact.properties.lastname,
        email: contact.properties.email,
        phone: contact.properties.phone,
        company: contact.properties.company,
      }));
    } catch (error) {
      logger.error(`Failed to search by phone ${phoneNumber}`, { error: error.message });
      throw error;
    }
  }
}

module.exports = new HubSpotSearch();
