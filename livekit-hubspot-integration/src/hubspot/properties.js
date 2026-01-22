/**
 * HubSpot Custom Property Definitions
 * Defines the custom properties needed for the voice agent integration
 */

/**
 * Custom contact properties required for the integration
 */
const CONTACT_PROPERTIES = [
  {
    name: 'full_physical_address',
    label: 'Full Physical Address',
    type: 'string',
    fieldType: 'textarea',
    groupName: 'contactinformation',
    description: 'Complete physical address (street, city, state, zip) for mailing purposes',
  },
  {
    name: 'it_decision_maker',
    label: 'IT Decision Maker',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
    description: 'Name of the IT decision maker at this contact\'s company',
  },
  {
    name: 'it_dm_direct_number',
    label: 'IT DM Direct Number',
    type: 'string',
    fieldType: 'phonenumber',
    groupName: 'contactinformation',
    description: 'Direct phone number of the IT decision maker',
  },
  {
    name: 'gatekeeper_name',
    label: 'Gatekeeper Name',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
    description: 'Name of the person who typically answers calls (receptionist, admin)',
  },
  {
    name: 'last_verification_date',
    label: 'Last Verification Date',
    type: 'date',
    fieldType: 'date',
    groupName: 'contactinformation',
    description: 'Date when contact details were last verified by voice agent',
  },
  {
    name: 'verification_status',
    label: 'Verification Status',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'contactinformation',
    description: 'Current status of contact verification',
    options: [
      { label: 'Not Verified', value: 'not_verified' },
      { label: 'Verified', value: 'verified' },
      { label: 'Partially Verified', value: 'partial' },
      { label: 'Unable to Reach', value: 'unreachable' },
      { label: 'Wrong Number', value: 'wrong_number' },
      { label: 'Declined', value: 'declined' },
    ],
  },
  {
    name: 'dm_employment_status',
    label: 'DM Employment Status',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'contactinformation',
    description: 'Whether the IT decision maker is still with the company',
    options: [
      { label: 'Unknown', value: 'unknown' },
      { label: 'Still Employed', value: 'employed' },
      { label: 'No Longer With Company', value: 'left' },
    ],
  },
  {
    name: 'last_call_notes',
    label: 'Last Call Notes',
    type: 'string',
    fieldType: 'textarea',
    groupName: 'contactinformation',
    description: 'Notes from the last verification call',
  },
  {
    name: 'call_attempts',
    label: 'Call Attempts',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation',
    description: 'Number of call attempts made to this contact',
  },
];

/**
 * Standard HubSpot contact properties used by the integration
 * These don't need to be created, just referenced
 */
const STANDARD_PROPERTIES = [
  'firstname',
  'lastname',
  'email',
  'phone',
  'company',
  'address',
  'city',
  'state',
  'zip',
  'country',
  'full_physical_address', // Our combined address field
];

/**
 * All properties needed when fetching a contact for a call
 */
const FETCH_PROPERTIES = [
  ...STANDARD_PROPERTIES,
  ...CONTACT_PROPERTIES.map(p => p.name),
];

/**
 * Properties that should be included in the system prompt
 */
const PROMPT_PROPERTIES = {
  company_name: 'company',
  physical_address: ['address', 'city', 'state', 'zip'], // Will be concatenated
  email_address: 'email',
  dm_name: 'it_decision_maker',
  phone_number: 'phone',
  gatekeeper_name: 'gatekeeper_name',
};

module.exports = {
  CONTACT_PROPERTIES,
  STANDARD_PROPERTIES,
  FETCH_PROPERTIES,
  PROMPT_PROPERTIES,
};
