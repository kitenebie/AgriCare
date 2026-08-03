export interface Animal {
  id: string;
  name: string;
  type: 'cow' | 'goat' | 'chicken' | 'pig' | 'horse';
  breed: string;
  age: number;
  healthStatus: 'healthy' | 'sick' | 'under_treatment';
  imageUrl?: string;
}

export interface Technician {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  specializations: string[];
  distance: string;
  experience: number;
  serviceArea: string;
  latitude: number;
  longitude: number;
}

export interface Appointment {
  id: string;
  serviceType: string;
  animalName: string;
  animalType: string;
  date: string;
  time: string;
  technician: string;
  status: 'upcoming' | 'pending' | 'completed' | 'cancelled';
}

export interface Message {
  id: string;
  senderName: string;
  senderAvatar: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface ServiceType {
  id: string;
  name: string;
  icon: string;
}

export interface FarmOverview {
  totalAnimals: number;
  pendingServices: number;
  upcomingVisits: number;
  healthAlerts: number;
}
