import firestore from '@react-native-firebase/firestore';
import { authInstance, Collections } from './firebase';
import { callBackend } from './backendApi';
import { catalog, hasSpecializationForAnyAnimal, normalizeAnimalTypeId } from '../../functions/shared/technicianServiceMatching';
import type { AvailabilitySlot, TimeRange } from '@/utils/availability';

export interface RelevantTechnician {
  id: string;
  displayName: string;
  role?: string;
  status?: string;
  qualificationVerified?: boolean;
  qualificationKeys?: string[];
  available?: boolean;
  specialization?: string;
  expertise?: string[];
  photoURL?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  availabilitySlots?: AvailabilitySlot[];
  alwaysAvailable?: TimeRange[] | TimeRange;
  alwaysAvailableEnabled?: boolean;
  timezone?: string;
}

export async function getRelevantTechnicians(): Promise<RelevantTechnician[]> {
  const uid = authInstance.currentUser?.uid;
  if (!uid) throw new Error('Sign in to discover technicians.');

  let animalTypes = new Set<string>();
  try {
    const animals = await firestore().collection('animals').where('ownerId', '==', uid).get();
    animalTypes = new Set(animals.docs.map(doc => {
      const animal = doc.data();
      return normalizeAnimalTypeId(animal.animalTypeId || animal.type || animal.name);
    }).filter(Boolean));
  } catch (error) {
    console.warn('[Technician Discovery] Could not load farmer animals for diagnostic:', error);
  }

  let allTechnicians: RelevantTechnician[] = [];
  try {
    const profiles = await firestore().collection(Collections.PUBLIC_PROFILES).where('role', '==', 'technician').get();
    allTechnicians = profiles.docs.map(doc => ({ ...doc.data(), id: doc.id } as RelevantTechnician));
  } catch (error) {
    console.warn('[Technician Discovery] Could not fetch public technician profiles:', error);
  }

  const hasRelatedAnimalType = (technician: RelevantTechnician) =>
    technician.qualificationKeys?.some(key => animalTypes.has(String(key).split(':')[0])) === true;
  const related = allTechnicians.filter(hasRelatedAnimalType);
  const unrelated = allTechnicians.filter(technician => !hasRelatedAnimalType(technician));
  const availableRelated = related.filter(technician => hasSpecializationForAnyAnimal(technician, [...animalTypes]));
  const logNames = (technicians: RelevantTechnician[]) => technicians.map(({ id, displayName, qualificationKeys, available }) => ({
    id, name: displayName || 'Technician', animalServices: qualificationKeys || [], available: available !== false,
  }));
  console.log('[Technician Discovery] Farmer animal types:', [...animalTypes]);
  console.log('[Technician Discovery] Public technician profiles fetched:', allTechnicians.length);
  console.log('[Technician Discovery] Related technicians:', logNames(related));
  console.log('[Technician Discovery] Unrelated technicians:', logNames(unrelated));

  try {
    const { technicians } = await callBackend<{ technicians: RelevantTechnician[] }>('getRelevantTechnicians');
    console.log('[Technician Discovery] Backend returned related technicians:', technicians?.length || 0);
    console.log('[Technician Discovery] Related technicians from backend:', logNames(technicians || []));
    if (technicians?.length) return technicians;
  } catch (error) {
    console.warn('Relevant technician backend unavailable; using public profiles:', error);

    // Request-service lookup is deployed and accepts one animal/service pair per request.
    const pairs = [...new Map(catalog.subSpecializations
      .filter(item => animalTypes.has(item.animalTypeId))
      .map(item => [`${item.animalTypeId}:${item.serviceTypeId}`, item])).values()];
    if (pairs.length) {
      try {
        const fetchEligible = (pair: typeof pairs[number]) => callBackend<{ technicians: RelevantTechnician[] }>('getEligibleTechnicians', {
          animalTypeId: pair.animalTypeId,
          serviceTypeId: pair.serviceTypeId,
        });
        const first = await fetchEligible(pairs[0]);
        const rest = await Promise.all(pairs.slice(1).map(fetchEligible));
        const fetched = [...(first.technicians || []), ...rest.flatMap(result => result.technicians || [])];
        const byId = new Map([...availableRelated, ...fetched].map(technician => [technician.id, technician]));
        const result = [...byId.values()];
        console.log('[Technician Discovery] Request-service endpoint returned technicians:', logNames(result));
        return result;
      } catch (fallbackError) {
        console.warn('[Technician Discovery] Request-service technician fallback failed:', fallbackError);
      }
    }
  }

  return availableRelated;
}
