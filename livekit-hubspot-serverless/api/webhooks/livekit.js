/**
 * Serverless Webhook Handler for LiveKit → Google Sheets
 * Deploy to Vercel, Netlify, or any serverless platform
 */

const { google } = require('googleapis');

// Initialize Google Sheets client
let sheets = null;
let spreadsheetId = process.env.GOOGLE_SHEET_ID;
let sheetName = process.env.GOOGLE_SHEET_NAME || 'Contacts';

function initializeSheets() {
  if (!sheets && process.env.GOOGLE_SERVICE_ACCOUNT) {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      sheets = google.sheets({ version: 'v4', auth });
    } catch (error) {
      console.error('Failed to initialize Google Sheets:', error.message);
    }
  }
  return sheets;
}

/**
 * Main webhook handler
 */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body;
    console.log('Received webhook:', event.type, event);

    // Handle different event types
    if (event.type === 'function_call') {
      await handleFunctionCall(event);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle function calls from the voice agent
 */
async function handleFunctionCall(event) {
  const { functionName, parameters, callId, roomName, room } = event;
  
  // Try to get metadata from room metadata (stored when room was created)
  let metadata = {};
  let rowNumber = null;
  let source = 'google_sheets';
  
  if (room && room.metadata) {
    try {
      metadata = typeof room.metadata === 'string' ? JSON.parse(room.metadata) : room.metadata;
      rowNumber = metadata.rowNumber;
      source = metadata.source || 'google_sheets';
    } catch (e) {
      console.error('Failed to parse room metadata:', e);
    }
  }
  
  // Fallback to event metadata
  if (!rowNumber && event.metadata) {
    metadata = event.metadata;
    rowNumber = metadata.rowNumber;
    source = metadata.source || 'google_sheets';
  }
  
  if (!rowNumber && source === 'google_sheets') {
    console.error('No rowNumber in function call metadata. Room metadata:', metadata);
    return;
  }

  console.log(`Processing ${functionName} for row ${rowNumber}`);

  if (source === 'google_sheets') {
    await updateGoogleSheet(rowNumber, functionName, parameters);
  } else {
    // Fallback to HubSpot if source is hubspot (backward compatibility)
    const contactId = metadata.contactId || parameters.contactId;
    if (contactId) {
      await updateHubSpot(contactId, functionName, parameters);
    }
  }
}

/**
 * Update Google Sheet row
 */
async function updateGoogleSheet(rowNumber, functionName, parameters) {
  const sheetsClient = initializeSheets();
  if (!sheetsClient) {
    console.error('Google Sheets client not initialized');
    return;
  }

  if (!spreadsheetId) {
    console.error('GOOGLE_SHEET_ID not configured');
    return;
  }

  try {
    // Get headers to find column indices
    const headersResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`,
    });

    const headers = headersResponse.data.values[0] || [];
    const updates = {};

    // Map function calls to sheet updates
    switch (functionName) {
      case 'record_gatekeeper':
        updates.gatekeeper_name = parameters.full_name;
        break;

      case 'verify_address':
        if (parameters.confirmed) {
          updates.address_verified = 'Yes';
        } else if (parameters.corrected_address) {
          updates.physical_address = parameters.corrected_address;
          updates.address_verified = 'Updated';
        }
        break;

      case 'verify_email':
        if (parameters.confirmed) {
          updates.email_verified = 'Yes';
        } else if (parameters.corrected_email) {
          updates.email_address = parameters.corrected_email;
          updates.email_verified = 'Updated';
        }
        break;

      case 'verify_dm':
        if (parameters.confirmed && parameters.still_employed) {
          updates.dm_verified = 'Yes';
        } else if (parameters.corrected_name) {
          updates.dm_name = parameters.corrected_name;
          updates.dm_verified = 'Updated';
          if (parameters.notes) {
            updates.dm_notes = parameters.notes;
          }
        } else if (!parameters.still_employed) {
          updates.dm_verified = 'No longer employed';
          if (parameters.notes) {
            updates.dm_notes = parameters.notes;
          }
        }
        break;

      case 'collect_direct_number':
        if (parameters.provided && parameters.phone_number) {
          updates.direct_number = parameters.phone_number;
        } else {
          updates.direct_number = 'Not provided';
          if (parameters.notes) {
            updates.direct_number_notes = parameters.notes;
          }
        }
        break;

      case 'end_call':
      case 'complete_call':
        updates.verification_status = parameters.outcome === 'success' ? 'verified' : 'failed';
        updates.call_outcome = parameters.outcome;
        updates.call_notes = parameters.notes || '';
        updates.last_call_date = new Date().toISOString().split('T')[0];
        break;

      default:
        console.log(`Unknown function: ${functionName}`);
        return;
    }

    // Build update requests
    const updateRequests = [];
    Object.keys(updates).forEach(key => {
      const columnIndex = findColumnIndex(headers, key);
      if (columnIndex !== -1) {
        updateRequests.push({
          range: `${sheetName}!${columnLetter(columnIndex)}${rowNumber + 1}`,
          values: [[updates[key]]],
        });
      }
    });

    if (updateRequests.length === 0) {
      console.warn('No matching columns found for updates');
      return;
    }

    // Batch update
    await sheetsClient.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updateRequests,
      },
    });

    console.log(`Updated row ${rowNumber} in Google Sheet`);
  } catch (error) {
    console.error(`Failed to update Google Sheet row ${rowNumber}:`, error.message);
    throw error;
  }
}

/**
 * Update HubSpot contact (backward compatibility)
 */
async function updateHubSpot(contactId, functionName, parameters) {
  // This would require HubSpot client initialization
  // Keeping as placeholder for backward compatibility
  console.log(`HubSpot update for contact ${contactId} (not implemented in serverless)`);
}

/**
 * Find column index by header name
 */
function findColumnIndex(headers, key) {
  const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
  return headers.findIndex(header => {
    const normalizedHeader = header.toLowerCase().replace(/\s+/g, '_');
    return normalizedHeader === normalizedKey || 
           normalizedHeader.includes(normalizedKey) ||
           normalizedKey.includes(normalizedHeader);
  });
}

/**
 * Convert column index to letter (0 = A, 1 = B, etc.)
 */
function columnLetter(index) {
  let result = '';
  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
  }
  return result;
}
