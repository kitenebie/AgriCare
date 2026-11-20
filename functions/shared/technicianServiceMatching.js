const catalog = require('./technicianServiceCatalog.json');

const normalizeAnimalTypeId = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return catalog.animalTypes.find(type => type.id === normalized || type.aliases.includes(normalized))?.id || '';
};

const qualificationKey = (animalTypeId, serviceTypeId) => `${animalTypeId}:${String(serviceTypeId)}`;

const validateQualifications = (specializationIds, subSpecializationIds) => {
  if (!Array.isArray(specializationIds) || !Array.isArray(subSpecializationIds)) return { valid: false, error: 'Select at least one specialization and service.' };
  if (!specializationIds.length || !subSpecializationIds.length) return { valid: false, error: 'Select at least one specialization and service.' };
  if (new Set(specializationIds).size !== specializationIds.length || new Set(subSpecializationIds).size !== subSpecializationIds.length) return { valid: false, error: 'Duplicate qualifications are not allowed.' };

  const selectedSpecializations = new Set(specializationIds);
  const selectedSubs = subSpecializationIds.map(id => catalog.subSpecializations.find(item => item.id === id));
  if (specializationIds.some(id => !catalog.specializations.some(item => item.id === id)) || selectedSubs.some(item => !item || !selectedSpecializations.has(item.specializationId))) {
    return { valid: false, error: 'One or more selected qualifications are invalid.' };
  }
  if (specializationIds.some(id => !selectedSubs.some(item => item.specializationId === id))) {
    return { valid: false, error: 'Choose at least one service under every selected animal specialization.' };
  }

  const subIds = selectedSubs.map(item => item.id);
  const expertise = selectedSubs.map(item => item.name);
  return {
    valid: true,
    specializationIds: [...specializationIds],
    subSpecializationIds: subIds,
    expertise,
    specialization: specializationIds.map(id => catalog.specializations.find(item => item.id === id).name).join(', '),
    qualificationKeys: [...new Set(selectedSubs.map(item => qualificationKey(item.animalTypeId, item.serviceTypeId)))],
  };
};

const isTechnicianQualified = (technician, animalTypeId, serviceTypeId) => {
  const typeId = normalizeAnimalTypeId(animalTypeId);
  return !!typeId && technician?.qualificationVerified === true &&
    Array.isArray(technician.qualificationKeys) &&
    technician.qualificationKeys.includes(qualificationKey(typeId, serviceTypeId));
};

const isBreedValid = (breedId, animalTypeId) => {
  const typeId = normalizeAnimalTypeId(animalTypeId);
  return catalog.breeds.some(breed => breed.id === breedId && breed.animalTypeId === typeId);
};

const eligibleTechnicians = (technicians, animalTypeId, serviceTypeId) =>
  technicians.filter(technician => technician.role === 'technician' && technician.status === 'active' &&
    technician.available !== false && isTechnicianQualified(technician, animalTypeId, serviceTypeId));

const isRequestAvailableToTechnician = (request, technicianId) => request?.status === 'pending' &&
  !request.declinedByTechnicianIds?.includes(technicianId) &&
  (request.eligibleTechnicianIds?.includes(technicianId) === true ||
    ((!request.animalTypeId || !request.serviceTypeId) && request.technicianId === technicianId));

const canAcceptServiceRequest = (request, technicianId, technician) => {
  if (!isRequestAvailableToTechnician(request, technicianId)) return false;
  return !request.animalTypeId || !request.serviceTypeId ||
    isTechnicianQualified(technician, request.animalTypeId, request.serviceTypeId);
};

module.exports = { catalog, normalizeAnimalTypeId, qualificationKey, validateQualifications, isTechnicianQualified, isBreedValid, eligibleTechnicians, isRequestAvailableToTechnician, canAcceptServiceRequest };
