/**
 * Email Formatter Utility
 * Converts email addresses to spoken format for voice agents
 */

/**
 * Phonetic alphabet for clear letter communication
 */
const PHONETIC_ALPHABET = {
  'a': 'A as in Alpha',
  'b': 'B as in Bravo',
  'c': 'C as in Charlie',
  'd': 'D as in Delta',
  'e': 'E as in Echo',
  'f': 'F as in Foxtrot',
  'g': 'G as in Golf',
  'h': 'H as in Hotel',
  'i': 'I as in India',
  'j': 'J as in Juliet',
  'k': 'K as in Kilo',
  'l': 'L as in Lima',
  'm': 'M as in Mike',
  'n': 'N as in November',
  'o': 'O as in Oscar',
  'p': 'P as in Papa',
  'q': 'Q as in Quebec',
  'r': 'R as in Romeo',
  's': 'S as in Sierra',
  't': 'T as in Tango',
  'u': 'U as in Uniform',
  'v': 'V as in Victor',
  'w': 'W as in Whiskey',
  'x': 'X as in X-ray',
  'y': 'Y as in Yankee',
  'z': 'Z as in Zulu',
};

/**
 * Simple letter spelling (A, B, C style)
 */
const SIMPLE_SPELLING = {
  'a': 'A',
  'b': 'B',
  'c': 'C',
  'd': 'D',
  'e': 'E',
  'f': 'F',
  'g': 'G',
  'h': 'H',
  'i': 'I',
  'j': 'J',
  'k': 'K',
  'l': 'L',
  'm': 'M',
  'n': 'N',
  'o': 'O',
  'p': 'P',
  'q': 'Q',
  'r': 'R',
  's': 'S',
  't': 'T',
  'u': 'U',
  'v': 'V',
  'w': 'W',
  'x': 'X',
  'y': 'Y',
  'z': 'Z',
};

/**
 * Formats an email address for voice reading
 * @param {string} email - The email address to format
 * @param {Object} options - Formatting options
 * @param {boolean} options.usePhonetic - Use phonetic alphabet (default: false)
 * @param {boolean} options.groupLetters - Group consecutive letters (default: true)
 * @returns {string} - Formatted email for speech
 */
function formatEmailForSpeech(email, options = {}) {
  const { usePhonetic = false, groupLetters = true } = options;
  
  if (!email || typeof email !== 'string') {
    return '';
  }
  
  const emailLower = email.toLowerCase().trim();
  const [localPart, domain] = emailLower.split('@');
  
  if (!localPart || !domain) {
    return email; // Return original if not a valid email format
  }
  
  const alphabet = usePhonetic ? PHONETIC_ALPHABET : SIMPLE_SPELLING;
  
  // Format local part (before @)
  const formattedLocal = formatPart(localPart, alphabet, groupLetters);
  
  // Format domain
  const formattedDomain = formatDomain(domain);
  
  return `${formattedLocal} at ${formattedDomain}`;
}

/**
 * Formats a part of the email (local or domain)
 */
function formatPart(part, alphabet, groupLetters) {
  const result = [];
  let i = 0;
  
  while (i < part.length) {
    const char = part[i];
    
    if (char === '.') {
      result.push('dot');
      i++;
    } else if (char === '-') {
      result.push('dash');
      i++;
    } else if (char === '_') {
      result.push('underscore');
      i++;
    } else if (/[0-9]/.test(char)) {
      // Group consecutive numbers
      let numGroup = '';
      while (i < part.length && /[0-9]/.test(part[i])) {
        numGroup += part[i];
        i++;
      }
      result.push(numGroup);
    } else if (/[a-z]/.test(char)) {
      if (groupLetters) {
        // Try to identify common words or pronounceable groups
        const remaining = part.slice(i);
        const wordMatch = findPronounceable(remaining);
        
        if (wordMatch) {
          result.push(wordMatch);
          i += wordMatch.length;
        } else {
          // Spell individual letter
          result.push(alphabet[char] || char.toUpperCase());
          i++;
        }
      } else {
        result.push(alphabet[char] || char.toUpperCase());
        i++;
      }
    } else {
      result.push(char);
      i++;
    }
  }
  
  return result.join(', ');
}

/**
 * Common words/patterns that can be pronounced instead of spelled
 */
const PRONOUNCEABLE_PATTERNS = [
  'info', 'mail', 'admin', 'sales', 'support', 'contact', 'help',
  'john', 'jane', 'mike', 'david', 'sarah', 'chris', 'alex',
  'tech', 'dev', 'team', 'office', 'corp', 'inc',
];

/**
 * Finds a pronounceable word at the start of a string
 */
function findPronounceable(str) {
  for (const word of PRONOUNCEABLE_PATTERNS) {
    if (str.startsWith(word) && (str.length === word.length || !/[a-z]/.test(str[word.length]))) {
      return word;
    }
  }
  return null;
}

/**
 * Formats domain for speech
 */
function formatDomain(domain) {
  const parts = domain.split('.');
  const formattedParts = parts.map((part, index) => {
    // Common TLDs can be spoken naturally
    const commonTLDs = ['com', 'org', 'net', 'edu', 'gov', 'io', 'co'];
    
    if (commonTLDs.includes(part)) {
      return part;
    }
    
    // For other parts, check if pronounceable
    if (isPronounceable(part)) {
      return part;
    }
    
    // Otherwise spell it out
    return part.split('').map(c => SIMPLE_SPELLING[c] || c.toUpperCase()).join(', ');
  });
  
  return formattedParts.join(' dot ');
}

/**
 * Checks if a string is pronounceable (has vowels and reasonable consonant clusters)
 */
function isPronounceable(str) {
  if (str.length < 2) return false;
  if (str.length > 10) return false;
  
  // Must contain at least one vowel
  if (!/[aeiou]/i.test(str)) return false;
  
  // Should not have more than 3 consonants in a row
  if (/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(str)) return false;
  
  return true;
}

/**
 * Parses a spelled-out email back to standard format
 * Useful for processing user responses
 */
function parseSpelledEmail(spoken) {
  if (!spoken || typeof spoken !== 'string') {
    return '';
  }
  
  let email = spoken.toLowerCase();
  
  // Replace spoken words with characters
  email = email
    .replace(/\bat\b/g, '@')
    .replace(/\bdot\b/g, '.')
    .replace(/\bdash\b/g, '-')
    .replace(/\bunderscore\b/g, '_')
    .replace(/as in \w+/gi, '') // Remove phonetic helpers
    .replace(/[,\s]+/g, ''); // Remove spaces and commas
  
  return email;
}

module.exports = {
  formatEmailForSpeech,
  parseSpelledEmail,
  PHONETIC_ALPHABET,
  SIMPLE_SPELLING,
};
