const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { hashFarmerProfileUpdate } = require('./shared/farmerProfileUpdate');

test('farmer profile verification binds an expiring challenge to its user and exact changes', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST,
}, async () => {
  const projectId = process.env.GCLOUD_PROJECT || 'demo-agricare';
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST || '127.0.0.1:5001';
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const authUrl = `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-key`;
  const firestoreUrl = `http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents`;
  const functionUrl = `http://${functionsHost}/${projectId}/us-central1/completeFarmerProfileVerification`;
  const profile = { displayName: 'Farmer Updated', phoneNumber: '09171234567', location: 'Purok 2, Gabao, Irosin, Sorsogon' };

  const identity = async role => {
    const response = await fetch(authUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `farmer-${role}-${runId}@example.test`, password: 'test-password-123', returnSecureToken: true }),
    });
    const user = await response.json();
    assert.equal(response.status, 200, JSON.stringify(user));
    return user;
  };
  const seedFarmer = async (user, challenge) => {
    const fields = {
      uid: { stringValue: user.localId }, role: { stringValue: 'farmer' }, status: { stringValue: 'active' },
      displayName: { stringValue: 'Farmer Original' }, phoneNumber: { stringValue: '09170000000' },
      location: { stringValue: 'Purok 1, Gabao, Irosin, Sorsogon' }, idImageUrl: { stringValue: 'private-id' },
    };
    if (challenge) fields.profileUpdateChallenge = { mapValue: { fields: challenge } };
    const response = await fetch(`${firestoreUrl}/users?documentId=${user.localId}`, {
      method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    assert.equal(response.status, 200, await response.text());
  };
  const makeChallenge = (token, patch, expiresAt) => ({
    tokenHash: { stringValue: crypto.createHash('sha256').update(token).digest('hex') },
    profileHash: { stringValue: hashFarmerProfileUpdate(patch) },
    expiresAt: { timestampValue: new Date(expiresAt).toISOString() },
    attempts: { integerValue: '0' },
  });
  const complete = async (user, token, changes) => {
    const response = await fetch(functionUrl, {
      method: 'POST', headers: { Authorization: `Bearer ${user.idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: changes, challengeToken: token, faceImage: 'data:image/jpeg;base64,YWJj' }),
    });
    return { status: response.status, body: await response.json() };
  };

  const token = `profile-challenge-${runId}-single-use-token`;
  const [owner, other, expired] = await Promise.all([identity('owner'), identity('other'), identity('expired')]);
  await Promise.all([
    seedFarmer(owner, makeChallenge(token, profile, Date.now() + 60_000)),
    seedFarmer(other),
    seedFarmer(expired, makeChallenge(`expired-${token}`, profile, Date.now() - 1)),
  ]);

  const changedPatch = { ...profile, phoneNumber: '09179999999' };
  const mismatch = await complete(owner, token, changedPatch);
  assert.equal(mismatch.status, 422);
  assert.match(mismatch.body.error, /does not match/i);

  const reusedByOther = await complete(other, token, profile);
  assert.equal(reusedByOther.status, 422);

  const expiredResult = await complete(expired, `expired-${token}`, profile);
  assert.equal(expiredResult.status, 422);
  assert.match(expiredResult.body.error, /expired/i);

  const saved = await fetch(`${firestoreUrl}/users/${owner.localId}`, { headers: { Authorization: 'Bearer owner' } });
  const savedUser = await saved.json();
  assert.equal(savedUser.fields.displayName.stringValue, 'Farmer Original');
  assert.equal(savedUser.fields.phoneNumber.stringValue, '09170000000');
});
