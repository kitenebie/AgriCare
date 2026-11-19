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
  createdAt?: unknown;
}

export const isRequestAvailableToTechnician = (request: ServiceRequest, technicianId: string) => {
  if (request.status !== 'pending' || request.declinedByTechnicianIds?.includes(technicianId)) return false;
  const assignedId = request.technicianId || '';
  const deadline = typeof request.responseDeadlineAt === 'number'
    ? request.responseDeadlineAt
    : request.responseDeadlineAt instanceof Date
      ? request.responseDeadlineAt.getTime()
      : request.responseDeadlineAt?.toMillis?.();
  return assignedId === technicianId || !assignedId || (request.technicianName || '').toLowerCase() === 'unassigned' || (typeof deadline === 'number' && deadline <= Date.now());
};
