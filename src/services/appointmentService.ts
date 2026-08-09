/**
 * Appointment Service — handles accept/decline with auto-notifications
 * + Calendar event creation on accept
 */

import firestore from '@react-native-firebase/firestore';
import { Collections } from './firebase';
import { getOrCreateChatRoom, sendMessage } from './chatService';
import { logCrud } from './logService';
import { createAppointmentEvent, deleteCalendarEvent } from './calendarService';
import { sendPushNotification } from './pushService';

interface AcceptParams {
  appointmentId: string;
  serviceType: string;
  animalName: string;
  date: string;
  time: string;
  farmerId: string;
  farmerName: string;
  technicianId: string;
  technicianName: string;
  location?: string;
}

/**
 * Accept an appointment request:
 * 1. Update appointment status to 'confirmed'
 * 2. Create a chat room between technician and farmer (if not exists)
 * 3. Send auto-message from technician to farmer
 * 4. Create notification for farmer (+ FCM push)
 * 5. Create calendar event on device
 * 6. Log activity
 */
export const acceptAppointment = async (params: AcceptParams) => {
  const {
    appointmentId,
    serviceType,
    animalName,
    date,
    time,
    farmerId,
    farmerName,
    technicianId,
    technicianName,
    location,
  } = params;

  // 1. Update appointment status
  await firestore().collection(Collections.APPOINTMENTS).doc(appointmentId).update({
    status: 'confirmed',
    technicianId,
    technicianName,
  });

  // 2. Create/get chat room between technician and farmer
  const chatId = await getOrCreateChatRoom(technicianId, farmerId);

  // 3. Send auto-message from technician
  const autoMessage = `Hi ${farmerName}! I've accepted your ${serviceType} request for ${animalName}. I'll visit on ${formatDateForMessage(date)}${time ? ` at ${time}` : ''}. Feel free to message me if you have any questions or concerns. See you soon! 🐄`;
  await sendMessage(chatId, technicianId, autoMessage);

  // 4. Create notification for farmer
  await firestore().collection(Collections.NOTIFICATIONS).add({
    userId: farmerId,
    type: 'appointment_accepted',
    title: 'Appointment Accepted! ✅',
    body: `${technicianName} accepted your ${serviceType} request for ${animalName}. Scheduled: ${formatDateForMessage(date)}${time ? ` at ${time}` : ''}.`,
    read: false,
    data: {
      appointmentId,
      technicianId,
      chatId,
    },
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  // FCM push notification to farmer
  await sendPushNotification(farmerId, {
    title: 'Appointment Accepted! ✅',
    body: `${technicianName} accepted your ${serviceType} request for ${animalName}. Scheduled: ${formatDateForMessage(date)}${time ? ` at ${time}` : ''}.`,
    data: { type: 'appointment_accepted', appointmentId, chatId },
  });

  // 5. Create calendar event on device
  let calendarEventId: string | null = null;
  try {
    calendarEventId = await createAppointmentEvent({
      title: `🐄 ${serviceType} — ${animalName}`,
      notes: `Service: ${serviceType}\nAnimal: ${animalName}\nFarmer: ${farmerName}\n\nAppointment ID: ${appointmentId}`,
      location: location || '',
      date,
      time,
      durationMinutes: 60,
      farmerName,
      animalName,
      serviceType,
    });

    // Save calendar event ID to Firestore for future reference (cancel/update)
    if (calendarEventId) {
      await firestore().collection(Collections.APPOINTMENTS).doc(appointmentId).update({
        calendarEventId,
      });
    }
  } catch (e: any) {
    console.warn('Calendar event creation failed (non-blocking):', e.message);
  }

  // 6. Log activity
  await logCrud('Appointment Accepted', `${serviceType} for ${farmerName} — ${animalName}`, 'appointments', appointmentId, {
    old: { status: 'pending', technicianId: '' },
    new: { status: 'confirmed', technicianId, technicianName, calendarEventId },
  });

  return { chatId, calendarEventId };
};

/**
 * Decline an appointment request:
 * 1. Update status to 'cancelled'
 * 2. Create notification for farmer (+ FCM push)
 * 3. Remove calendar event if exists
 * 4. Log activity
 */
export const declineAppointment = async (params: {
  appointmentId: string;
  serviceType: string;
  animalName: string;
  farmerId: string;
  farmerName: string;
  technicianId: string;
  technicianName: string;
}) => {
  const { appointmentId, serviceType, animalName, farmerId, farmerName, technicianId, technicianName } = params;

  // Check if there's a calendar event to remove
  const apptDoc = await firestore().collection(Collections.APPOINTMENTS).doc(appointmentId).get();
  const calendarEventId = apptDoc.data()?.calendarEventId;

  // 1. Update status
  await firestore().collection(Collections.APPOINTMENTS).doc(appointmentId).update({
    status: 'cancelled',
    technicianId,
    technicianName,
  });

  // 2. Notify farmer
  await firestore().collection(Collections.NOTIFICATIONS).add({
    userId: farmerId,
    type: 'appointment_declined',
    title: 'Request Declined',
    body: `${technicianName} was unable to accept your ${serviceType} request for ${animalName}. Please try requesting another technician.`,
    read: false,
    data: { appointmentId },
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  // FCM push notification to farmer
  await sendPushNotification(farmerId, {
    title: 'Request Declined',
    body: `${technicianName} was unable to accept your ${serviceType} request for ${animalName}.`,
    data: { type: 'appointment_declined', appointmentId },
  });

  // 3. Remove calendar event if exists
  if (calendarEventId) {
    try {
      await deleteCalendarEvent(calendarEventId);
    } catch (e) {}
  }

  // 4. Log
  await logCrud('Appointment Declined', `${serviceType} for ${farmerName}`, 'appointments', appointmentId, {
    old: { status: 'pending' },
    new: { status: 'cancelled' },
  });
};

// Helper to format date for display in messages
function formatDateForMessage(dateStr: string): string {
  if (!dateStr) return 'the scheduled date';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
