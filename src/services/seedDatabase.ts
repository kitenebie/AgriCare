/**
 * Database Seeder — Restructured with role-based collections
 * 
 * Structure:
 * users/           ← All user accounts (shared auth data)
 * admin/           ← Admin-specific data (FK: userId → users.id)
 * farmer/          ← Farmer-specific data (FK: userId → users.id)
 * technician/      ← Technician-specific data (FK: userId → users.id)
 * 
 * Shared collections:
 * appointments, consultations, knowledgeBase, communityForum,
 * livestockCategories, reviews, reports, notifications,
 * announcements, emergencyRequests
 * 
 * Realtime DB:
 * chats/, messages/, typing/, onlineStatus/
 */

import {
  collection,
  doc,
  setDoc,
  writeBatch,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import {
  ref,
  set,
  push,
} from '@react-native-firebase/database';
import {
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from '@react-native-firebase/auth';
import { db, rtdb, authInstance, Collections, RealtimeDB } from './firebase';

// Auth credentials stored separately (pin = login code)
const USER_PINS: Record<string, string> = {
  admin_001: 'admin123',
  farmer_001: 'farmer123',
  farmer_002: 'farmer123',
  farmer_003: 'farmer123',
  farmer_004: 'farmer123',
  farmer_005: 'farmer123',
  tech_001: 'technician123',
  tech_002: 'technician123',
  tech_003: 'technician123',
  tech_004: 'technician123',
  tech_005: 'technician123',
};

const getUserPin = (userId: string): string => USER_PINS[userId] || 'default123';



// ═══════════════════════════════════════════════
// USERS — Shared auth/account data for all roles
// ═══════════════════════════════════════════════

const mockUsers = [
  { id: 'admin_001', email: 'admin@agricare.ph', password: 'admin123', displayName: 'Admin AgriCare', role: 'admin', phoneNumber: '+63 900 000 0001', status: 'active', photoURL: 'https://i.pravatar.cc/150?img=68' },
  { id: 'farmer_001', email: 'juan@agricare.ph', password: 'farmer123', displayName: 'Juan Dela Cruz', role: 'farmer', phoneNumber: '+63 912 345 6789', status: 'active', photoURL: 'https://i.pravatar.cc/150?img=12' },
  { id: 'farmer_002', email: 'maria@agricare.ph', password: 'farmer123', displayName: 'Maria Garcia', role: 'farmer', phoneNumber: '+63 913 456 7890', status: 'active', photoURL: 'https://i.pravatar.cc/150?img=25' },
  { id: 'farmer_003', email: 'jose@agricare.ph', password: 'farmer123', displayName: 'Jose Rivera', role: 'farmer', phoneNumber: '+63 914 567 8901', status: 'active', photoURL: 'https://i.pravatar.cc/150?img=33' },
  { id: 'farmer_004', email: 'lorna@agricare.ph', password: 'farmer123', displayName: 'Lorna Santos', role: 'farmer', phoneNumber: '+63 915 678 9012', status: 'active', photoURL: 'https://i.pravatar.cc/150?img=44' },
  { id: 'farmer_005', email: 'pedro.farmer@agricare.ph', password: 'farmer123', displayName: 'Pedro Reyes', role: 'farmer', phoneNumber: '+63 916 789 0123', status: 'inactive', photoURL: 'https://i.pravatar.cc/150?img=51' },
  { id: 'tech_001', email: 'pedro.santos@agricare.ph', password: 'technician123', displayName: 'Pedro Santos', role: 'technician', phoneNumber: '+63 917 111 2222', status: 'active', photoURL: 'https://i.pravatar.cc/150?img=59' },
  { id: 'tech_002', email: 'ana.reyes@agricare.ph', password: 'technician123', displayName: 'Ana Reyes', role: 'technician', phoneNumber: '+63 918 222 3333', status: 'active', photoURL: 'https://i.pravatar.cc/150?img=23' },
  { id: 'tech_003', email: 'mark.delacruz@agricare.ph', password: 'technician123', displayName: 'Mark Dela Cruz', role: 'technician', phoneNumber: '+63 919 333 4444', status: 'active', photoURL: 'https://i.pravatar.cc/150?img=53' },
  { id: 'tech_004', email: 'rosa.mendoza@agricare.ph', password: 'technician123', displayName: 'Rosa Mendoza', role: 'technician', phoneNumber: '+63 920 444 5555', status: 'pending', photoURL: 'https://i.pravatar.cc/150?img=38' },
  { id: 'tech_005', email: 'carlos.villanueva@agricare.ph', password: 'technician123', displayName: 'Carlos Villanueva', role: 'technician', phoneNumber: '+63 921 555 6666', status: 'pending', photoURL: 'https://i.pravatar.cc/150?img=60' },
];

// ═══════════════════════════════════════════════
// ADMIN — Admin-specific profile data (FK: userId)
// ═══════════════════════════════════════════════

const mockAdmins = [
  {
    id: 'admin_001',
    userId: 'admin_001',
    permissions: ['user_management', 'verify_technicians', 'manage_content', 'view_reports', 'manage_forum', 'manage_categories', 'view_appointments', 'manage_reviews', 'manage_announcements'],
    managedCategories: ['cattle', 'goat', 'chicken', 'pig', 'horse', 'duck', 'carabao'],
    dashboardAccess: true,
    superAdmin: true,
  },
];

// ═══════════════════════════════════════════════
// FARMER — Farmer-specific profile data (FK: userId)
// ═══════════════════════════════════════════════

const mockFarmers = [
  {
    id: 'farmer_001',
    userId: 'farmer_001',
    location: 'San Miguel, Bulacan',
    barangay: 'Brgy. Poblacion',
    latitude: 14.6042,
    longitude: 120.9822,
    totalAnimals: 12,
    favoriteTechnicians: ['tech_001', 'tech_002'],
    animals: ['animal_001', 'animal_002', 'animal_003', 'animal_004', 'animal_005'],
  },
  {
    id: 'farmer_002',
    userId: 'farmer_002',
    location: 'Angat, Bulacan',
    barangay: 'Brgy. San Roque',
    latitude: 14.6200,
    longitude: 121.0100,
    totalAnimals: 8,
    favoriteTechnicians: ['tech_003'],
    animals: ['animal_006', 'animal_007'],
  },
  {
    id: 'farmer_003',
    userId: 'farmer_003',
    location: 'Norzagaray, Bulacan',
    barangay: 'Brgy. Bigte',
    latitude: 14.6500,
    longitude: 121.0300,
    totalAnimals: 5,
    favoriteTechnicians: [],
    animals: ['animal_008'],
  },
  {
    id: 'farmer_004',
    userId: 'farmer_004',
    location: 'San Ildefonso, Bulacan',
    barangay: 'Brgy. Akle',
    latitude: 14.6150,
    longitude: 120.9500,
    totalAnimals: 20,
    favoriteTechnicians: ['tech_001'],
    animals: ['animal_009', 'animal_010'],
  },
  {
    id: 'farmer_005',
    userId: 'farmer_005',
    location: 'Dona Remedios Trinidad, Bulacan',
    barangay: 'Brgy. Pulong Sampaloc',
    latitude: 14.7000,
    longitude: 121.0800,
    totalAnimals: 3,
    favoriteTechnicians: [],
    animals: [],
  },
];

// ═══════════════════════════════════════════════
// TECHNICIAN — Technician-specific profile data (FK: userId)
// ═══════════════════════════════════════════════

const mockTechnicians = [
  {
    id: 'tech_001',
    userId: 'tech_001',
    name: 'Pedro Santos',
    rating: 4.8,
    reviewCount: 120,
    specializations: ['Large Animal', 'Vaccination', 'General Check-up'],
    experience: 8,
    serviceArea: 'San Miguel, San Ildefonso, Bulacan',
    latitude: 14.5995,
    longitude: 120.9842,
    available: true,
    verificationStatus: 'verified',
    verifiedAt: '2024-01-15',
    bio: 'Experienced livestock technician specializing in large animals. 8 years of field experience.',
    completedAppointments: 120,
    documents: [],
  },
  {
    id: 'tech_002',
    userId: 'tech_002',
    name: 'Ana Reyes',
    rating: 4.7,
    reviewCount: 98,
    specializations: ['Deworming', 'Artificial Insemination', 'Small Animal'],
    experience: 6,
    serviceArea: 'San Rafael, Bulacan',
    latitude: 14.6050,
    longitude: 120.9900,
    available: true,
    verificationStatus: 'verified',
    verifiedAt: '2024-03-22',
    bio: 'Specialist in AI and parasite management for livestock.',
    completedAppointments: 98,
    documents: [],
  },
  {
    id: 'tech_003',
    userId: 'tech_003',
    name: 'Mark Dela Cruz',
    rating: 4.6,
    reviewCount: 75,
    specializations: ['Treatment', 'Health Check', 'Nutrition'],
    experience: 5,
    serviceArea: 'Angat, Bulacan',
    latitude: 14.6100,
    longitude: 120.9950,
    available: true,
    verificationStatus: 'verified',
    verifiedAt: '2024-06-10',
    bio: 'Focused on livestock health management and nutritional consultation.',
    completedAppointments: 75,
    documents: [],
  },
  {
    id: 'tech_004',
    userId: 'tech_004',
    name: 'Rosa Mendoza',
    rating: 0,
    reviewCount: 0,
    specializations: ['Vaccination', 'Deworming'],
    experience: 3,
    serviceArea: 'Norzagaray, Bulacan',
    latitude: 14.6500,
    longitude: 121.0300,
    available: false,
    verificationStatus: 'pending',
    verifiedAt: null,
    bio: 'New applicant with 3 years experience in poultry and swine.',
    completedAppointments: 0,
    documents: ['certificate.pdf', 'license.pdf', 'id.jpg'],
  },
  {
    id: 'tech_005',
    userId: 'tech_005',
    name: 'Carlos Villanueva',
    rating: 0,
    reviewCount: 0,
    specializations: ['Large Animal', 'Emergency Care'],
    experience: 2,
    serviceArea: 'Bustos, Bulacan',
    latitude: 14.5800,
    longitude: 120.9700,
    available: false,
    verificationStatus: 'pending',
    verifiedAt: null,
    bio: 'Recently graduated, seeking verification for emergency livestock care.',
    completedAppointments: 0,
    documents: ['diploma.pdf', 'license.pdf'],
  },
];

// ═══════════════════════════════════════════════
// LIVESTOCK CATEGORIES (shared)
// ═══════════════════════════════════════════════

const mockLivestockCategories = [
  { id: 'cat_cow', name: 'Cow', type: 'large', breeds: ['Holstein Friesian', 'Brahman', 'Carabao Cross', 'Native'], icon: 'cow' },
  { id: 'cat_goat', name: 'Goat', type: 'small', breeds: ['Anglo-Nubian', 'Boer', 'Native', 'Saanen'], icon: 'goat' },
  { id: 'cat_chicken', name: 'Chicken', type: 'poultry', breeds: ['Rhode Island Red', 'Broiler', 'Native', 'Layer'], icon: 'hen' },
  { id: 'cat_pig', name: 'Pig', type: 'large', breeds: ['Large White', 'Landrace', 'Duroc', 'Native'], icon: 'pig' },
  { id: 'cat_horse', name: 'Horse', type: 'large', breeds: ['Philippine Native', 'Thoroughbred Cross'], icon: 'horse' },
  { id: 'cat_duck', name: 'Duck', type: 'poultry', breeds: ['Muscovy', 'Pekin', 'Native Itik'], icon: 'duck' },
  { id: 'cat_carabao', name: 'Carabao', type: 'large', breeds: ['Philippine Carabao', 'Murrah Cross'], icon: 'carabao' },
];

// ═══════════════════════════════════════════════
// ANIMALS (owned by farmers, FK: ownerId → farmer.userId)
// ═══════════════════════════════════════════════

const mockAnimals = [
  { id: 'animal_001', name: 'Manny', type: 'cow', breed: 'Holstein Friesian', age: 4, weight: '450kg', healthStatus: 'healthy', ownerId: 'farmer_001', gender: 'male', imageUrl: '', vaccinationUpToDate: true, lastCheckup: '2026-06-15' },
  { id: 'animal_002', name: 'Brownie', type: 'chicken', breed: 'Rhode Island Red', age: 1, weight: '2.5kg', healthStatus: 'healthy', ownerId: 'farmer_001', gender: 'female', imageUrl: '', vaccinationUpToDate: true, lastCheckup: '2026-07-01' },
  { id: 'animal_003', name: 'Kiko', type: 'goat', breed: 'Anglo-Nubian', age: 2, weight: '35kg', healthStatus: 'under_treatment', ownerId: 'farmer_001', gender: 'male', imageUrl: '', vaccinationUpToDate: false, lastCheckup: '2026-07-20' },
  { id: 'animal_004', name: 'Babe', type: 'pig', breed: 'Large White', age: 1, weight: '80kg', healthStatus: 'healthy', ownerId: 'farmer_001', gender: 'female', imageUrl: '', vaccinationUpToDate: true, lastCheckup: '2026-05-10' },
  { id: 'animal_005', name: 'Kalabaw', type: 'carabao', breed: 'Philippine Carabao', age: 6, weight: '550kg', healthStatus: 'healthy', ownerId: 'farmer_001', gender: 'male', imageUrl: '', vaccinationUpToDate: true, lastCheckup: '2026-04-20' },
  { id: 'animal_006', name: 'Daisy', type: 'cow', breed: 'Brahman', age: 3, weight: '380kg', healthStatus: 'healthy', ownerId: 'farmer_002', gender: 'female', imageUrl: '', vaccinationUpToDate: true, lastCheckup: '2026-07-05' },
  { id: 'animal_007', name: 'Whitey', type: 'goat', breed: 'Saanen', age: 1, weight: '25kg', healthStatus: 'sick', ownerId: 'farmer_002', gender: 'female', imageUrl: '', vaccinationUpToDate: false, lastCheckup: '2026-07-25' },
  { id: 'animal_008', name: 'Blackie', type: 'pig', breed: 'Duroc', age: 2, weight: '100kg', healthStatus: 'healthy', ownerId: 'farmer_003', gender: 'male', imageUrl: '', vaccinationUpToDate: true, lastCheckup: '2026-06-01' },
  { id: 'animal_009', name: 'Tandang', type: 'chicken', breed: 'Native', age: 2, weight: '3kg', healthStatus: 'healthy', ownerId: 'farmer_004', gender: 'male', imageUrl: '', vaccinationUpToDate: true, lastCheckup: '2026-07-10' },
  { id: 'animal_010', name: 'Kabayo', type: 'horse', breed: 'Philippine Native', age: 5, weight: '400kg', healthStatus: 'healthy', ownerId: 'farmer_004', gender: 'male', imageUrl: '', vaccinationUpToDate: true, lastCheckup: '2026-06-20' },
];

// ═══════════════════════════════════════════════
// APPOINTMENTS (FK: farmerId, technicianId → users.id)
// ═══════════════════════════════════════════════

const mockAppointments = [
  { id: 'appt_001', serviceType: 'Health Check', animalId: 'animal_001', animalName: 'Manny (Cow)', farmerId: 'farmer_001', farmerName: 'Juan Dela Cruz', technicianId: 'tech_001', technicianName: 'Pedro Santos', date: '2026-08-05', time: '09:00 AM', status: 'upcoming', description: 'Regular quarterly check-up', location: 'San Miguel, Bulacan' },
  { id: 'appt_002', serviceType: 'Vaccination', animalId: 'animal_002', animalName: 'Brownie (Chicken)', farmerId: 'farmer_001', farmerName: 'Juan Dela Cruz', technicianId: 'tech_002', technicianName: 'Ana Reyes', date: '2026-08-07', time: '10:00 AM', status: 'upcoming', description: 'Newcastle disease vaccine', location: 'San Miguel, Bulacan' },
  { id: 'appt_003', serviceType: 'De-worming', animalId: 'animal_003', animalName: 'Kiko (Goat)', farmerId: 'farmer_001', farmerName: 'Juan Dela Cruz', technicianId: 'tech_003', technicianName: 'Mark Dela Cruz', date: '2026-08-10', time: '01:00 PM', status: 'pending', description: 'De-worming treatment needed', location: 'San Miguel, Bulacan' },
  { id: 'appt_004', serviceType: 'Health Check', animalId: 'animal_006', animalName: 'Daisy (Cow)', farmerId: 'farmer_002', farmerName: 'Maria Garcia', technicianId: 'tech_001', technicianName: 'Pedro Santos', date: '2026-08-04', time: '02:00 PM', status: 'upcoming', description: 'Pregnancy check', location: 'Angat, Bulacan' },
  { id: 'appt_005', serviceType: 'Treatment', animalId: 'animal_007', animalName: 'Whitey (Goat)', farmerId: 'farmer_002', farmerName: 'Maria Garcia', technicianId: 'tech_003', technicianName: 'Mark Dela Cruz', date: '2026-08-03', time: '09:00 AM', status: 'upcoming', description: 'Treating respiratory infection', location: 'Angat, Bulacan' },
  { id: 'appt_006', serviceType: 'Vaccination', animalId: 'animal_008', animalName: 'Blackie (Pig)', farmerId: 'farmer_003', farmerName: 'Jose Rivera', technicianId: 'tech_002', technicianName: 'Ana Reyes', date: '2026-07-28', time: '11:00 AM', status: 'completed', description: 'Hog cholera vaccine', location: 'Norzagaray, Bulacan' },
  { id: 'appt_007', serviceType: 'Artificial Insemination', animalId: 'animal_001', animalName: 'Manny (Cow)', farmerId: 'farmer_001', farmerName: 'Juan Dela Cruz', technicianId: 'tech_002', technicianName: 'Ana Reyes', date: '2026-07-20', time: '08:00 AM', status: 'completed', description: 'AI procedure for breeding', location: 'San Miguel, Bulacan' },
  { id: 'appt_008', serviceType: 'Health Check', animalId: 'animal_010', animalName: 'Kabayo (Horse)', farmerId: 'farmer_004', farmerName: 'Lorna Santos', technicianId: 'tech_001', technicianName: 'Pedro Santos', date: '2026-07-15', time: '03:00 PM', status: 'completed', description: 'Annual health assessment', location: 'San Ildefonso, Bulacan' },
  { id: 'appt_009', serviceType: 'De-worming', animalId: 'animal_004', animalName: 'Babe (Pig)', farmerId: 'farmer_001', farmerName: 'Juan Dela Cruz', technicianId: 'tech_003', technicianName: 'Mark Dela Cruz', date: '2026-07-10', time: '10:00 AM', status: 'cancelled', description: 'Cancelled - animal recovered', location: 'San Miguel, Bulacan' },
  { id: 'appt_010', serviceType: 'Health Check', animalId: 'animal_002', animalName: 'Brownie (Chicken)', farmerId: 'farmer_001', farmerName: 'Juan Dela Cruz', technicianId: '', technicianName: 'Unassigned', date: '2026-08-08', time: '09:00 AM', status: 'pending', description: 'Annual health check needed', location: 'San Miguel, Bulacan' },
  { id: 'appt_011', serviceType: 'Vaccination', animalId: 'animal_006', animalName: 'Daisy (Cow)', farmerId: 'farmer_002', farmerName: 'Maria Garcia', technicianId: '', technicianName: 'Unassigned', date: '2026-08-09', time: '10:00 AM', status: 'pending', description: 'FMD vaccination due', location: 'Angat, Bulacan' },
  { id: 'appt_012', serviceType: 'Treatment', animalId: 'animal_008', animalName: 'Blackie (Pig)', farmerId: 'farmer_003', farmerName: 'Jose Rivera', technicianId: '', technicianName: 'Unassigned', date: '2026-08-06', time: '02:00 PM', status: 'pending', description: 'Skin rashes observed, needs treatment', location: 'Norzagaray, Bulacan' },
  { id: 'appt_013', serviceType: 'De-worming', animalId: 'animal_003', animalName: 'Kiko (Goat)', farmerId: 'farmer_001', farmerName: 'Juan Dela Cruz', technicianId: '', technicianName: 'Unassigned', date: '2026-07-28', time: '08:00 AM', status: 'pending', description: 'Routine deworming - matagal na pending', location: 'San Miguel, Bulacan' },
  { id: 'appt_014', serviceType: 'Health Check', animalId: 'animal_010', animalName: 'Kabayo (Horse)', farmerId: 'farmer_004', farmerName: 'Lorna Santos', technicianId: '', technicianName: 'Unassigned', date: '2026-07-20', time: '03:00 PM', status: 'pending', description: 'Horse limping, needs checkup - unattended request', location: 'San Ildefonso, Bulacan' },
];

// ═══════════════════════════════════════════════
// CONSULTATIONS (FK: farmerId, technicianId → users.id)
// ═══════════════════════════════════════════════

const mockConsultations = [
  { id: 'consult_001', farmerId: 'farmer_001', farmerName: 'Juan Dela Cruz', technicianId: 'tech_001', technicianName: 'Pedro Santos', animalId: 'animal_003', subject: 'Kiko not eating properly', status: 'active', notes: 'Goat showing signs of parasitic infection. Recommended deworming.', createdAt: '2026-07-25' },
  { id: 'consult_002', farmerId: 'farmer_002', farmerName: 'Maria Garcia', technicianId: 'tech_003', technicianName: 'Mark Dela Cruz', animalId: 'animal_007', subject: 'Whitey has difficulty breathing', status: 'active', notes: 'Respiratory infection detected. Prescribed antibiotics.', createdAt: '2026-07-30' },
  { id: 'consult_003', farmerId: 'farmer_004', farmerName: 'Lorna Santos', technicianId: 'tech_001', technicianName: 'Pedro Santos', animalId: 'animal_010', subject: 'Kabayo limping on left leg', status: 'resolved', notes: 'Minor sprain. Rest and anti-inflammatory applied.', createdAt: '2026-07-12', resolvedAt: '2026-07-18' },
];

// ═══════════════════════════════════════════════
// EMERGENCY REQUESTS (FK: farmerId, respondedBy → users.id)
// ═══════════════════════════════════════════════

const mockEmergencyRequests = [
  { id: 'emerg_001', farmerId: 'farmer_001', farmerName: 'Juan Dela Cruz', animalId: 'animal_003', description: 'Goat collapsed, not moving, breathing heavily', location: 'San Miguel, Bulacan', latitude: 14.6042, longitude: 120.9822, status: 'responded', respondedBy: 'tech_001', respondedAt: '2026-07-25T08:30:00', createdAt: '2026-07-25T08:15:00' },
  { id: 'emerg_002', farmerId: 'farmer_002', farmerName: 'Maria Garcia', animalId: 'animal_007', description: 'Goat bleeding from mouth', location: 'Angat, Bulacan', latitude: 14.6200, longitude: 121.0100, status: 'resolved', respondedBy: 'tech_003', respondedAt: '2026-07-30T14:00:00', createdAt: '2026-07-30T13:45:00' },
];

// ═══════════════════════════════════════════════
// KNOWLEDGE BASE (FK: authorId → users.id)
// ═══════════════════════════════════════════════

const mockKnowledgeBase = [
  { id: 'kb_001', title: 'Pag-aalaga ng Baka: Basic Guide', category: 'Cattle Care', content: 'Ang tamang pag-aalaga ng baka ay nagsisimula sa tamang nutrisyon...', authorId: 'admin_001', authorName: 'Admin AgriCare', authorRole: 'admin', tags: ['cattle', 'nutrition', 'beginner'], views: 234 },
  { id: 'kb_002', title: 'Vaccination Schedule para sa Manok', category: 'Poultry', content: 'Ang vaccination ng manok ay dapat sundin ayon sa age...', authorId: 'tech_001', authorName: 'Pedro Santos', authorRole: 'technician', tags: ['poultry', 'vaccination', 'schedule'], views: 567 },
  { id: 'kb_003', title: 'Paano Malaman kung May Sakit ang Kambing', category: 'Goat Health', content: 'May mga signs na dapat bantayan tulad ng pagbaba ng appetite...', authorId: 'tech_003', authorName: 'Mark Dela Cruz', authorRole: 'technician', tags: ['goat', 'health', 'symptoms'], views: 189 },
  { id: 'kb_004', title: 'De-worming Guide para sa Livestock', category: 'Parasite Control', content: 'Ang deworming ay dapat gawin every 3-6 months depende sa environment...', authorId: 'tech_002', authorName: 'Ana Reyes', authorRole: 'technician', tags: ['deworming', 'parasite', 'all-animals'], views: 412 },
  { id: 'kb_005', title: 'Emergency First Aid para sa Livestock', category: 'Emergency', content: 'Kapag may emergency, ang unang gagawin ay i-assess ang vital signs...', authorId: 'admin_001', authorName: 'Admin AgriCare', authorRole: 'admin', tags: ['emergency', 'first-aid', 'critical'], views: 789 },
  { id: 'kb_006', title: 'Artificial Insemination: Proseso at Benefits', category: 'Breeding', content: 'Ang AI ay isang modernong paraan ng pagpapalahi ng livestock...', authorId: 'tech_002', authorName: 'Ana Reyes', authorRole: 'technician', tags: ['AI', 'breeding', 'cattle'], views: 156 },
];

// ═══════════════════════════════════════════════
// COMMUNITY FORUM (FK: authorId → users.id)
// ═══════════════════════════════════════════════

const mockForumPosts = [
  { id: 'forum_001', authorId: 'farmer_001', authorName: 'Juan Dela Cruz', authorRole: 'farmer', title: 'Paano malalaman kung buntis ang baka?', content: 'Mga tips po sana para malaman kung buntis na ang baka ko...', category: 'Cattle', likes: 12, replies: 5, views: 89, status: 'active' },
  { id: 'forum_002', authorId: 'tech_001', authorName: 'Pedro Santos', authorRole: 'technician', title: 'Tamang Feed Formulation para sa Baboy', content: 'Sharing ko lang ang formula na ginagamit ko para sa growing pigs...', category: 'Swine', likes: 25, replies: 8, views: 156, status: 'active' },
  { id: 'forum_003', authorId: 'farmer_002', authorName: 'Maria Garcia', authorRole: 'farmer', title: 'May alam ba kayong magaling na tech sa Angat?', content: 'Need ko po ng technician na available this week para sa goat ko...', category: 'General', likes: 3, replies: 4, views: 45, status: 'active' },
  { id: 'forum_004', authorId: 'tech_003', authorName: 'Mark Dela Cruz', authorRole: 'technician', title: 'Common Signs ng Dehydration sa Livestock', content: 'Ito ang mga dapat bantayan lalo na sa summer season...', category: 'Health Tips', likes: 34, replies: 12, views: 234, status: 'active' },
  { id: 'forum_005', authorId: 'farmer_004', authorName: 'Lorna Santos', authorRole: 'farmer', title: 'Best breed ng manok for egg production?', content: 'Planning to expand yung poultry ko. Any recommendations?', category: 'Poultry', likes: 8, replies: 6, views: 67, status: 'active' },
];

// ═══════════════════════════════════════════════
// REVIEWS (FK: farmerId, technicianId → users.id)
// ═══════════════════════════════════════════════

const mockReviews = [
  { id: 'review_001', technicianId: 'tech_001', technicianName: 'Pedro Santos', farmerId: 'farmer_001', farmerName: 'Juan Dela Cruz', rating: 5, comment: 'Very professional and knowledgeable. Manny is healthy now!', appointmentId: 'appt_008' },
  { id: 'review_002', technicianId: 'tech_001', technicianName: 'Pedro Santos', farmerId: 'farmer_004', farmerName: 'Lorna Santos', rating: 5, comment: 'Excellent service. Always on time and very thorough.', appointmentId: 'appt_008' },
  { id: 'review_003', technicianId: 'tech_002', technicianName: 'Ana Reyes', farmerId: 'farmer_001', farmerName: 'Juan Dela Cruz', rating: 4, comment: 'Good AI procedure. Sana lang mas mabilis next time.', appointmentId: 'appt_007' },
  { id: 'review_004', technicianId: 'tech_002', technicianName: 'Ana Reyes', farmerId: 'farmer_003', farmerName: 'Jose Rivera', rating: 5, comment: 'Napakagaling! Vaccine administered quickly and safely.', appointmentId: 'appt_006' },
  { id: 'review_005', technicianId: 'tech_003', technicianName: 'Mark Dela Cruz', farmerId: 'farmer_002', farmerName: 'Maria Garcia', rating: 4, comment: 'Helpful advice on nutrition. Animal recovering well.', appointmentId: 'appt_005' },
];

// ═══════════════════════════════════════════════
// REPORTS (FK: reporterId, targetId → users.id)
// ═══════════════════════════════════════════════

const mockReports = [
  { id: 'report_001', reporterId: 'farmer_001', reporterName: 'Juan Dela Cruz', reporterRole: 'farmer', targetId: 'tech_003', targetName: 'Mark Dela Cruz', type: 'late_arrival', description: 'Technician arrived 1 hour late for the appointment.', status: 'pending' },
  { id: 'report_002', reporterId: 'farmer_002', reporterName: 'Maria Garcia', reporterRole: 'farmer', targetId: null, targetName: null, type: 'app_bug', description: 'Cannot upload photo of my goat. App crashes.', status: 'resolved', resolvedAt: '2026-07-19' },
];

// ═══════════════════════════════════════════════
// NOTIFICATIONS (FK: userId → users.id)
// ═══════════════════════════════════════════════

const mockNotifications = [
  { id: 'notif_001', userId: 'farmer_001', type: 'appointment_confirmed', title: 'Appointment Confirmed', body: 'Your health check with Pedro Santos is confirmed for Aug 5.', read: false },
  { id: 'notif_002', userId: 'farmer_001', type: 'vaccination_reminder', title: 'Vaccination Reminder', body: "Brownie's vaccination is due on Aug 7.", read: false },
  { id: 'notif_003', userId: 'farmer_001', type: 'message', title: 'New Message', body: 'Pedro Santos sent you a message.', read: true },
  { id: 'notif_004', userId: 'tech_001', type: 'new_appointment', title: 'New Appointment Request', body: 'Juan Dela Cruz booked a Health Check on Aug 5.', read: false },
  { id: 'notif_005', userId: 'tech_001', type: 'emergency', title: 'Emergency Request!', body: 'Juan Dela Cruz needs immediate help. Goat collapsed.', read: true },
  { id: 'notif_006', userId: 'admin_001', type: 'verification_request', title: 'New Verification Request', body: 'Rosa Mendoza submitted verification documents.', read: false },
];

// ═══════════════════════════════════════════════
// ANNOUNCEMENTS (FK: createdBy → users.id)
// ═══════════════════════════════════════════════

const mockAnnouncements = [
  { id: 'ann_001', title: 'AgriCare App Launch!', content: 'Welcome sa AgriCare! Ang app para sa livestock support at service management.', audience: 'all', priority: 'high', createdBy: 'admin_001' },
  { id: 'ann_002', title: 'Free Vaccination Drive — August 2026', content: 'Libreng vaccination para sa lahat ng registered farmers sa Bulacan this August.', audience: 'farmers', priority: 'high', createdBy: 'admin_001' },
  { id: 'ann_003', title: 'System Maintenance — Aug 8', content: 'App maintenance on Aug 8, 2AM-4AM. Chat services temporarily unavailable.', audience: 'all', priority: 'medium', createdBy: 'admin_001' },
];

// ═══════════════════════════════════════════════
// CHAT — Realtime Database
// ═══════════════════════════════════════════════

const mockChats = {
  'farmer_001_tech_001': {
    participants: ['farmer_001', 'tech_001'],
    participantNames: { farmer_001: 'Juan Dela Cruz', tech_001: 'Pedro Santos' },
    lastMessage: "See you on Aug 5 for Manny's check-up.",
    lastMessageTime: Date.now() - 3600000,
    lastSenderId: 'tech_001',
    unreadCount: { farmer_001: 1, tech_001: 0 },
  },
  'farmer_001_tech_002': {
    participants: ['farmer_001', 'tech_002'],
    participantNames: { farmer_001: 'Juan Dela Cruz', tech_002: 'Ana Reyes' },
    lastMessage: "Don't forget the vaccination on Aug 7.",
    lastMessageTime: Date.now() - 86400000,
    lastSenderId: 'tech_002',
    unreadCount: { farmer_001: 1, tech_002: 0 },
  },
  'farmer_001_tech_003': {
    participants: ['farmer_001', 'tech_003'],
    participantNames: { farmer_001: 'Juan Dela Cruz', tech_003: 'Mark Dela Cruz' },
    lastMessage: 'Please prepare Kiko before my visit.',
    lastMessageTime: Date.now() - 172800000,
    lastSenderId: 'tech_003',
    unreadCount: { farmer_001: 0, tech_003: 0 },
  },
  'farmer_002_tech_003': {
    participants: ['farmer_002', 'tech_003'],
    participantNames: { farmer_002: 'Maria Garcia', tech_003: 'Mark Dela Cruz' },
    lastMessage: 'How is Whitey doing today?',
    lastMessageTime: Date.now() - 43200000,
    lastSenderId: 'tech_003',
    unreadCount: { farmer_002: 1, tech_003: 0 },
  },
};

const mockMessages = {
  'farmer_001_tech_001': [
    { senderId: 'farmer_001', text: 'Hi Doc, confirmed ba ang Aug 5?', timestamp: Date.now() - 7200000, read: true },
    { senderId: 'tech_001', text: "Yes confirmed! I'll be there at 9 AM.", timestamp: Date.now() - 5400000, read: true },
    { senderId: 'tech_001', text: "See you on Aug 5 for Manny's check-up.", timestamp: Date.now() - 3600000, read: false },
  ],
  'farmer_001_tech_002': [
    { senderId: 'farmer_001', text: 'Kelan po yung vaccination ni Brownie?', timestamp: Date.now() - 172800000, read: true },
    { senderId: 'tech_002', text: 'Aug 7 at 10 AM. I have the vaccines ready.', timestamp: Date.now() - 90000000, read: true },
    { senderId: 'tech_002', text: "Don't forget the vaccination on Aug 7.", timestamp: Date.now() - 86400000, read: false },
  ],
  'farmer_001_tech_003': [
    { senderId: 'farmer_001', text: 'Kiko needs deworming, available ka ba next week?', timestamp: Date.now() - 259200000, read: true },
    { senderId: 'tech_003', text: 'Aug 10 works for me. 1 PM okay?', timestamp: Date.now() - 216000000, read: true },
    { senderId: 'farmer_001', text: 'Perfect, see you then!', timestamp: Date.now() - 180000000, read: true },
    { senderId: 'tech_003', text: 'Please prepare Kiko before my visit.', timestamp: Date.now() - 172800000, read: true },
  ],
  'farmer_002_tech_003': [
    { senderId: 'farmer_002', text: 'Doc, Whitey is still coughing. Normal pa ba?', timestamp: Date.now() - 86400000, read: true },
    { senderId: 'tech_003', text: 'Give it 2-3 more days. If no improvement, bring her to me.', timestamp: Date.now() - 72000000, read: true },
    { senderId: 'tech_003', text: 'How is Whitey doing today?', timestamp: Date.now() - 43200000, read: false },
  ],
};

// ═══════════════════════════════════════════════
// HELPER: Seed a collection
// ═══════════════════════════════════════════════

const seedCollection = async (collectionName: string, data: any[]) => {
  try {
    const batch = writeBatch(db);
    data.forEach((item) => {
      const docRef = doc(db, collectionName, item.id);
      batch.set(docRef, { ...item, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    });
    await batch.commit();
    console.log(`✅ ${collectionName} seeded (${data.length} docs)`);
  } catch (error: any) {
    console.error(`❌ Failed to seed ${collectionName}: ${error.message}`);
    throw error;
  }
};

// ═══════════════════════════════════════════════
// DELETE ALL
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
// SEED USERS (Firestore first, then Auth accounts)
// ═══════════════════════════════════════════════

export const seedUsers = async () => {
  // Step 1: Save all users to Firestore (always works)
  const batch = writeBatch(db);
  mockUsers.forEach((user) => {
    const userData = { ...user };
    const userRef = doc(db, Collections.USERS, user.id);
    batch.set(userRef, { ...userData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
  await batch.commit();
  console.log(`✅ users seeded (${mockUsers.length} docs)`);

  // Step 2: Try to create Firebase Auth accounts
  for (const user of mockUsers) {
    try {
      const { user: authUser } = await createUserWithEmailAndPassword(authInstance, user.email, getUserPin(user.id));
      await updateProfile(authUser, { displayName: user.displayName });
      console.log(`✅ Auth: ${user.email}`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⏭️ Auth exists: ${user.email}`);
      } else {
        console.warn(`⚠️ Auth skip: ${user.email} — ${error.message}`);
      }
    }
    try { await signOut(authInstance); } catch (e) {}
  }
  console.log('✅ Auth accounts processed');
};

// ═══════════════════════════════════════════════
// SEED ROLE-SPECIFIC COLLECTIONS
// ═══════════════════════════════════════════════

export const seedAdmins = () => seedCollection(Collections.ADMIN, mockAdmins);
export const seedFarmers = () => seedCollection(Collections.FARMER, mockFarmers);
export const seedTechnicians = () => seedCollection(Collections.TECHNICIAN, mockTechnicians);
export const seedAnimals = () => seedCollection('animals', mockAnimals);
export const seedLivestockCategories = () => seedCollection(Collections.LIVESTOCK_CATEGORIES, mockLivestockCategories);
export const seedAppointments = () => seedCollection(Collections.APPOINTMENTS, mockAppointments);
export const seedConsultations = () => seedCollection(Collections.CONSULTATIONS, mockConsultations);
export const seedEmergencyRequests = () => seedCollection(Collections.EMERGENCY_REQUESTS, mockEmergencyRequests);
export const seedKnowledgeBase = () => seedCollection(Collections.KNOWLEDGE_BASE, mockKnowledgeBase);
export const seedForumPosts = () => seedCollection(Collections.COMMUNITY_FORUM, mockForumPosts);
export const seedReviews = () => seedCollection(Collections.REVIEWS, mockReviews);
export const seedReports = () => seedCollection(Collections.REPORTS, mockReports);
export const seedNotifications = () => seedCollection(Collections.NOTIFICATIONS, mockNotifications);
