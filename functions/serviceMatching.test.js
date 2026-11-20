const test = require('node:test');
const assert = require('node:assert/strict');
const { catalog, normalizeAnimalTypeId, validateQualifications, isTechnicianQualified, isBreedValid, eligibleTechnicians, isRequestAvailableToTechnician, canAcceptServiceRequest } = require('./shared/technicianServiceMatching');

test('normalizes Swine and Pig to the same animal type', () => {
  assert.equal(normalizeAnimalTypeId('Swine'), 'pig');
  assert.equal(normalizeAnimalTypeId('Pig'), 'pig');
});

test('animal categories use distinct species icons', () => {
  assert.deepEqual(catalog.animalTypes.map(({ id, iconName }) => [id, iconName]), [
    ['pig', 'animal-pig'], ['cattle', 'animal-cattle'], ['goat', 'animal-goat'],
    ['horse', 'animal-horse'], ['carabao', 'animal-carabao'],
  ]);
});

test('allows a technician to choose three pig sub-specializations', () => {
  const result = validateQualifications(['pig-healthcare-treatment'], [
    'pig-artificial-insemination', 'pig-vaccination', 'pig-deworming',
  ]);
  assert.equal(result.valid, true);
  assert.deepEqual(result.qualificationKeys, ['pig:5', 'pig:2', 'pig:4']);
});

test('requires a selected service for every selected animal specialization', () => {
  assert.equal(validateQualifications(['pig-healthcare-treatment'], []).valid, false);
  assert.equal(validateQualifications(['pig-healthcare-treatment', 'cattle-healthcare-treatment'], ['pig-vaccination']).valid, false);
  assert.equal(validateQualifications(['pig-healthcare-treatment'], ['cattle-vaccination']).valid, false);
});

test('rejects duplicate and unknown qualification IDs', () => {
  assert.equal(validateQualifications(['pig-healthcare-treatment'], ['pig-vaccination', 'pig-vaccination']).valid, false);
  assert.equal(validateQualifications(['unknown'], ['pig-vaccination']).valid, false);
});

test('matches exact animal and service IDs and requires server-verified qualifications', () => {
  const technician = { qualificationVerified: true, qualificationKeys: ['pig:2'] };
  assert.equal(isTechnicianQualified(technician, 'swine', '2'), true);
  assert.equal(isTechnicianQualified(technician, 'cattle', '2'), false);
  assert.equal(isTechnicianQualified(technician, 'pig', '4'), false);
  assert.equal(isTechnicianQualified({ ...technician, qualificationVerified: false }, 'pig', '2'), false);
});

test('validates breed IDs against their animal type', () => {
  assert.equal(isBreedValid('pig-duroc', 'swine'), true);
  assert.equal(isBreedValid('pig-duroc', 'cattle'), false);
  assert.equal(isBreedValid('cattle-holstein', 'pig'), false);
  assert.equal(catalog.serviceTypes.some(service => service.id === '3'), true);
  assert.equal(catalog.subSpecializations.some(item => item.serviceTypeId === '3'), false);
});

test('keeps all existing service IDs, names, and icon names', () => {
  assert.deepEqual(catalog.serviceTypes.map(({ id, name, iconName }) => [id, name, iconName]), [
    ['1', 'Health Check', 'health-check'], ['2', 'Vaccination', 'vaccination'], ['3', 'Treatment', 'treatment'],
    ['4', 'Deworming', 'bug'], ['5', 'Artificial Insemination', 'dna'], ['6', 'Iron Injection', 'vaccination'],
    ['7', 'Vitamin Injection', 'vaccination'], ['8', 'Castration', 'treatment'], ['9', 'Wound Treatment', 'health-check'],
    ['10', 'Antibiotic Injection', 'vaccination'],
  ]);
  assert.equal(catalog.subSpecializations.length, 39);
});

test('general request matching excludes inactive, unavailable, and differently qualified technicians', () => {
  const techs = [
    { id: 'pig', role: 'technician', status: 'active', available: true, qualificationVerified: true, qualificationKeys: ['pig:2'] },
    { id: 'cattle', role: 'technician', status: 'active', available: true, qualificationVerified: true, qualificationKeys: ['cattle:2'] },
    { id: 'inactive', role: 'technician', status: 'pending', available: true, qualificationVerified: true, qualificationKeys: ['pig:2'] },
    { id: 'unavailable', role: 'technician', status: 'active', available: false, qualificationVerified: true, qualificationKeys: ['pig:2'] },
    { id: 'unverified', role: 'technician', status: 'active', available: true, qualificationVerified: false, qualificationKeys: ['pig:2'] },
  ];
  assert.deepEqual(eligibleTechnicians(techs, 'pig', '2').map(tech => tech.id), ['pig']);
});

test('request visibility requires explicit eligibility for new requests and preserves direct legacy assignments', () => {
  const request = { status: 'pending', technicianId: '', animalTypeId: 'pig', serviceTypeId: '2' };
  assert.equal(isRequestAvailableToTechnician(request, 'unqualified'), false);
  assert.equal(isRequestAvailableToTechnician({ ...request, eligibleTechnicianIds: ['qualified'] }, 'qualified'), true);
  assert.equal(isRequestAvailableToTechnician({ ...request, eligibleTechnicianIds: ['qualified'] }, 'declined'), false);
  assert.equal(isRequestAvailableToTechnician({ ...request, eligibleTechnicianIds: ['qualified'], declinedByTechnicianIds: ['qualified'] }, 'qualified'), false);
  assert.equal(isRequestAvailableToTechnician({ status: 'pending', technicianId: 'legacy-tech' }, 'legacy-tech'), true);
});

test('acceptance requires both explicit request eligibility and an exact verified qualification', () => {
  const request = { status: 'pending', animalTypeId: 'pig', serviceTypeId: '2', eligibleTechnicianIds: ['qualified'] };
  const tech = { role: 'technician', status: 'active', qualificationVerified: true, qualificationKeys: ['pig:2'] };
  assert.equal(canAcceptServiceRequest(request, 'qualified', tech), true);
  assert.equal(canAcceptServiceRequest(request, 'other', tech), false);
  assert.equal(canAcceptServiceRequest({ ...request, animalTypeId: 'cattle' }, 'qualified', tech), false);
  assert.equal(canAcceptServiceRequest(request, 'qualified', { ...tech, qualificationVerified: false }), false);
});
