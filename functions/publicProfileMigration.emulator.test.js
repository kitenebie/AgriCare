const test = require('node:test');
const assert = require('node:assert/strict');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { backfillPublicProfiles } = require('./scripts/backfill-public-profiles');

test('public profile migration copies only active allowlisted data and preserves users', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const projectId = process.env.GCLOUD_PROJECT || 'demo-agricare';
  const app = initializeApp({ projectId }, `public-profile-migration-${Date.now()}`);
  const db = getFirestore(app);
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const activeRef = db.collection('users').doc(`active-${runId}`);
  const inactiveRef = db.collection('users').doc(`inactive-${runId}`);
  const inactivePublicRef = db.collection('publicProfiles').doc(inactiveRef.id);
  try {
    await activeRef.set({ status: 'active', role: 'technician', displayName: 'Technician', email: 'private@example.test', idImageUrl: 'private-id' });
    await inactiveRef.set({ status: 'pending', role: 'technician', email: 'pending@example.test' });
    await inactivePublicRef.set({ displayName: 'Outdated profile' });
    await backfillPublicProfiles(db);

    const [user, publicProfile, inactivePublic] = await Promise.all([
      activeRef.get(), db.collection('publicProfiles').doc(activeRef.id).get(), inactivePublicRef.get(),
    ]);
    assert.equal(user.data().email, 'private@example.test');
    assert.equal(publicProfile.data().displayName, 'Technician');
    assert.equal('email' in publicProfile.data(), false);
    assert.equal('idImageUrl' in publicProfile.data(), false);
    assert.equal(inactivePublic.exists, false);
  } finally {
    await activeRef.delete();
    await inactiveRef.delete();
    await db.collection('publicProfiles').doc(activeRef.id).delete();
    await app.delete();
  }
});
