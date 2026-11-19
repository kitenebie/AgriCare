export interface TimeRange { startTime: string; endTime: string; }
export interface AvailabilitySlot { date?: string; dayOfWeek?: number; time?: string; startTime?: string; endTime?: string; }

export const isTechnicianAppointmentActive = (appointment: {
  status?: string;
  responseDeadlineAt?: { toMillis?: () => number };
}, now = Date.now()) => appointment.status === 'confirmed' || appointment.status === 'upcoming' || (
  appointment.status === 'pending' && (appointment.responseDeadlineAt?.toMillis?.() ?? Infinity) > now
);

export const isTechnicianServiceInProgress = (appointment: { status?: string }) =>
  appointment.status === 'confirmed' || appointment.status === 'upcoming';

const toMinutes = (time: string) => {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  return (hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + minute;
};

export const hasAppointmentTimeConflict = (
  date: string,
  time: string,
  appointment: { date?: string; time?: string },
) => {
  const requestedMinutes = toMinutes(time);
  const appointmentMinutes = appointment.time ? toMinutes(appointment.time) : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !appointment.date || requestedMinutes === null || appointmentMinutes === null) return true;

  const requestedStart = new Date(`${date}T00:00:00`).getTime() + requestedMinutes * 60_000;
  const appointmentStart = new Date(`${appointment.date}T00:00:00`).getTime() + appointmentMinutes * 60_000;
  if (!Number.isFinite(requestedStart) || !Number.isFinite(appointmentStart)) return true;
  const appointmentDuration = 60 * 60_000;
  return requestedStart < appointmentStart + appointmentDuration && appointmentStart < requestedStart + appointmentDuration;
};

export const isTimeRangeValid = (start: string, end: string) => {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  return startMinutes !== null && endMinutes !== null && startMinutes < endMinutes;
};

export const isTimeInRange = (time: string, start: string, end: string) => {
  const minutes = toMinutes(time);
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  return minutes !== null && startMinutes !== null && endMinutes !== null && startMinutes < endMinutes && minutes >= startMinutes && minutes < endMinutes;
};

export const normalizeTimeRanges = (value: unknown): TimeRange[] => {
  const ranges: unknown[] = Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : [];
  return ranges.filter((range): range is TimeRange => {
    if (!range || typeof range !== 'object') return false;
    const { startTime, endTime } = range as Partial<TimeRange>;
    return typeof startTime === 'string' && typeof endTime === 'string' && isTimeRangeValid(startTime, endTime);
  });
};

export const isTimeInAnyRange = (time: string, ranges: unknown) =>
  normalizeTimeRanges(ranges).some(range => isTimeInRange(time, range.startTime, range.endTime));

export const getNextAvailability = (technician: {
  available?: boolean;
  availabilitySlots?: AvailabilitySlot[];
  alwaysAvailable?: unknown;
  alwaysAvailableEnabled?: boolean;
}, now = new Date()) => {
  if (technician.available === false) return null;
  const dailyRanges = normalizeTimeRanges(technician.alwaysAvailable);
  if (technician.alwaysAvailableEnabled !== false && dailyRanges.length) {
    return `Daily: ${dailyRanges.map(range => `${range.startTime}–${range.endTime}`).join(' · ')}`;
  }

  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const today = dateKey(now);
  const nextSlot = (technician.availabilitySlots || []).flatMap(slot => {
    const time = slot.time || (slot.startTime && slot.endTime ? `${slot.startTime}–${slot.endTime}` : '');
    if (slot.date) return slot.date >= today ? [{ date: slot.date, time }] : [];
    if (slot.dayOfWeek === undefined) return [];
    const nextDate = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(now);
      date.setDate(date.getDate() + offset);
      return date;
    }).find(date => date.getDay() === slot.dayOfWeek);
    return nextDate ? [{ date: dateKey(nextDate), time }] : [];
  }).filter(slot => slot.time).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];
  return nextSlot ? `Next: ${nextSlot.date} at ${nextSlot.time}` : null;
};

const overlaps = (start: string, end: string, range: TimeRange) => {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  const rangeStart = toMinutes(range.startTime);
  const rangeEnd = toMinutes(range.endTime);
  return startMinutes !== null && endMinutes !== null && rangeStart !== null && rangeEnd !== null && startMinutes < rangeEnd && endMinutes > rangeStart;
};

const dateWeekday = (date: string) => new Date(`${date}T00:00:00`).getDay();
const todayKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const hasTimeRangeConflict = (
  start: string,
  end: string,
  target: { date: string } | { everyDay: true },
  slots: AvailabilitySlot[],
  dailyRanges: unknown,
) => {
  if (normalizeTimeRanges(dailyRanges).some(range => overlaps(start, end, range))) return true;
  const weekday = 'date' in target ? dateWeekday(target.date) : undefined;
  return slots.some(slot => {
    if ('everyDay' in target && slot.date && slot.date < todayKey()) return false;
    const applies = 'everyDay' in target || ('date' in target && (slot.date === target.date || slot.dayOfWeek === weekday));
    if (!applies) return false;
    if (slot.startTime && slot.endTime) return overlaps(start, end, { startTime: slot.startTime, endTime: slot.endTime });
    return !!slot.time && isTimeInRange(slot.time, start, end);
  });
};

export const hasTimeSlotConflict = (time: string, dayOfWeek: number, slots: AvailabilitySlot[], dailyRanges: unknown) => {
  if (isTimeInAnyRange(time, dailyRanges)) return true;
  const today = todayKey();
  return slots.some(slot => {
    if (slot.date && slot.date < today) return false;
    const applies = slot.dayOfWeek === dayOfWeek || (slot.date !== undefined && dateWeekday(slot.date) === dayOfWeek);
    if (!applies) return false;
    return slot.time === time || (!!slot.startTime && !!slot.endTime && isTimeInRange(time, slot.startTime, slot.endTime));
  });
};
