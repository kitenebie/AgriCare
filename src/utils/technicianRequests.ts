import { isRequestAvailableToTechnician as matchesRequestForTechnician } from '../../functions/shared/technicianServiceMatching';

export interface ServiceRequest {
  id: string;
  serviceType: string;
  animalName: string;
  animalType?: string;
  animalBreed?: string;
  animalQuantity?: number;
  farmerName: string;
  farmerId: string;
  date: string;
  time: string;
  status: string;
  description: string;
  technicianId: string;
  technicianName: string;
  location?: string;
  appointmentLatitude?: number | null;
  appointmentLongitude?: number | null;
  responseDeadlineAt?: { toMillis?: () => number } | Date | number;
  declinedByTechnicianIds?: string[];
  eligibleTechnicianIds?: string[];
  animalTypeId?: string;
  serviceTypeId?: string;
  createdAt?: unknown;
}

export const isRequestAvailableToTechnician = (request: ServiceRequest, technicianId: string) => {
  return matchesRequestForTechnician(request, technicianId);
};
