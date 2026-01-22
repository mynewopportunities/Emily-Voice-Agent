/**
 * Serverless Webhook Handler for LiveKit → HubSpot
 * Deploy to Vercel, Netlify, or any serverless platform
 */

const hubspot = require('@hubspot/api-client');

// Initialize HubSpot client
const hubspotClient = new hubspot.Client({ 
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN 
});

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
  const { functionName, parameters, metadata } = event;
  
  // Get contact ID from metadata (you'll set this when initiating the call)
  const contactId = metadata?.contactId || parameters?.contactId;
  
  if (!contactId) {
    console.error('No contactId in function call');
    return;
  }

  console.log(`Processing ${functionName} for contact ${contactId}`);

  switch (functionName) {
    case 'record_gatekeeper':
      await updateContact(contactId, {
        gatekeeper_name: parameters.full_name,
      });
      break;

    case 'verify_address':
      if (!parameters.confirmed && parameters.corrected_address) {
        await updateContact(contactId, {
          full_physical_address: parameters.corrected_address,
        });
      }
      break;

    case 'verify_email':
      if (!parameters.confirmed && parameters.corrected_email) {
        await updateContact(contactId, {
          email: parameters.corrected_email,
        });
      }
      break;

    case 'verify_dm':
      const dmUpdates = {
        dm_employment_status: parameters.still_employed ? 'employed' : 'left',
      };
      if (!parameters.confirmed && parameters.corrected_name) {
        dmUpdates.it_decision_maker = parameters.corrected_name;
      }
      if (parameters.notes) {
        dmUpdates.last_call_notes = parameters.notes;
      }
      await updateContact(contactId, dmUpdates);
      break;

    case 'collect_direct_number':
      if (parameters.provided && parameters.phone_number) {
        await updateContact(contactId, {
          it_dm_direct_number: parameters.phone_number,
        });
      }
      break;

    case 'end_call':
      await updateContact(contactId, {
        verification_status: getStatusFromOutcome(parameters.outcome),
        last_verification_date: new Date().toISOString().split('T')[0],
        last_call_notes: parameters.notes || `Call ended: ${parameters.outcome}`,
      });
      break;

    case 'complete_call':
      await updateContact(contactId, {
        verification_status: 'verified',
        last_verification_date: new Date().toISOString().split('T')[0],
        last_call_notes: parameters.notes || 'Verification completed successfully',
      });
      break;

    default:
      console.log(`Unknown function: ${functionName}`);
  }
}

/**
 * Update HubSpot contact
 */
async function updateContact(contactId, properties) {
  try {
    await hubspotClient.crm.contacts.basicApi.update(contactId, { properties });
    console.log(`Updated contact ${contactId}:`, properties);
  } catch (error) {
    console.error(`Failed to update contact ${contactId}:`, error.message);
    throw error;
  }
}

/**
 * Map call outcome to verification status
 */
function getStatusFromOutcome(outcome) {
  const statusMap = {
    'not_available': 'unreachable',
    'declined': 'declined',
    'wrong_number': 'wrong_number',
    'other': 'not_verified',
  };
  return statusMap[outcome] || 'not_verified';
}
