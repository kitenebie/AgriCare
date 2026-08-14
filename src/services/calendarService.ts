/**
 * Calendar Service — Device Calendar Integration
 * Uses expo-calendar to create events in the user's device calendar
 */

import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { modalAlert } from '@/components/ui/ModalAlert';

/**
 * Request calendar permission and return whether granted
 */
export const requestCalendarPermission = async (): Promise<boolean> => {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
};

/**
 * Get or create the AgriCare calendar on the device
 * Returns the calendar ID to use for events
 */
export const getAgriCareCalendarId = async (): Promise<string | null> => {
  const hasPermission = await requestCalendarPermission();
  if (!hasPermission) {
    console.warn('Calendar permission not granted, skipping calendar event.');
    return null;
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

  // Look for existing AgriCare calendar
  const existing = calendars.find(c => c.title === 'AgriCare');
  if (existing) return existing.id;

  // Create a new AgriCare calendar
  const defaultCalendarSource = Platform.OS === 'ios'
    ? calendars.find(c => c.source?.name === 'iCloud')?.source
      ?? calendars.find(c => c.source?.isLocalAccount)?.source
    : { isLocalAccount: true, name: 'AgriCare', type: Calendar.CalendarType.LOCAL as any };

  if (!defaultCalendarSource) {
    // Fallback: use the first available calendar's source
    if (calendars.length > 0) {
      return calendars[0].id;
    }
    return null;
  }

  try {
    const newCalendarId = await Calendar.createCalendarAsync({
      title: 'AgriCare',
      color: '#4CAF50',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: (defaultCalendarSource as any).id,
      source: defaultCalendarSource as any,
      name: 'AgriCare',
      ownerAccount: 'AgriCare',
      accessLevel: Calendar.CalendarAccessLevel.OWNER
    });
    return newCalendarId;
  } catch (e: any) {
    console.warn('Failed to create AgriCare calendar:', e.message);
    // Fallback to first writable calendar
    const writable = calendars.find(c => c.allowsModifications);
    return writable?.id ?? (calendars.length > 0 ? calendars[0].id : null);
  }
};

/**
 * Create a calendar event for an accepted appointment
 */
export const createAppointmentEvent = async (params: {
  title: string;
  notes: string;
  location?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm or "9:00 AM" format
  durationMinutes?: number;
  farmerName: string;
  animalName: string;
  serviceType: string;
}): Promise<string | null> => {
  const { title, notes, location, date, time, durationMinutes = 60, farmerName, animalName, serviceType } = params;

  const calendarId = await getAgriCareCalendarId();
  if (!calendarId) return null;

  // Parse date and time
  let startDate: Date;
  if (time) {
    // Try parsing time (handles "9:00 AM", "09:00", "14:30" etc.)
    const timeParsed = parseTime(time);
    startDate = new Date(`${date}T${timeParsed}:00`);
  } else {
    // Default to 8:00 AM if no time specified
    startDate = new Date(`${date}T08:00:00`);
  }

  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  try {
    const eventId = await Calendar.createEventAsync(calendarId, {
      title,
      notes,
      location: location || '',
      startDate,
      endDate,
      timeZone: 'Asia/Manila',
      alarms: [
        { relativeOffset: -60 },   // 1 hour before
        { relativeOffset: -1440 }, // 1 day before
      ]
    });

    return eventId;
  } catch (e: any) {
    console.error('Failed to create calendar event:', e.message);
    return null;
  }
};

/**
 * Delete a calendar event by ID
 */
export const deleteCalendarEvent = async (eventId: string): Promise<void> => {
  try {
    await Calendar.deleteEventAsync(eventId);
  } catch (e: any) {
    console.warn('Failed to delete calendar event:', e.message);
  }
};

/**
 * Parse various time formats to HH:mm
 */
function parseTime(timeStr: string): string {
  if (!timeStr) return '08:00';

  // Already in HH:mm format
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }

  // "9:00 AM" or "2:30 PM" format
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  // "9 AM" format (no minutes)
  const matchShort = timeStr.match(/(\d{1,2})\s*(AM|PM)/i);
  if (matchShort) {
    let hours = parseInt(matchShort[1]);
    const period = matchShort[2].toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:00`;
  }

  return '08:00'; // default
}
