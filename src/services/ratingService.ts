/**
 * Rating Service — handles rate requests and rating submissions
 * with FCM notifications and chat messages
 */

import firestore from '@react-native-firebase/firestore';
import { Collections } from './firebase';
import { getOrCreateChatRoom, sendMessage } from './chatService';
import { sendPushNotification } from './pushService';

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

  // 3. Send FCM push notification
  await sendPushNotification(farmerId, {
    title: 'Rate Your Experience ⭐',
    body: `${technicianName} is asking you to rate their service${serviceInfo}.`,
    data: { type: 'rate_request', chatId, technicianId },
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
  const { rateRequestId, rating, farmerId, farmerName, technicianId, technicianName, chatId } = params;

  // Get the rate request to include animal info in the message
  const rateReqDoc = await firestore().collection('rateRequests').doc(rateRequestId).get();
  const rateReqData = rateReqDoc.data();
  const animalName = rateReqData?.animalName || '';
  const serviceType = rateReqData?.serviceType || '';

  // 1. Update rate request
  await firestore().collection('rateRequests').doc(rateRequestId).update({
    status: 'completed',
    rating,
    ratedAt: firestore.FieldValue.serverTimestamp(),
  });

  // 2. Send chat message with the rating
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const animalInfo = animalName ? `\nService: ${serviceType || 'Checkup'} for ${animalName}` : '';
  const ratingMessage = `⭐ Rating: ${stars} (${rating}/5)${animalInfo}\n\nThank you for your service, ${technicianName}! I rated you ${rating} out of 5 stars.`;
  await sendMessage(chatId, farmerId, ratingMessage);

  // 3. Update technician's average rating in Firestore
  const reviewRef = await firestore().collection(Collections.REVIEWS).add({
    technicianId,
    technicianName,
    farmerId,
    farmerName,
    rating,
    animalName,
    serviceType,
    rateRequestId,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  // Update technician aggregate rating
  const techDoc = await firestore().collection(Collections.USERS).doc(technicianId).get();
  const currentData = techDoc.data();
  const currentRating = currentData?.rating || 0;
  const currentReviewCount = currentData?.reviewCount || 0;
  const newCount = currentReviewCount + 1;
  const newRating = ((currentRating * currentReviewCount) + rating) / newCount;

  await firestore().collection(Collections.USERS).doc(technicianId).update({
    rating: Math.round(newRating * 10) / 10, // 1 decimal
    reviewCount: newCount,
  });

  // 4. Create notification for technician
  await firestore().collection(Collections.NOTIFICATIONS).add({
    userId: technicianId,
    type: 'rating_received',
    title: `New Rating: ${'⭐'.repeat(rating)}`,
    body: `${farmerName} rated you ${rating}/5 stars${animalName ? ` for ${animalName}` : ''}! ${rating >= 4 ? 'Great job! 🎉' : 'Keep improving! 💪'}`,
    read: false,
    data: {
      farmerId,
      chatId,
      rating,
      reviewId: reviewRef.id,
    },
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  // 5. Send FCM push notification
  await sendPushNotification(technicianId, {
    title: `New Rating: ${'⭐'.repeat(rating)}`,
    body: `${farmerName} rated you ${rating}/5 stars!`,
    data: { type: 'rating_received', chatId, farmerId, rating: String(rating) },
  });

  return { reviewId: reviewRef.id, newRating, newCount };
};

/**
 * Get the latest pending rate request for a chat (farmer side)
 * Includes animal info for display in rating card
 */
export const getPendingRateRequest = async (chatId: string, farmerId: string) => {
  // Single-field query to avoid composite index requirement
  const snapshot = await firestore()
    .collection('rateRequests')
    .where('chatId', '==', chatId)
    .get();

  // Filter remaining conditions client-side
  const matches = snapshot.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter((r: any) => r.farmerId === farmerId && r.status === 'pending')
    .sort((a: any, b: any) => ((b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));

  return matches.length > 0 ? matches[0] : null;
};
