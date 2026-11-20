const crypto = require('node:crypto');

const normalizeFarmerProfileUpdate = value => {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !['displayName', 'phoneNumber', 'location'].includes(key))) {
    throw new Error('Only name, phone number, and address can be updated here.');
  }
  const displayName = typeof value.displayName === 'string' ? value.displayName.trim() : '';
  const phoneNumber = typeof value.phoneNumber === 'string' ? value.phoneNumber.trim() : '';
  const location = typeof value.location === 'string' ? value.location.trim() : '';
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ .'-]{1,99}$/.test(displayName)) throw new Error('Enter a valid full name.');
  if (!/^09\d{9}$/.test(phoneNumber)) throw new Error('Enter a valid 11-digit phone number.');
  if (!/^Purok [1-7], Gabao, Irosin, Sorsogon$/i.test(location)) throw new Error('Choose a valid address.');
  return { displayName, phoneNumber, location };
};

const hashFarmerProfileUpdate = patch => crypto.createHash('sha256').update(JSON.stringify(patch)).digest('hex');

const parseLiveFaceImage = value => {
  const match = typeof value === 'string' && value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length > 11_200_000) throw new Error('Capture a new live face photo to continue.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error('The face photo is too large. Retake it and try again.');
  return { mimeType: match[1], bytes };
};

module.exports = { normalizeFarmerProfileUpdate, hashFarmerProfileUpdate, parseLiveFaceImage };
