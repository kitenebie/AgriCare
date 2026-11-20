const test = require('node:test');
const assert = require('node:assert/strict');

test('service request APIs create eligible requests and allow only one qualified acceptance', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST,
}, async () => {
  const projectId = process.env.GCLOUD_PROJECT || 'demo-agricare';
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST || '127.0.0.1:5001';
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const authUrl = `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-key`;
  const firestoreUrl = `http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents`;
  const functionUrl = name => `http://${functionsHost}/${projectId}/us-central1/${name}`;

  const identity = async role => {
    const response = await fetch(authUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${role}-${runId}@example.test`, password: 'test-password-123', returnSecureToken: true }),
    });
    const data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    return data;
  };
  const seedUser = async (user, role, qualifications = [], status = 'active', qualificationVerified = true) => {
    const fields = {
      uid: { stringValue: user.localId }, role: { stringValue: role }, status: { stringValue: status },
      displayName: { stringValue: `${role} ${user.localId.slice(0, 5)}` },
      email: { stringValue: `${role}-${user.localId}@example.test` }, phoneNumber: { stringValue: 'private-phone' },
      idImageUrl: { stringValue: 'private-id' }, proofImageUrl: { stringValue: 'private-proof' },
    };
    if (role === 'technician') Object.assign(fields, {
      qualificationVerified: { booleanValue: qualificationVerified },
      qualificationKeys: { arrayValue: { values: qualifications.map(stringValue => ({ stringValue })) } },
      available: { booleanValue: true },
      alwaysAvailableEnabled: { booleanValue: true },
      alwaysAvailable: { mapValue: { fields: { startTime: { stringValue: '12:00 AM' }, endTime: { stringValue: '11:59 PM' } } } },
    });
    const response = await fetch(`${firestoreUrl}/users?documentId=${user.localId}`, {
      method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }),
    });
    assert.equal(response.status, 200, await response.text());
  };
  const seed = async (collection, id, fields) => {
    const response = await fetch(`${firestoreUrl}/${collection}?documentId=${encodeURIComponent(id)}`, {
      method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }),
    });
    assert.equal(response.status, 200, await response.text());
  };
  const call = async (name, user, body) => {
    const response = await fetch(functionUrl(name), {
      method: 'POST', headers: { Authorization: `Bearer ${user.idToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  const waitForPublicProfile = async uid => {
    let response;
    for (let attempt = 0; attempt < 60; attempt++) {
      response = await fetch(`${firestoreUrl}/publicProfiles/${uid}`, { headers: { Authorization: 'Bearer owner' } });
      if (response.ok) return response.json();
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    assert.equal(response.status, 200, `Public profile for ${uid} was not synchronized`);
  };

  const [farmer, pigTechA, pigTechB, cattleTech, legacyPendingFarmer, registeringTech] = await Promise.all([
    identity('farmer'), identity('pig-a'), identity('pig-b'), identity('cattle'), identity('pending-farmer'), identity('registering-tech'),
  ]);
  await Promise.all([
    seedUser(farmer, 'farmer'), seedUser(pigTechA, 'technician', ['pig:2']),
    seedUser(pigTechB, 'technician', ['pig:2']), seedUser(cattleTech, 'technician', ['cattle:2']),
    seedUser(legacyPendingFarmer, 'farmer', [], 'pending'),
    seedUser(registeringTech, 'technician', [], 'pending', false),
  ]);
  const farmerAnimalId = `animal-${farmer.localId}`;
  const legacyFarmerAnimalId = `animal-${legacyPendingFarmer.localId}`;
  await Promise.all([
    seed('animals', farmerAnimalId, { ownerId: { stringValue: farmer.localId }, name: { stringValue: 'Babe' }, type: { stringValue: 'Pig' }, breed: { stringValue: 'Duroc' }, count: { integerValue: 3 } }),
    seed('animals', legacyFarmerAnimalId, { ownerId: { stringValue: legacyPendingFarmer.localId }, name: { stringValue: 'Porky' }, type: { stringValue: 'Pig' }, breed: { stringValue: 'Duroc' }, count: { integerValue: 2 } }),
  ]);
  const publicProfile = await waitForPublicProfile(pigTechA.localId);
  assert.equal(publicProfile.fields.displayName.stringValue.startsWith('technician'), true);
  for (const privateField of ['email', 'phoneNumber', 'idImageUrl', 'proofImageUrl', 'fcmToken']) {
    assert.equal(privateField in publicProfile.fields, false, `${privateField} leaked to public profile`);
  }
  const catalog = await call('getServiceCatalog', farmer, {});
  assert.equal(catalog.status, 200, JSON.stringify(catalog.body));
  for (const [collection, id] of [
    ['animalTypes', 'pig'], ['animalBreeds', 'pig-duroc'], ['serviceTypes', '8'],
    ['specializations', 'pig-healthcare-treatment'], ['subSpecializations', 'pig-castration'],
  ]) {
    const seeded = await fetch(`${firestoreUrl}/${collection}/${id}`, { headers: { Authorization: 'Bearer owner' } });
    assert.equal(seeded.status, 200, `${collection}/${id} was not seeded`);
  }
  const qualificationUpdate = await call('updateTechnicianQualifications', registeringTech, {
    specializationIds: ['pig-healthcare-treatment'],
    subSpecializationIds: ['pig-vaccination', 'pig-deworming'],
  });
  assert.equal(qualificationUpdate.status, 200, JSON.stringify(qualificationUpdate.body));
  assert.deepEqual(qualificationUpdate.body.qualificationKeys.sort(), ['pig:2', 'pig:4']);
  const registeredProfile = await fetch(`${firestoreUrl}/users/${registeringTech.localId}`, { headers: { Authorization: 'Bearer owner' } }).then(response => response.json());
  assert.equal(registeredProfile.fields.qualificationVerified.booleanValue, true);
  assert.deepEqual(registeredProfile.fields.subSpecializationIds.arrayValue.values.map(item => item.stringValue), ['pig-vaccination', 'pig-deworming']);
  const invalidQualificationUpdate = await call('updateTechnicianQualifications', registeringTech, {
    specializationIds: ['pig-healthcare-treatment'], subSpecializationIds: ['cattle-vaccination'],
  });
  assert.equal(invalidQualificationUpdate.status, 400);

  const invalidPush = await call('sendPushNotification', farmer, {
    targetUserId: pigTechA.localId, payload: { title: 'Test', body: 'Test', data: { type: 'new_chat_message', chatId: 'not-this-chat' } },
  });
  assert.equal(invalidPush.status, 403);
  const legacyProfileMigration = await call('migrateLegacyUserProfile', farmer, {});
  assert.equal(legacyProfileMigration.status, 200);
  assert.equal(legacyProfileMigration.body.found, true);

  const rateRequestId = `rate-${runId}`;
  await seed('rateRequests', rateRequestId, {
    technicianId: { stringValue: pigTechA.localId }, technicianName: { stringValue: 'Untrusted display' },
    farmerId: { stringValue: farmer.localId }, farmerName: { stringValue: 'Untrusted farmer' },
    chatId: { stringValue: [farmer.localId, pigTechA.localId].sort().join('_') }, animalName: { stringValue: 'Duroc pig' },
    serviceType: { stringValue: 'Vaccination' }, status: { stringValue: 'pending' }, rating: { nullValue: null },
  });
  const submittedRating = await call('submitTechnicianRating', farmer, { rateRequestId, rating: 5 });
  assert.equal(submittedRating.status, 200, JSON.stringify(submittedRating.body));
  assert.equal(submittedRating.body.newCount, 1);
  const duplicateRating = await call('submitTechnicianRating', farmer, { rateRequestId, rating: 1 });
  assert.equal(duplicateRating.status, 403);

  const commonRequest = { animalTypeId: 'pig', animalRecordId: farmerAnimalId, serviceTypeId: '2', animalBreedId: 'pig-duroc', animalQuantity: 2,
    date: '2099-01-01', time: '10:00 AM', description: 'Vaccination', location: 'Test farm',
    appointmentLatitude: 14.5995, appointmentLongitude: 120.9842, appointmentLocationAccuracy: 5 };
  const eligible = await call('getEligibleTechnicians', farmer, {
    animalTypeId: 'pig', serviceTypeId: '2', date: commonRequest.date, time: '09:00 AM',
  });
  assert.equal(eligible.status, 200, JSON.stringify(eligible.body));
  assert.deepEqual(eligible.body.technicians.map(tech => tech.id).sort(), [pigTechA.localId, pigTechB.localId].sort());
  const created = await call('createServiceRequest', farmer, commonRequest);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.eligibleTechnicianCount, 2);
  const legacyCreated = await call('createServiceRequest', legacyPendingFarmer, { ...commonRequest, animalRecordId: legacyFarmerAnimalId, time: '04:00 PM' });
  assert.equal(legacyCreated.status, 201, JSON.stringify(legacyCreated.body));
  const appointmentId = created.body.appointmentId;
  const stored = await fetch(`${firestoreUrl}/appointments/${appointmentId}`, { headers: { Authorization: 'Bearer owner' } }).then(response => response.json());
  assert.deepEqual(stored.fields.eligibleTechnicianIds.arrayValue.values.map(value => value.stringValue).sort(), [pigTechA.localId, pigTechB.localId].sort());
  assert.equal(stored.fields.animalBreedId.stringValue, 'pig-duroc');
  assert.equal(stored.fields.animalRecordId.stringValue, farmerAnimalId);
  assert.equal(stored.fields.animalName.stringValue, 'Babe');
  const notification = uid => fetch(`${firestoreUrl}/notifications/service-request-${appointmentId}-${uid}`, { headers: { Authorization: 'Bearer owner' } });
  assert.equal((await notification(pigTechA.localId)).status, 200);
  assert.equal((await notification(pigTechB.localId)).status, 200);
  assert.equal((await notification(cattleTech.localId)).status, 404);

  const [claimA, claimB] = await Promise.all([
    call('acceptServiceRequest', pigTechA, { appointmentId }), call('acceptServiceRequest', pigTechB, { appointmentId }),
  ]);
  assert.equal([claimA, claimB].filter(result => result.status === 200).length, 1, JSON.stringify([claimA, claimB]));
  assert.equal([claimA, claimB].filter(result => result.status === 422).length, 1, JSON.stringify([claimA, claimB]));

  const next = await call('createServiceRequest', farmer, { ...commonRequest, time: '12:00 PM' });
  assert.equal(next.status, 201, JSON.stringify(next.body));
  const unqualifiedClaim = await call('acceptServiceRequest', cattleTech, { appointmentId: next.body.appointmentId });
  assert.equal(unqualifiedClaim.status, 422);
  assert.match(unqualifiedClaim.body.error, /qualified|eligible/i);

  const direct = await call('createServiceRequest', farmer, { ...commonRequest, technicianId: pigTechA.localId, time: '02:00 PM' });
  assert.equal(direct.status, 201, JSON.stringify(direct.body));
  assert.equal(direct.body.eligibleTechnicianCount, 1);
  const directStored = await fetch(`${firestoreUrl}/appointments/${direct.body.appointmentId}`, { headers: { Authorization: 'Bearer owner' } }).then(response => response.json());
  assert.deepEqual(directStored.fields.eligibleTechnicianIds.arrayValue.values.map(value => value.stringValue), [pigTechA.localId]);
  assert.equal(directStored.fields.requestMode.stringValue, 'direct');

  const invalidDirect = await call('createServiceRequest', farmer, { ...commonRequest, technicianId: cattleTech.localId, time: '03:00 PM' });
  assert.equal(invalidDirect.status, 422);
  assert.match(invalidDirect.body.error, /qualified or available/i);

  const invalidBreed = await call('createServiceRequest', farmer, { ...commonRequest, animalBreedId: 'cattle-holstein', time: '02:00 PM' });
  assert.equal(invalidBreed.status, 422);
  const otherFarmerAnimal = await call('createServiceRequest', farmer, { ...commonRequest, animalRecordId: legacyFarmerAnimalId, time: '05:00 PM' });
  assert.equal(otherFarmerAnimal.status, 422);
  assert.match(otherFarmerAnimal.body.error, /does not belong/i);
  const mismatchedAnimal = await call('createServiceRequest', farmer, { ...commonRequest, animalTypeId: 'cattle', animalBreedId: 'cattle-holstein', time: '06:00 PM' });
  assert.equal(mismatchedAnimal.status, 422);
  assert.match(mismatchedAnimal.body.error, /does not match/i);
  const excessiveQuantity = await call('createServiceRequest', farmer, { ...commonRequest, animalQuantity: 4, time: '07:00 PM' });
  assert.equal(excessiveQuantity.status, 422);
  assert.match(excessiveQuantity.body.error, /cannot exceed/i);
});
