const publicFields = [
  'displayName', 'role', 'status', 'photoURL', 'specialization', 'expertise',
  'specializationIds', 'subSpecializationIds', 'qualificationKeys',
  'qualificationVerified', 'available', 'availabilitySlots', 'alwaysAvailable',
  'alwaysAvailableEnabled', 'rating', 'ratingCount', 'reviewCount',
];

const toPublicProfile = (uid, user) => user?.status === 'active'
  ? Object.fromEntries([['uid', uid], ...publicFields.filter(field => field in user).map(field => [field, user[field]])])
  : null;

module.exports = { toPublicProfile };
