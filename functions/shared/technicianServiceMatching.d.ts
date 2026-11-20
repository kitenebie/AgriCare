export interface ServiceCatalogItem { id: string; name: string; iconName?: string; animalTypeId?: string; specializationId?: string; serviceTypeId?: string; aliases?: string[] }
export interface TechnicianMatchingProfile { role?: string; status?: string; available?: boolean; qualificationVerified?: boolean; qualificationKeys?: string[] }
export interface QualificationSelection {
  valid: boolean;
  error?: string;
  specializationIds?: string[];
  subSpecializationIds?: string[];
  expertise?: string[];
  specialization?: string;
  qualificationKeys?: string[];
}
export const catalog: {
  animalTypes: ServiceCatalogItem[];
  breeds: Array<ServiceCatalogItem & { animalTypeId: string }>;
  serviceTypes: ServiceCatalogItem[];
  specializations: Array<ServiceCatalogItem & { animalTypeId: string }>;
  subSpecializations: Array<ServiceCatalogItem & { specializationId: string; animalTypeId: string; serviceTypeId: string }>;
};
export function normalizeAnimalTypeId(value: unknown): string;
export function qualificationKey(animalTypeId: string, serviceTypeId: string): string;
export function validateQualifications(specializationIds: unknown, subSpecializationIds: unknown): QualificationSelection;
export function isTechnicianQualified(technician: TechnicianMatchingProfile, animalTypeId: string, serviceTypeId: string): boolean;
export function isBreedValid(breedId: string, animalTypeId: string): boolean;
export function eligibleTechnicians<T extends TechnicianMatchingProfile>(technicians: T[], animalTypeId: string, serviceTypeId: string): T[];
export function isRequestAvailableToTechnician(request: { status?: string; technicianId?: string; animalTypeId?: string; serviceTypeId?: string; eligibleTechnicianIds?: string[]; declinedByTechnicianIds?: string[] }, technicianId: string): boolean;
export function canAcceptServiceRequest(request: { status?: string; technicianId?: string; animalTypeId?: string; serviceTypeId?: string; eligibleTechnicianIds?: string[]; declinedByTechnicianIds?: string[] }, technicianId: string, technician: TechnicianMatchingProfile): boolean;
