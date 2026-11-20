export interface TimeRange { startTime: string; endTime: string; }
export interface AvailabilitySlot { date?: string; dayOfWeek?: number; time?: string; startTime?: string; endTime?: string; }
export interface TechnicianSchedule { available?: boolean; availabilitySlots?: AvailabilitySlot[]; alwaysAvailable?: unknown; alwaysAvailableEnabled?: boolean; timezone?: string; }

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
const minuteInRange = (minutes: number, start: number, end: number) => start !== end &&
  (start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end);

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
  return startMinutes !== null && endMinutes !== null && startMinutes !== endMinutes;
};

export const isTimeInRange = (time: string, start: string, end: string) => {
  const minutes = toMinutes(time);
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  return minutes !== null && startMinutes !== null && endMinutes !== null && minuteInRange(minutes, startMinutes, endMinutes);
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

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const slotRange = (slot: AvailabilitySlot): TimeRange | null => {
  if (slot.startTime && slot.endTime && isTimeRangeValid(slot.startTime, slot.endTime)) return { startTime: slot.startTime, endTime: slot.endTime };
  const startMinutes = slot.time ? toMinutes(slot.time) : null;
  if (startMinutes === null) return null;
  const startHour = Math.floor(startMinutes / 60) % 12 || 12;
  const startPeriod = startMinutes >= 720 ? 'PM' : 'AM';
  const endMinutes = startMinutes + 60;
  const endHour = Math.floor(endMinutes / 60) % 12 || 12;
  const endPeriod = endMinutes >= 1440 ? 'AM' : endMinutes >= 720 ? 'PM' : 'AM';
  return { startTime: `${startHour}:${String(startMinutes % 60).padStart(2, '0')} ${startPeriod}`, endTime: `${endHour}:${String(endMinutes % 60).padStart(2, '0')} ${endPeriod}` };
};

const zonedNow = (now: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value || '';
  const year = value('year');
  const month = value('month');
  const day = value('day');
  return {
    dayOfWeek: weekdays.indexOf(value('weekday')),
    date: `${year}-${month}-${day}`,
    minutes: Number(value('hour')) * 60 + Number(value('minute')),
  };
};

export const getTechnicianAvailability = (technician: TechnicianSchedule, now = new Date()) => {
  const timezone = technician.timezone || 'Asia/Manila';
  let local: ReturnType<typeof zonedNow>;
  try { local = zonedNow(now, timezone); }
  catch { local = zonedNow(now, 'Asia/Manila'); }
  const slots = Array.isArray(technician.availabilitySlots) ? technician.availabilitySlots : [];
  const dailyRanges = technician.alwaysAvailableEnabled === false ? [] : normalizeTimeRanges(technician.alwaysAvailable);
  const hasSchedule = dailyRanges.length > 0 || slots.some(slot => !!slotRange(slot));
  const day = weekdays[local.dayOfWeek];
  const daily = dailyRanges;
  const todaySlots = slots.filter(slot => slot.date === local.date || (!slot.date && slot.dayOfWeek === local.dayOfWeek));
  const todayRanges = daily.length ? daily : todaySlots.map(slotRange).filter((range): range is TimeRange => !!range);
  const inWorkingHours = todayRanges.some(range => {
    const start = toMinutes(range.startTime);
    const end = toMinutes(range.endTime);
    return start !== null && end !== null && minuteInRange(local.minutes, start, end);
  });
  const previousDate = new Date(`${local.date}T12:00:00.000Z`);
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);
  const previousDateKey = previousDate.toISOString().slice(0, 10);
  const previousDay = (local.dayOfWeek + 6) % 7;
  const inPreviousOvernightSlot = !daily.length && slots.some(slot => {
    if (slot.date !== previousDateKey && (slot.date || slot.dayOfWeek !== previousDay)) return false;
    const range = slotRange(slot);
    if (!range) return false;
    const start = toMinutes(range.startTime);
    const end = toMinutes(range.endTime);
    return start !== null && end !== null && start > end && local.minutes < end;
  });
  const hasTodaySchedule = todayRanges.length > 0 || inPreviousOvernightSlot;
  const status = !hasSchedule ? 'Availability Not Set' : technician.available === false ? 'Unavailable Today' :
    !hasTodaySchedule ? 'Unavailable Today' : inWorkingHours || inPreviousOvernightSlot ? 'Available Now' : 'Outside Working Hours';
  const schedule = weekdays.map((label, dayOfWeek) => {
    const ranges = daily.length ? daily : slots.filter(slot => !slot.date && slot.dayOfWeek === dayOfWeek).map(slotRange).filter((range): range is TimeRange => !!range);
    return { day: label, isToday: dayOfWeek === local.dayOfWeek, ranges };
  });
  const datedSlots = slots.filter(slot => !!slot.date && slot.date >= local.date).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return { status, timezone, schedule, datedSlots, today: day };
};

const overlaps = (start: string, end: string, range: TimeRange) => {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  const rangeStart = toMinutes(range.startTime);
  const rangeEnd = toMinutes(range.endTime);
  if (startMinutes === null || endMinutes === null || rangeStart === null || rangeEnd === null || startMinutes === endMinutes || rangeStart === rangeEnd) return false;
  const segments = (from: number, to: number) => from < to ? [[from, to]] : [[from, 1440], [0, to]];
  return segments(startMinutes, endMinutes).some(([from, to]) => segments(rangeStart, rangeEnd).some(([otherFrom, otherTo]) => from < otherTo && otherFrom < to));
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
