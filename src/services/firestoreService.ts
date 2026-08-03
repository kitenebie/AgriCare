/**
 * Firestore Service — Database CRUD operations (Modular API)
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  addDoc,
} from '@react-native-firebase/firestore';
import { db, Collections } from './firebase';

// ─── USERS ───

export const createUser = async (uid: string, data: any) => {
  const userRef = doc(db, Collections.USERS, uid);
  await setDoc(userRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getUser = async (uid: string) => {
  const userRef = doc(db, Collections.USERS, uid);
  const snapshot = await getDoc(userRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

export const updateUser = async (uid: string, data: any) => {
  const userRef = doc(db, Collections.USERS, uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// ─── ANIMALS ───

export const addAnimal = async (userId: string, data: any) => {
  const colRef = collection(db, Collections.ANIMALS);
  const docRef = await addDoc(colRef, {
    ...data,
    ownerId: userId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getUserAnimals = async (userId: string) => {
  const colRef = collection(db, Collections.ANIMALS);
  const q = query(colRef, where('ownerId', '==', userId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const updateAnimal = async (animalId: string, data: any) => {
  const animalRef = doc(db, Collections.ANIMALS, animalId);
  await updateDoc(animalRef, data);
};

export const deleteAnimal = async (animalId: string) => {
  const animalRef = doc(db, Collections.ANIMALS, animalId);
  await deleteDoc(animalRef);
};

// ─── TECHNICIANS ───

export const getTechnicians = async () => {
  const colRef = collection(db, Collections.TECHNICIANS);
  const q = query(colRef, orderBy('rating', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getNearbyTechnicians = async (latitude: number, longitude: number, radiusKm: number) => {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(latitude * (Math.PI / 180)));

  const colRef = collection(db, Collections.TECHNICIANS);
  const q = query(colRef, where('latitude', '>=', latitude - latDelta), where('latitude', '<=', latitude + latDelta));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((tech: any) => tech.longitude >= longitude - lngDelta && tech.longitude <= longitude + lngDelta);
};

export const getTechnicianById = async (techId: string) => {
  const techRef = doc(db, Collections.TECHNICIANS, techId);
  const snapshot = await getDoc(techRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

// ─── APPOINTMENTS ───

export const createAppointment = async (data: any) => {
  const colRef = collection(db, Collections.APPOINTMENTS);
  const docRef = await addDoc(colRef, {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getUserAppointments = async (userId: string) => {
  const colRef = collection(db, Collections.APPOINTMENTS);
  const q = query(colRef, where('farmerId', '==', userId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const updateAppointmentStatus = async (appointmentId: string, status: string) => {
  const apptRef = doc(db, Collections.APPOINTMENTS, appointmentId);
  await updateDoc(apptRef, { status, updatedAt: serverTimestamp() });
};

// ─── SERVICES / REQUESTS ───

export const createServiceRequest = async (data: any) => {
  const colRef = collection(db, Collections.SERVICES);
  const docRef = await addDoc(colRef, {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getUserServiceRequests = async (userId: string) => {
  const colRef = collection(db, Collections.SERVICES);
  const q = query(colRef, where('farmerId', '==', userId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ─── REVIEWS ───

export const addReview = async (techId: string, data: any) => {
  const colRef = collection(db, Collections.REVIEWS);
  await addDoc(colRef, {
    ...data,
    technicianId: techId,
    createdAt: serverTimestamp(),
  });

  // Update technician average rating
  const reviewsQuery = query(colRef, where('technicianId', '==', techId));
  const reviews = await getDocs(reviewsQuery);

  const totalRating = reviews.docs.reduce((sum, d) => sum + (d.data().rating || 0), 0);
  const avgRating = totalRating / reviews.docs.length;

  const techRef = doc(db, Collections.TECHNICIANS, techId);
  await updateDoc(techRef, {
    rating: Math.round(avgRating * 10) / 10,
    reviewCount: reviews.docs.length,
  });
};
