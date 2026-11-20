const { initializeApp } = require('firebase-admin/app');
const { FieldPath, getFirestore } = require('firebase-admin/firestore');
const { toPublicProfile } = require('../shared/publicProfile');

async function backfillPublicProfiles(db = getFirestore()) {
  let cursor;
  let count = 0;
  do {
    let query = db.collection('users').orderBy(FieldPath.documentId()).limit(400);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    const batch = db.batch();
    for (const user of snapshot.docs) {
      const profileRef = db.collection('publicProfiles').doc(user.id);
      const profile = toPublicProfile(user.id, user.data());
      if (profile) batch.set(profileRef, profile);
      else batch.delete(profileRef);
      count += Number(!!profile);
    }
    await batch.commit();
    cursor = snapshot.docs[snapshot.docs.length - 1];
  } while (true);
  return count;
}

if (require.main === module) {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) throw new Error('Set GCLOUD_PROJECT before running the public profile migration.');
  initializeApp({ projectId });
  backfillPublicProfiles().then(count => {
    process.stdout.write(`Synced ${count} active public profiles.\n`);
  }).catch(error => {
    console.error('Public profile backfill failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { backfillPublicProfiles };
