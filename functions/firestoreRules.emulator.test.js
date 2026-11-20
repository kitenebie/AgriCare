const test = require('node:test');
const assert = require('node:assert/strict');

test('Firestore rules restrict service requests to farmers and eligible technicians', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST,
}, async () => {
  const projectId = process.env.GCLOUD_PROJECT || 'demo-agricare';
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const firestoreUrl = `http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents`;
  const authUrl = `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-key`;

  const createIdentity = async role => {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${role}-${runId}@example.test`, password: 'test-password-123', returnSecureToken: true }),
    });
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    return body;
  };
  const seed = async (path, id, fields) => {
    const response = await fetch(`${firestoreUrl}/${path}?documentId=${encodeURIComponent(id)}`, {
      method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }),
    });
    assert.equal(response.status, 200, await response.text());
  };
  const readRequest = (id, token) => fetch(`${firestoreUrl}/appointments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  const readUser = (id, token, collection = 'users') => fetch(`${firestoreUrl}/${collection}/${id}`, { headers: { Authorization: `Bearer ${token}` } });

  const [qualified, unqualified, farmer, admin, newTech, newFarmer, pendingFarmer] = await Promise.all([
    createIdentity('qualified'), createIdentity('unqualified'), createIdentity('farmer'), createIdentity('admin'),
    createIdentity('new-tech'), createIdentity('new-farmer'), createIdentity('pending-farmer'),
  ]);
  const techFields = (uid, qualificationKeys) => ({
    uid: { stringValue: uid }, role: { stringValue: 'technician' }, status: { stringValue: 'active' },
    qualificationVerified: { booleanValue: true }, qualificationKeys: { arrayValue: { values: qualificationKeys.map(stringValue => ({ stringValue })) } },
  });
  await Promise.all([
    seed('users', qualified.localId, techFields(qualified.localId, ['pig:2'])),
    seed('users', unqualified.localId, techFields(unqualified.localId, ['cattle:2'])),
    seed('users', farmer.localId, { uid: { stringValue: farmer.localId }, role: { stringValue: 'farmer' }, status: { stringValue: 'active' } }),
    seed('users', admin.localId, { uid: { stringValue: admin.localId }, role: { stringValue: 'admin' }, status: { stringValue: 'active' } }),
    seed('publicProfiles', qualified.localId, { uid: { stringValue: qualified.localId }, role: { stringValue: 'technician' }, status: { stringValue: 'active' }, displayName: { stringValue: 'Qualified technician' } }),
  ]);
  assert.equal((await readUser(qualified.localId, farmer.idToken)).status, 403);
  assert.equal((await readUser(farmer.localId, farmer.idToken)).status, 200);
  assert.equal((await readUser(qualified.localId, farmer.idToken, 'publicProfiles')).status, 200);
  const forgePublicProfile = await fetch(`${firestoreUrl}/publicProfiles/${qualified.localId}?updateMask.fieldPaths=displayName`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${farmer.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { displayName: { stringValue: 'Forged name' } } }),
  });
  assert.equal(forgePublicProfile.status, 403);
  const createProfile = await fetch(`${firestoreUrl}/users?documentId=${newTech.localId}`, {
    method: 'POST', headers: { Authorization: `Bearer ${newTech.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: {
      uid: { stringValue: newTech.localId }, role: { stringValue: 'technician' }, status: { stringValue: 'pending' },
      qualificationVerified: { booleanValue: false }, specializationIds: { arrayValue: { values: [] } },
      subSpecializationIds: { arrayValue: { values: [] } }, qualificationKeys: { arrayValue: { values: [] } },
    } }),
  });
  assert.equal(createProfile.status, 200, await createProfile.clone().text());
  const createFarmerProfile = async (user, status) => fetch(`${firestoreUrl}/users?documentId=${user.localId}`, {
    method: 'POST', headers: { Authorization: `Bearer ${user.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: {
      uid: { stringValue: user.localId }, role: { stringValue: 'farmer' }, status: { stringValue: status },
      qualificationVerified: { booleanValue: false }, specializationIds: { arrayValue: { values: [] } },
      subSpecializationIds: { arrayValue: { values: [] } }, qualificationKeys: { arrayValue: { values: [] } },
    } }),
  });
  assert.equal((await createFarmerProfile(newFarmer, 'active')).status, 200);
  assert.equal((await createFarmerProfile(pendingFarmer, 'pending')).status, 403);
  const updateFarmerProfile = await fetch(`${firestoreUrl}/users/${farmer.localId}?updateMask.fieldPaths=displayName`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${farmer.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { displayName: { stringValue: 'Updated farmer' } } }),
  });
  assert.equal(updateFarmerProfile.status, 403);
  const replaceFarmerId = await fetch(`${firestoreUrl}/users/${farmer.localId}?updateMask.fieldPaths=idImageUrl`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${farmer.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { idImageUrl: { stringValue: 'https://example.test/forged-id.jpg' } } }),
  });
  assert.equal(replaceFarmerId.status, 403);
  const forgeProfileChallenge = await fetch(`${firestoreUrl}/users/${farmer.localId}?updateMask.fieldPaths=profileUpdateChallenge`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${farmer.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { profileUpdateChallenge: { mapValue: { fields: { tokenHash: { stringValue: 'forged' } } } } } }),
  });
  assert.equal(forgeProfileChallenge.status, 403);
  const elevateFarmerRole = await fetch(`${firestoreUrl}/users/${farmer.localId}?updateMask.fieldPaths=role`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${farmer.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { role: { stringValue: 'admin' } } }),
  });
  assert.equal(elevateFarmerRole.status, 403);
  const forgedQualification = await fetch(`${firestoreUrl}/users/${newTech.localId}?updateMask.fieldPaths=qualificationVerified&updateMask.fieldPaths=qualificationKeys`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${newTech.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { qualificationVerified: { booleanValue: true }, qualificationKeys: { arrayValue: { values: [{ stringValue: 'pig:2' }] } } } }),
  });
  assert.equal(forgedQualification.status, 403);
  const appointmentId = `request-${runId}`;
  await seed('appointments', appointmentId, {
    farmerId: { stringValue: farmer.localId }, technicianId: { stringValue: '' }, status: { stringValue: 'pending' },
    animalTypeId: { stringValue: 'pig' }, serviceTypeId: { stringValue: '2' },
    eligibleTechnicianIds: { arrayValue: { values: [{ stringValue: qualified.localId }] } },
  });
  const historicalId = `history-${runId}`;
  await seed('appointments', historicalId, {
    farmerId: { stringValue: farmer.localId }, technicianId: { stringValue: unqualified.localId }, status: { stringValue: 'completed' },
  });

  assert.equal((await readRequest(appointmentId, qualified.idToken)).status, 200);
  assert.equal((await readRequest(appointmentId, farmer.idToken)).status, 200);
  assert.equal((await readRequest(appointmentId, unqualified.idToken)).status, 403);
  assert.equal((await readRequest(appointmentId, admin.idToken)).status, 200);
  assert.equal((await readRequest(historicalId, unqualified.idToken)).status, 200);

  const eligibleQuery = (token, uid) => fetch(`${firestoreUrl}:runQuery`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'appointments' }],
      where: { compositeFilter: { op: 'AND', filters: [
        { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'pending' } } },
        { fieldFilter: { field: { fieldPath: 'eligibleTechnicianIds' }, op: 'ARRAY_CONTAINS', value: { stringValue: uid } } },
      ] } },
    } }),
  });
  const visibleList = await eligibleQuery(qualified.idToken, qualified.localId);
  assert.equal(visibleList.status, 200, await visibleList.clone().text());
  const visibleRequests = await visibleList.json();
  assert.equal(visibleRequests.filter(item => item.document?.name?.endsWith(appointmentId)).length, 1);
  const hiddenList = await eligibleQuery(unqualified.idToken, unqualified.localId);
  const hiddenText = await hiddenList.text();
  assert.ok(hiddenList.status === 403 || (hiddenList.status === 200 && JSON.parse(hiddenText).filter(item => item.document).length === 0), `${hiddenList.status}: ${hiddenText}`);
  const attemptedClaim = await fetch(`${firestoreUrl}/appointments/${appointmentId}?updateMask.fieldPaths=status&updateMask.fieldPaths=technicianId`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${unqualified.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { status: { stringValue: 'confirmed' }, technicianId: { stringValue: unqualified.localId } } }),
  });
  assert.equal(attemptedClaim.status, 403);

  const adminAssignUnqualified = await fetch(`${firestoreUrl}/appointments/${appointmentId}?updateMask.fieldPaths=technicianId`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${admin.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { technicianId: { stringValue: unqualified.localId } } }),
  });
  assert.equal(adminAssignUnqualified.status, 403);
  const mismatchedAppointmentId = `admin-mismatch-${runId}`;
  await seed('appointments', mismatchedAppointmentId, {
    farmerId: { stringValue: farmer.localId }, technicianId: { stringValue: '' }, status: { stringValue: 'pending' },
    animalTypeId: { stringValue: 'pig' }, serviceTypeId: { stringValue: '2' },
    eligibleTechnicianIds: { arrayValue: { values: [{ stringValue: unqualified.localId }] } },
  });
  const adminAssignWrongService = await fetch(`${firestoreUrl}/appointments/${mismatchedAppointmentId}?updateMask.fieldPaths=technicianId`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${admin.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { technicianId: { stringValue: unqualified.localId } } }),
  });
  assert.equal(adminAssignWrongService.status, 403);
  const adminAssignQualified = await fetch(`${firestoreUrl}/appointments/${appointmentId}?updateMask.fieldPaths=technicianId`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${admin.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { technicianId: { stringValue: qualified.localId } } }),
  });
  assert.equal(adminAssignQualified.status, 200, await adminAssignQualified.clone().text());

  const clientCreate = await fetch(`${firestoreUrl}/appointments?documentId=client-${runId}`, {
    method: 'POST', headers: { Authorization: `Bearer ${farmer.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { farmerId: { stringValue: farmer.localId } } }),
  });
  assert.equal(clientCreate.status, 403);
});
