const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeFarmerProfileUpdate, hashFarmerProfileUpdate, parseLiveFaceImage } = require('./shared/farmerProfileUpdate');

test('accepts only the supported farmer profile fields with validated values', () => {
  assert.deepEqual(normalizeFarmerProfileUpdate({ displayName: ' Ana Cruz ', phoneNumber: '09171234567', location: 'Purok 2, Gabao, Irosin, Sorsogon' }), {
    displayName: 'Ana Cruz', phoneNumber: '09171234567', location: 'Purok 2, Gabao, Irosin, Sorsogon',
  });
  assert.throws(() => normalizeFarmerProfileUpdate({ displayName: 'Ana', phoneNumber: '123', location: 'Home' }));
  assert.throws(() => normalizeFarmerProfileUpdate({ displayName: 'Ana Cruz', phoneNumber: '09171234567', location: 'Home', role: 'admin' }));
});

test('profile challenge binds exact normalized changes and accepts only bounded live image data', () => {
  const patch = normalizeFarmerProfileUpdate({ displayName: 'Ana Cruz', phoneNumber: '09171234567', location: 'Purok 2, Gabao, Irosin, Sorsogon' });
  assert.equal(hashFarmerProfileUpdate(patch), hashFarmerProfileUpdate({ ...patch }));
  assert.notEqual(hashFarmerProfileUpdate(patch), hashFarmerProfileUpdate({ ...patch, phoneNumber: '09170000000' }));
  assert.equal(parseLiveFaceImage('data:image/jpeg;base64,YWJj').bytes.toString(), 'abc');
  assert.throws(() => parseLiveFaceImage('https://example.test/selfie.jpg'));
});
