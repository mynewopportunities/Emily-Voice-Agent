/**
 * Google Sheets Client
 * 
 * Handles reading and writing contact data to/from Google Sheets
 */

const { google } = require('googleapis');
const logger = require('../utils/logger');

class GoogleSheetsClient {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.sheetName = process.env.GOOGLE_SHEET_NAME || 'Contacts';
    
    // Initialize Google Sheets API
    this.initialize();
  }

  /**
   * Initialize Google Sheets API client
   */
  async initialize() {
    try {
      // Use service account or OAuth2
      const auth = new google.auth.GoogleAuth({
        credentials: process.env.GOOGLE_SERVICE_ACCOUNT ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT) : undefined,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      logger.info('Google Sheets client initialized');
    } catch (error) {
      logger.error('Failed to initialize Google Sheets client', { error: error.message });
      throw error;
    }
  }

  /**
   * Gets all contacts from Google Sheet
   * @param {Object} options - Query options
   * @returns {Array} - Array of contacts
   */
  async getContacts(options = {}) {
    const {
      limit = 100,
      verificationStatus = 'not_verified',
      hasPhone = true
    } = options;

    try {
      if (!this.spreadsheetId) {
        throw new Error('GOOGLE_SHEET_ID environment variable not set');
      }

      // Read all rows from the sheet
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:Z`, // Adjust range as needed
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      // First row is headers
      const headers = rows[0];
      const contacts = [];

      // Map rows to contact objects
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const contact = this.rowToContact(row, headers);
        
        // Apply filters
        if (verificationStatus && contact.verification_status !== verificationStatus) continue;
        if (hasPhone && !contact.phone_number) continue;
        if (limit && contacts.length >= limit) break;

        contacts.push(contact);
      }

      logger.info(`Retrieved ${contacts.length} contacts from Google Sheets`);
      return contacts;
    } catch (error) {
      logger.error('Failed to get contacts from Google Sheets', { error: error.message });
      throw error;
    }
  }

  /**
   * Gets a specific contact by row number or ID
   * @param {string|number} identifier - Row number or contact ID
   * @returns {Object} - Contact data
   */
  async getContact(identifier) {
    try {
      // If identifier is a number, treat as row number
      // Otherwise, search by contact ID
      const contacts = await this.getContacts({ limit: 1000 });
      
      if (typeof identifier === 'number') {
        return contacts[identifier - 2]; // -2 because row 1 is headers, and array is 0-indexed
      }

      return contacts.find(c => c.contactId === identifier || c.row_number === identifier);
    } catch (error) {
      logger.error(`Failed to get contact ${identifier}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Converts a sheet row to contact object
   * @param {Array} row - Sheet row data
   * @param {Array} headers - Column headers
   * @returns {Object} - Formatted contact
   */
  rowToContact(row, headers) {
    const contact = {
      row_number: row[0] || null, // Assuming first column is row number
    };

    // Map columns to contact properties
    headers.forEach((header, index) => {
      const value = row[index] || '';
      const normalizedHeader = header.toLowerCase().replace(/\s+/g, '_');
      
      switch (normalizedHeader) {
        case 'contact_id':
        case 'id':
          contact.contactId = value;
          break;
        case 'company_name':
        case 'company':
          contact.company_name = value;
          break;
        case 'phone_number':
        case 'phone':
          contact.phone_number = value;
          break;
        case 'email_address':
        case 'email':
          contact.email_address = value;
          break;
        case 'physical_address':
        case 'address':
          contact.physical_address = value;
          break;
        case 'dm_name':
        case 'it_decision_maker':
        case 'decision_maker':
          contact.dm_name = value;
          break;
        case 'verification_status':
          contact.verification_status = value || 'not_verified';
          break;
        default:
          contact[normalizedHeader] = value;
      }
    });

    // Format for prompt (similar to HubSpot format)
    contact.formatted = {
      company_name: contact.company_name || '(not on file)',
      physical_address: contact.physical_address || '(not on file)',
      email_address: contact.email_address || '(not on file)',
      email_spelled: contact.email_address ? contact.email_address.replace(/[@.]/g, ' dot ').replace(/@/g, ' at ') : '(not on file)',
      dm_name: contact.dm_name || '(not on file)',
      phone_number: contact.phone_number || '',
    };

    return contact;
  }

  /**
   * Updates a contact row in Google Sheet
   * @param {number} rowNumber - Row number to update (1-indexed, excluding header)
   * @param {Object} updates - Fields to update
   * @returns {boolean} - Success status
   */
  async updateContact(rowNumber, updates) {
    try {
      if (!this.spreadsheetId) {
        throw new Error('GOOGLE_SHEET_ID environment variable not set');
      }

      // Get headers to find column indices
      const headersResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!1:1`, // First row (headers)
      });

      const headers = headersResponse.data.values[0];
      const updatesArray = [];

      // Map updates to column positions
      Object.keys(updates).forEach(key => {
        const columnIndex = this.findColumnIndex(headers, key);
        if (columnIndex !== -1) {
          updatesArray.push({
            range: `${this.sheetName}!${this.columnLetter(columnIndex)}${rowNumber + 1}`, // +1 for header row
            values: [[updates[key]]],
          });
        }
      });

      if (updatesArray.length === 0) {
        logger.warn('No matching columns found for updates');
        return false;
      }

      // Batch update
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: updatesArray,
        },
      });

      logger.info(`Updated contact in row ${rowNumber}`);
      return true;
    } catch (error) {
      logger.error(`Failed to update contact in row ${rowNumber}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Finds column index by header name
   * @param {Array} headers - Column headers
   * @param {string} key - Field name to find
   * @returns {number} - Column index (-1 if not found)
   */
  findColumnIndex(headers, key) {
    const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
    
    return headers.findIndex(header => {
      const normalizedHeader = header.toLowerCase().replace(/\s+/g, '_');
      return normalizedHeader === normalizedKey || 
             normalizedHeader.includes(normalizedKey) ||
             normalizedKey.includes(normalizedHeader);
    });
  }

  /**
   * Converts column index to letter (0 = A, 1 = B, etc.)
   * @param {number} index - Column index
   * @returns {string} - Column letter
   */
  columnLetter(index) {
    let result = '';
    while (index >= 0) {
      result = String.fromCharCode(65 + (index % 26)) + result;
      index = Math.floor(index / 26) - 1;
    }
    return result;
  }

  /**
   * Formats contact data for LiveKit prompt (compatible with HubSpot format)
   * @param {Object} contact - Contact from sheet
   * @returns {Object} - Formatted contact data
   */
  formatForCall(contact) {
    return {
      contactId: contact.contactId || contact.row_number?.toString(),
      row_number: contact.row_number,
      formatted: contact.formatted || {
        company_name: contact.company_name || '(not on file)',
        physical_address: contact.physical_address || '(not on file)',
        email_address: contact.email_address || '(not on file)',
        email_spelled: contact.email_address ? contact.email_address.replace(/[@.]/g, ' dot ').replace(/@/g, ' at ') : '(not on file)',
        dm_name: contact.dm_name || '(not on file)',
        phone_number: contact.phone_number || '',
      },
      raw: contact,
    };
  }
}

module.exports = new GoogleSheetsClient();
