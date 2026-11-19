/**
 * Appointment Service — handles accept/decline with auto-notifications
 * + Calendar event creation on accept
 */

import firestore from '@react-native-firebase/firestore';
import { Collections } from './firebase';
import { getOrCreateChatRoom, sendMessage } from './chatService';
import { logCrud } from './logService';
import { createAppointmentEvent, deleteCalendarEvent } from './calendarService';
import { hasAppointmentTimeConflict, isTechnicianAppointmentActive, isTechnicianServiceInProgress } from '@/utils/availability';
import { sendPushNotification } from '@/services/pushService';

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

  const appointments = firestore().collection(Collections.APPOINTMENTS);
  const existingAppointments = await appointments
    .where('technicianId', '==', technicianId)
    .get();
  if (existingAppointments.docs.some(doc => doc.id !== appointmentId && isTechnicianServiceInProgress(doc.data()) && hasAppointmentTimeConflict(date, time, doc.data()))) {
    throw new Error('Complete your current service before accepting another request.');
  }

  // Claim only an open request or one assigned to this technician.
  const appointmentRef = appointments.doc(appointmentId);
  const technicianRef = firestore().collection(Collections.USERS).doc(technicianId);
  const { expiredForSelectedTechnician, previousTechnicianId, alreadyAccepted, existingCalendarEventId } = await firestore().runTransaction(async transaction => {
    const [snapshot, technicianSnapshot] = await Promise.all([
      transaction.get(appointmentRef),
      transaction.get(technicianRef),
    ]);
    if (!snapshot.exists) throw new Error('This request no longer exists.');
    const appointment = snapshot.data()!;
    if (appointment.status === 'confirmed' && appointment.technicianId === technicianId) {
      return {
        expiredForSelectedTechnician: false,
        previousTechnicianId: technicianId,
        alreadyAccepted: true,
        existingCalendarEventId: appointment.calendarEventId || null,
      };
    }
    if (appointment.status !== 'pending') throw new Error('This request is no longer pending.');
    if (appointment.declinedByTechnicianIds?.includes(technicianId)) throw new Error('You already declined this request.');
    const previousTechnicianId = appointment.technicianId || '';
    const deadline = appointment.responseDeadlineAt?.toMillis?.();
    const expired = typeof deadline === 'number' && deadline <= Date.now();

    if (previousTechnicianId && previousTechnicianId !== technicianId && !expired) {
      throw new Error('This request is reserved for another technician.');
    }
    const technicianData = technicianSnapshot.data();
    const activeAppointmentIds = [...new Set([
      ...(Array.isArray(technicianData?.activeAppointmentIds) ? technicianData.activeAppointmentIds : []),
      technicianData?.activeAppointmentId,
    ].filter((id): id is string => typeof id === 'string' && id !== appointmentId))];
    const activeSnapshots = await Promise.all(activeAppointmentIds.map(id => transaction.get(appointments.doc(id))));
    if (activeSnapshots.some(active => active.exists && isTechnicianServiceInProgress(active.data()!) && hasAppointmentTimeConflict(date, time, active.data()!))) {
      throw new Error('Complete your current service before accepting another request.');
    }
    if (previousTechnicianId === technicianId && expired) {
      transaction.update(appointmentRef, {
        technicianId: '',
        technicianName: 'Unassigned',
        responseDeadlineAt: firestore.FieldValue.delete(),
        publishedAt: firestore.FieldValue.serverTimestamp(),
      });
      return { expiredForSelectedTechnician: true, previousTechnicianId, alreadyAccepted: false, existingCalendarEventId: null };
    }
    const maxRequestsPerDay = technicianSnapshot.data()?.maxRequestsPerDay;
    const hasDailyLimit = Number.isInteger(maxRequestsPerDay) && maxRequestsPerDay > 0;
    if (hasDailyLimit && !appointment.date) {
      throw new Error('This request has no scheduled date, so its daily limit cannot be checked.');
    }
    if (appointment.date) {
      const dailyCountRef = technicianRef.collection('dailyRequestCounts').doc(appointment.date);
      const dailyCountSnapshot = await transaction.get(dailyCountRef);
      const existingAcceptedForDay = existingAppointments.docs.filter(doc =>
        doc.id !== appointmentId && doc.data().date === appointment.date &&
        ['confirmed', 'upcoming', 'completed'].includes(doc.data().status)
      ).length;
      const storedCount = dailyCountSnapshot.data()?.acceptedCount;
      const acceptedForDay = Number.isInteger(storedCount) && storedCount >= 0 ? storedCount : existingAcceptedForDay;
      if (hasDailyLimit && acceptedForDay >= maxRequestsPerDay) {
        throw new Error(`You reached your limit of ${maxRequestsPerDay} accepted requests for ${appointment.date}.`);
      }
      transaction.set(dailyCountRef, { acceptedCount: acceptedForDay + 1, updatedAt: firestore.FieldValue.serverTimestamp() });
    }
    transaction.update(appointmentRef, {
      status: 'confirmed',
      technicianId,
      technicianName,
      responseDeadlineAt: firestore.FieldValue.delete(),
    });
    transaction.set(technicianRef, {
      activeAppointmentId: appointmentId,
      activeAppointmentIds: firestore.FieldValue.arrayUnion(appointmentId),
    }, { merge: true });
    return { expiredForSelectedTechnician: false, previousTechnicianId, alreadyAccepted: false, existingCalendarEventId: null };
  });
  if (expiredForSelectedTechnician) throw new Error('The response window expired. This request is now available to all technicians.');
  if (alreadyAccepted) return { chatId: '', calendarEventId: existingCalendarEventId, alreadyAccepted: true };

  try {
    const competingSnapshot = await appointments.where('technicianId', '==', technicianId).get();
    const competingRequests = competingSnapshot.docs.filter(doc =>
      doc.id !== appointmentId && doc.data().status === 'pending' && isTechnicianAppointmentActive(doc.data()) && hasAppointmentTimeConflict(date, time, doc.data())
    );
    if (competingRequests.length) {
      const batch = firestore().batch();
      competingRequests.forEach(doc => {
        const request = doc.data();
        batch.update(doc.ref, {
          status: 'cancelled',
          cancellationReason: 'technician_unavailable',
          cancelledAt: firestore.FieldValue.serverTimestamp(),
        });
        if (request.farmerId) {
          const notificationRef = firestore().collection(Collections.NOTIFICATIONS).doc();
          batch.set(notificationRef, {
            userId: request.farmerId,
            type: 'appointment_unavailable',
            title: 'Technician Unavailable',
            body: `${technicianName} accepted another request and is unavailable for this appointment. Please choose another technician.`,
            read: false,
            data: { appointmentId: doc.id },
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
        }
      });
      await batch.commit();
    }
  } catch (error) {
    console.warn('Competing appointment cancellation failed:', error);
  }

  // Chat setup is best-effort after the appointment has already been confirmed.
  let chatId = '';
  const autoMessage = `Hi ${farmerName}! I've accepted your ${serviceType} request for ${animalName}. I'll visit on ${formatDateForMessage(date)}${time ? ` at ${time}` : ''}. Feel free to message me if you have any questions or concerns. See you soon! 🐄`;
  try {
    chatId = await getOrCreateChatRoom(technicianId, farmerId);
    await sendMessage(chatId, technicianId, autoMessage);
    await sendPushNotification(farmerId, {
      title: `💬 ${technicianName}`,
      body: autoMessage.substring(0, 100) + (autoMessage.length > 100 ? '...' : ''),
      data: { type: 'new_chat_message', chatId, senderId: technicianId, senderName: technicianName },
    });
  } catch (error) {
    console.warn('Accepted appointment chat setup failed:', error);
  }

  try {
    await firestore().collection(Collections.NOTIFICATIONS).add({
      userId: farmerId,
      type: 'appointment_accepted',
      title: 'Appointment Accepted! ✅',
      body: `${technicianName} accepted your ${serviceType} request for ${animalName}. Scheduled: ${formatDateForMessage(date)}${time ? ` at ${time}` : ''}.`,
      read: false,
      data: { appointmentId, technicianId, ...(chatId ? { chatId } : {}) },
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.warn('Appointment acceptance notification failed:', error);
  }


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
    old: { status: 'pending', technicianId: previousTechnicianId },
    new: { status: 'confirmed', technicianId, technicianName, calendarEventId },
  });

  return { chatId, calendarEventId, alreadyAccepted: false };
};

/**
 * Decline an appointment request:
 * 1. Reopen public requests or cancel requests reserved for this technician
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
  const appointmentRef = firestore().collection(Collections.APPOINTMENTS).doc(appointmentId);
  const { calendarEventId, isPublicRequest, previousTechnicianId } = await firestore().runTransaction(async transaction => {
    const snapshot = await transaction.get(appointmentRef);
    if (!snapshot.exists) throw new Error('This request no longer exists.');
    const appointment = snapshot.data()!;
    if (appointment.status !== 'pending') throw new Error('This request is no longer available.');

    const previousTechnicianId = appointment.technicianId || '';
    const rawDeadline = appointment.responseDeadlineAt;
    const deadline = typeof rawDeadline === 'number'
      ? rawDeadline
      : rawDeadline instanceof Date
        ? rawDeadline.getTime()
        : rawDeadline?.toMillis?.();
    const expired = typeof deadline === 'number' && deadline <= Date.now();
    if (previousTechnicianId && previousTechnicianId !== technicianId && !expired) {
      throw new Error('This request is reserved for another technician.');
    }

    const isPublicRequest = !previousTechnicianId || (appointment.technicianName || '').toLowerCase() === 'unassigned' || expired;
    transaction.update(appointmentRef, isPublicRequest ? {
      status: 'pending',
      technicianId: '',
      technicianName: 'Unassigned',
      responseDeadlineAt: firestore.FieldValue.delete(),
      declinedByTechnicianIds: firestore.FieldValue.arrayUnion(technicianId),
    } : {
      status: 'cancelled',
      technicianId,
      technicianName,
      responseDeadlineAt: firestore.FieldValue.delete(),
    });

    return { calendarEventId: appointment.calendarEventId, isPublicRequest, previousTechnicianId };
  });

  try {
    await firestore().collection(Collections.NOTIFICATIONS).add({
      userId: farmerId,
      type: 'appointment_declined',
      title: 'Request Declined',
      body: isPublicRequest
        ? `${technicianName} is unable to take your ${serviceType} request for ${animalName}. Your request remains open for other technicians.`
        : `${technicianName} was unable to accept your ${serviceType} request for ${animalName}. Please try requesting another technician.`,
      read: false,
      data: { appointmentId },
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.warn('Appointment decline notification failed:', error);
  }


  // 3. Remove calendar event if exists
  if (calendarEventId) {
    try {
      await deleteCalendarEvent(calendarEventId);
    } catch (e) {}
  }

  // 4. Log
  await logCrud(isPublicRequest ? 'Public Appointment Declined' : 'Appointment Declined', `${serviceType} for ${farmerName}`, 'appointments', appointmentId, {
    old: { status: 'pending', technicianId: previousTechnicianId },
    new: { status: isPublicRequest ? 'pending' : 'cancelled', technicianId: isPublicRequest ? '' : technicianId },
  });
};

export const cancelFarmerAppointment = async (appointmentId: string, farmerId: string) => {
  const appointmentRef = firestore().collection(Collections.APPOINTMENTS).doc(appointmentId);
  const result = await firestore().runTransaction(async transaction => {
    const snapshot = await transaction.get(appointmentRef);
    if (!snapshot.exists) throw new Error('This request no longer exists.');
    const data = snapshot.data()!;
    if (data.farmerId !== farmerId) throw new Error('You can only cancel your own request.');
    if (data.status === 'pending') {
      transaction.update(appointmentRef, {
        status: 'cancelled',
        cancellationReason: 'cancelled_by_farmer',
        cancelledAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      return { data, needsApproval: false };
    }
    if (data.status !== 'confirmed' || !data.technicianId) throw new Error('Only pending or accepted requests can be cancelled.');
    if (data.cancellationRequestStatus === 'pending') throw new Error('A cancellation request is already waiting for technician approval.');
    transaction.update(appointmentRef, {
      cancellationRequestStatus: 'pending',
      cancellationRequestedAt: firestore.FieldValue.serverTimestamp(),
      cancellationRequestedBy: farmerId,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    return { data, needsApproval: true };
  });

  const { data: appointment, needsApproval } = result;
  if (appointment.technicianId) {
    try {
      await firestore().collection(Collections.NOTIFICATIONS).add({
        userId: appointment.technicianId,
        type: needsApproval ? 'appointment_cancellation_requested' : 'appointment_cancelled',
        title: needsApproval ? 'Cancellation Approval Needed' : 'Request Cancelled',
        body: needsApproval
          ? `${appointment.farmerName || 'A farmer'} requested to cancel the ${appointment.serviceType || 'service'} appointment.`
          : `${appointment.farmerName || 'A farmer'} cancelled the ${appointment.serviceType || 'service'} request.`,
        read: false,
        data: { appointmentId },
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.warn('Appointment cancellation notification failed:', error);
    }
  }

  if (!needsApproval) {
    try {
      await logCrud('Appointment Cancelled', `${appointment.serviceType || 'Service'} for ${appointment.farmerName || 'farmer'}`, 'appointments', appointmentId, {
        old: { status: 'pending' },
        new: { status: 'cancelled', farmerId },
      });
    } catch (error) {
      console.warn('Appointment cancellation log failed:', error);
    }
  }
  return { needsApproval };
};

export const resolveFarmerCancellation = async (appointmentId: string, technicianId: string, approve: boolean) => {
  const appointmentRef = firestore().collection(Collections.APPOINTMENTS).doc(appointmentId);
  const technicianRef = firestore().collection(Collections.USERS).doc(technicianId);
  const appointment = await firestore().runTransaction(async transaction => {
    const [snapshot, technicianSnapshot] = await Promise.all([
      transaction.get(appointmentRef),
      transaction.get(technicianRef),
    ]);
    if (!snapshot.exists) throw new Error('This appointment no longer exists.');
    const data = snapshot.data()!;
    if (data.status !== 'confirmed' || data.technicianId !== technicianId || data.cancellationRequestStatus !== 'pending') {
      throw new Error('This cancellation request is no longer available.');
    }
    const dailyCountRef = data.date ? technicianRef.collection('dailyRequestCounts').doc(data.date) : null;
    const countSnapshot = approve && dailyCountRef ? await transaction.get(dailyCountRef) : null;
    if (approve) {
      transaction.update(appointmentRef, {
        status: 'cancelled',
        cancellationReason: 'cancelled_by_farmer',
        cancellationRequestStatus: 'approved',
        cancellationResolvedAt: firestore.FieldValue.serverTimestamp(),
        cancelledAt: firestore.FieldValue.serverTimestamp(),
      });
      transaction.update(technicianRef, {
        activeAppointmentIds: firestore.FieldValue.arrayRemove(appointmentId),
        ...(technicianSnapshot.data()?.activeAppointmentId === appointmentId ? { activeAppointmentId: firestore.FieldValue.delete() } : {}),
      });
      if (dailyCountRef && countSnapshot?.exists) {
        const count = countSnapshot.data()?.acceptedCount;
        if (Number.isInteger(count) && count > 0) transaction.update(dailyCountRef, { acceptedCount: count - 1, updatedAt: firestore.FieldValue.serverTimestamp() });
      }
    } else {
      transaction.update(appointmentRef, {
        cancellationRequestStatus: 'declined',
        cancellationResolvedAt: firestore.FieldValue.serverTimestamp(),
      });
    }
    return data;
  });

  if (appointment.farmerId) {
    try {
      await firestore().collection(Collections.NOTIFICATIONS).add({
        userId: appointment.farmerId,
        type: approve ? 'appointment_cancellation_approved' : 'appointment_cancellation_declined',
        title: approve ? 'Cancellation Approved' : 'Cancellation Declined',
        body: approve
          ? `Your ${appointment.serviceType || 'service'} appointment was cancelled by the technician.`
          : `The technician declined your request to cancel the ${appointment.serviceType || 'service'} appointment.`,
        read: false,
        data: { appointmentId },
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.warn('Cancellation decision notification failed:', error);
    }
  }

  try {
    await logCrud(`Appointment Cancellation ${approve ? 'Approved' : 'Declined'}`, `${appointment.serviceType || 'Service'} for ${appointment.farmerName || 'farmer'}`, 'appointments', appointmentId, {
      old: { status: 'confirmed', cancellationRequestStatus: 'pending' },
      new: { status: approve ? 'cancelled' : 'confirmed', cancellationRequestStatus: approve ? 'approved' : 'declined' },
    });
  } catch (error) {
    console.warn('Cancellation decision log failed:', error);
  }
};

export const completeAppointment = async (appointmentId: string, technicianId: string) => {
  const appointmentRef = firestore().collection(Collections.APPOINTMENTS).doc(appointmentId);
  const technicianRef = firestore().collection(Collections.USERS).doc(technicianId);
  const appointment = await firestore().runTransaction(async transaction => {
    const [snapshot, technicianSnapshot] = await Promise.all([
      transaction.get(appointmentRef),
      transaction.get(technicianRef),
    ]);
    if (!snapshot.exists) throw new Error('This appointment no longer exists.');
    const data = snapshot.data()!;
    if (data.status !== 'confirmed' || data.technicianId !== technicianId) {
      throw new Error('This appointment can no longer be marked complete.');
    }
    transaction.update(appointmentRef, {
      status: 'completed',
      completedAt: firestore.FieldValue.serverTimestamp(),
    });
    transaction.update(technicianRef, {
      activeAppointmentIds: firestore.FieldValue.arrayRemove(appointmentId),
      ...(technicianSnapshot.data()?.activeAppointmentId === appointmentId ? { activeAppointmentId: firestore.FieldValue.delete() } : {}),
    });
    return data;
  });

  if (appointment.farmerId) {
    try {
      await firestore().collection(Collections.NOTIFICATIONS).add({
        userId: appointment.farmerId,
        type: 'appointment_completed',
        title: 'Service Completed',
        body: `Your ${appointment.serviceType || 'requested'} service for ${appointment.animalName || 'your animal'} has been marked complete.`,
        read: false,
        data: { appointmentId },
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.warn('Completion notification failed:', error);
    }
  }

  await logCrud('Appointment Completed', `${appointment.serviceType || 'Service'} for ${appointment.farmerName || 'farmer'}`, 'appointments', appointmentId, {
    old: { status: 'confirmed' },
    new: { status: 'completed', technicianId },
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
