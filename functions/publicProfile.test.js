const test = require('node:test');
const assert = require('node:assert/strict');
const { toPublicProfile } = require('./shared/publicProfile');

test('public profile contains only approved active-user fields', () => {
  const profile = toPublicProfile('tech-1', {
    status: 'active', role: 'technician', displayName: 'Tech', photoURL: 'photo',
    qualificationKeys: ['pig:2'], phoneNumber: 'private', email: 'private',
    proofImageUrl: 'private', idImageUrl: 'private', fcmToken: 'private', location: 'private',
  });
  assert.deepEqual(profile, {
    uid: 'tech-1', role: 'technician', status: 'active', displayName: 'Tech', photoURL: 'photo',
    qualificationKeys: ['pig:2'],
  });
  assert.equal(toPublicProfile('pending', { role: 'technician', status: 'pending' }), null);
});
