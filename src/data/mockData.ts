import { Technician, Appointment, Message, Notification, FarmOverview, ServiceType } from '@/types';

export const farmOverview: FarmOverview = {
  totalAnimals: 12,
  pendingServices: 3,
  upcomingVisits: 2,
  healthAlerts: 5,
};

export const serviceTypes: ServiceType[] = [
  { id: '1', name: 'Health Check', icon: 'medical-bag' },
  { id: '2', name: 'Vaccination', icon: 'needle' },
  { id: '3', name: 'Treatment', icon: 'pill' },
  { id: '4', name: 'De-worming', icon: 'bug' },
  { id: '5', name: 'Artificial\nInsemination', icon: 'dna' },
  { id: '6', name: 'Others', icon: 'dots-horizontal' },
];

export const technicians: Technician[] = [
  {
    id: '1',
    name: 'Pedro Santos',
    avatar: 'PS',
    rating: 4.8,
    reviewCount: 120,
    specializations: ['Large Animal', 'Vaccination', 'General Check-up'],
    distance: '1.2 km',
    experience: 8,
    serviceArea: 'San Miguel, San Ildefonso, Bulacan',
    latitude: 14.5995,
    longitude: 120.9842,
  },
  {
    id: '2',
    name: 'Ana Reyes',
    avatar: 'AR',
    rating: 4.7,
    reviewCount: 98,
    specializations: ['Deworming', 'Artificial Insemination'],
    distance: '2.4 km',
    experience: 6,
    serviceArea: 'San Rafael, Bulacan',
    latitude: 14.6050,
    longitude: 120.9900,
  },
  {
    id: '3',
    name: 'Mark Dela Cruz',
    avatar: 'MD',
    rating: 4.6,
    reviewCount: 75,
    specializations: ['Treatment', 'Health Check', 'Nutrition'],
    distance: '3.6 km',
    experience: 5,
    serviceArea: 'Angat, Bulacan',
    latitude: 14.6100,
    longitude: 120.9950,
  },
];

export const appointments: Appointment[] = [
  {
    id: '1',
    serviceType: 'Health Check',
    animalName: 'Manny (Cow)',
    animalType: 'cow',
    date: 'May 28, 2025',
    time: '09:00 AM',
    technician: 'Pedro Santos',
    status: 'upcoming',
  },
  {
    id: '2',
    serviceType: 'Vaccination',
    animalName: 'Brownie (Chicken)',
    animalType: 'chicken',
    date: 'May 30, 2025',
    time: '10:00 AM',
    technician: 'Ana Reyes',
    status: 'upcoming',
  },
  {
    id: '3',
    serviceType: 'De-worming',
    animalName: 'Kiko (Goat)',
    animalType: 'goat',
    date: 'June 2, 2025',
    time: '01:00 PM',
    technician: 'Mark Dela Cruz',
    status: 'pending',
  },
];

export const messages: Message[] = [
  {
    id: '1',
    senderName: 'Pedro Santos',
    senderAvatar: 'PS',
    lastMessage: "See you on May 28 for Manny's check-up.",
    time: '9:30 AM',
    unreadCount: 1,
  },
  {
    id: '2',
    senderName: 'Ana Reyes',
    senderAvatar: 'AR',
    lastMessage: "Don't forget the vaccination schedule.",
    time: 'Yesterday',
    unreadCount: 1,
  },
  {
    id: '3',
    senderName: 'Mark Dela Cruz',
    senderAvatar: 'MD',
    lastMessage: 'Please prepare the animal before my visit.',
    time: 'May 24',
    unreadCount: 0,
  },
  {
    id: '4',
    senderName: 'System',
    senderAvatar: 'SY',
    lastMessage: 'Your service request has been received.',
    time: 'May 23',
    unreadCount: 0,
  },
];

export const notifications: Notification[] = [
  {
    id: '1',
    title: 'Appointment Confirmed',
    message: 'Your health check appointment with Pedro Santos is confirmed.',
    time: '2 hours ago',
    read: false,
  },
  {
    id: '2',
    title: 'Vaccination Reminder',
    message: 'Brownie vaccination is due in 2 days.',
    time: '5 hours ago',
    read: false,
  },
  {
    id: '3',
    title: 'Service Complete',
    message: 'De-worming for Kiko has been completed.',
    time: '1 day ago',
    read: true,
  },
];
