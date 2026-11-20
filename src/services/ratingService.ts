/**
 * Rating Service — handles rate requests and rating submissions
 * with FCM notifications and chat messages
 */

import firestore from '@react-native-firebase/firestore';
import { Collections } from './firebase';
import { getOrCreateChatRoom, sendMessage } from './chatService';
import { callBackend } from './backendApi';

/**
 * Check if technician has a completed/confirmed appointment with this farmer
 * Returns the appointment data (with animal info) or null
 */
export const getCompletedAppointment = async (technicianId: string, farmerId: string) => {
  // Single-field query to avoid composite index requirement
  const snapshot = await firestore()
    .collection(Collections.APPOINTMENTS)
    .where('technicianId', '==', technicianId)
    .get();

  // Filter remaining conditions client-side
  const matches = snapshot.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter((a: any) => a.farmerId === farmerId && a.status === 'confirmed')
    .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));

  return matches.length > 0 ? matches[0] : null;
};

/**
 * Send a rate request from technician to farmer
 * 1. Checks if there's a valid appointment
 * 2. Sends a special chat message (type: rate_request)
 * 3. Creates notification for farmer
 * 4. Triggers FCM push to farmer
 */
export const sendRateRequest = async (params: {
  technicianId: string;
  technicianName: string;
  farmerId: string;
  farmerName: string;
  chatId: string;
  animalName?: string;
  animalPhoto?: string;
  serviceType?: string;
}) => {
  const { technicianId, technicianName, farmerId, farmerName, chatId, animalName, animalPhoto, serviceType } = params;

  // 1. Send special message (rate_request type)
  const serviceInfo = animalName ? ` for ${animalName}${serviceType ? ` (${serviceType})` : ''}` : '';
  const messageText = `⭐ Rate Request\n\nHi ${farmerName}! I hope the service${serviceInfo} was helpful. Could you please rate your experience? Your feedback helps me improve my service. Thank you! 🙏`;

  // Send as special message with metadata
  await sendMessage(chatId, technicianId, messageText);

  // Also save a rate_request document to track it
  const rateRequestRef = await firestore().collection('rateRequests').add({
    technicianId,
    technicianName,
    farmerId,
    farmerName,
    chatId,
    animalName: animalName || '',
    animalPhoto: animalPhoto || '',
    serviceType: serviceType || '',
    status: 'pending', // pending | completed
    rating: null,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  // 2. Create notification for farmer
  await firestore().collection(Collections.NOTIFICATIONS).add({
    userId: farmerId,
    type: 'rate_request',
    title: 'Rate Your Experience ⭐',
    body: `${technicianName} is asking you to rate their service${serviceInfo}. Tap to rate!`,
    read: false,
    data: {
      technicianId,
      chatId,
      rateRequestId: rateRequestRef.id,
    },
    createdAt: firestore.FieldValue.serverTimestamp(),
  });


  return rateRequestRef.id;
};

/**
 * Submit a rating from farmer to technician
 * 1. Updates rate request document
 * 2. Sends chat message with rating + animal info
 * 3. Updates technician's average rating
 * 4. Creates notification for technician
 * 5. Triggers FCM push to technician
 */
export const submitRating = async (params: {
  rateRequestId: string;
  rating: number;
  farmerId: string;
  farmerName: string;
  technicianId: string;
  technicianName: string;
  chatId: string;
}) => {
  const { rateRequestId, rating, farmerId } = params;
  const result = await callBackend<{
    reviewId: string; newRating: number; newCount: number; farmerName: string;
    technicianName: string; animalName: string; serviceType: string; chatId: string;
  }>('submitTechnicianRating', { rateRequestId, rating });

  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const animalInfo = result.animalName ? `\nService: ${result.serviceType || 'Checkup'} for ${result.animalName}` : '';
  const ratingMessage = `⭐ Rating: ${stars} (${rating}/5)${animalInfo}\n\nThank you for your service, ${result.technicianName}! I rated you ${rating} out of 5 stars.`;
  await sendMessage(result.chatId, farmerId, ratingMessage);
  return result;
};

/**
 * Get the latest pending rate request for a chat (farmer side)
 * Includes animal info for display in rating card
 */
export const getPendingRateRequest = async (chatId: string, farmerId: string) => {
  // Single-field query to avoid composite index requirement
  const snapshot = await firestore()
    .collection('rateRequests')
    .where('farmerId', '==', farmerId)
    .get();

  // Filter remaining conditions client-side
  const matches = snapshot.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter((r: any) => r.chatId === chatId && r.status === 'pending')
    .sort((a: any, b: any) => ((b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));

  return matches.length > 0 ? matches[0] : null;
};

/**
 * Check if a rate request already exists for this chat (technician side)
 * Returns true if there is any pending or completed rate request,
 * meaning the technician should NOT be allowed to send another one.
 */
export const hasExistingRateRequest = async (chatId: string, technicianId: string): Promise<boolean> => {
  // Single-field query to avoid composite index requirement
  const snapshot = await firestore()
    .collection('rateRequests')
    .where('chatId', '==', chatId)
    .get();

  // Filter client-side: any rate request from this technician (pending or completed)
  const existing = snapshot.docs
    .map(d => d.data())
    .filter((r: any) => r.technicianId === technicianId);

  return existing.length > 0;
};
