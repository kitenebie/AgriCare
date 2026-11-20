"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasTimeSlotConflict = exports.hasTimeRangeConflict = exports.getTechnicianAvailability = exports.getNextAvailability = exports.isTimeInAnyRange = exports.normalizeTimeRanges = exports.isTimeInRange = exports.isTimeRangeValid = exports.hasAppointmentTimeConflict = exports.isTechnicianServiceInProgress = exports.isTechnicianAppointmentActive = void 0;
const isTechnicianAppointmentActive = (appointment, now = Date.now()) => appointment.status === 'confirmed' || appointment.status === 'upcoming' || (appointment.status === 'pending' && (appointment.responseDeadlineAt?.toMillis?.() ?? Infinity) > now);
exports.isTechnicianAppointmentActive = isTechnicianAppointmentActive;
const isTechnicianServiceInProgress = (appointment) => appointment.status === 'confirmed' || appointment.status === 'upcoming';
exports.isTechnicianServiceInProgress = isTechnicianServiceInProgress;
const toMinutes = (time) => {
    const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match)
        return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 1 || hour > 12 || minute > 59)
        return null;
    return (hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + minute;
};
const minuteInRange = (minutes, start, end) => start !== end &&
    (start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end);
const hasAppointmentTimeConflict = (date, time, appointment) => {
    const requestedMinutes = toMinutes(time);
    const appointmentMinutes = appointment.time ? toMinutes(appointment.time) : null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !appointment.date || requestedMinutes === null || appointmentMinutes === null)
        return true;
    const requestedStart = new Date(`${date}T00:00:00`).getTime() + requestedMinutes * 60_000;
    const appointmentStart = new Date(`${appointment.date}T00:00:00`).getTime() + appointmentMinutes * 60_000;
    if (!Number.isFinite(requestedStart) || !Number.isFinite(appointmentStart))
        return true;
    const appointmentDuration = 60 * 60_000;
    return requestedStart < appointmentStart + appointmentDuration && appointmentStart < requestedStart + appointmentDuration;
};
exports.hasAppointmentTimeConflict = hasAppointmentTimeConflict;
const isTimeRangeValid = (start, end) => {
    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);
    return startMinutes !== null && endMinutes !== null && startMinutes !== endMinutes;
};
exports.isTimeRangeValid = isTimeRangeValid;
const isTimeInRange = (time, start, end) => {
    const minutes = toMinutes(time);
    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);
    return minutes !== null && startMinutes !== null && endMinutes !== null && minuteInRange(minutes, startMinutes, endMinutes);
};
exports.isTimeInRange = isTimeInRange;
const normalizeTimeRanges = (value) => {
    const ranges = Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : [];
    return ranges.filter((range) => {
        if (!range || typeof range !== 'object')
            return false;
        const { startTime, endTime } = range;
        return typeof startTime === 'string' && typeof endTime === 'string' && (0, exports.isTimeRangeValid)(startTime, endTime);
    });
};
exports.normalizeTimeRanges = normalizeTimeRanges;
const isTimeInAnyRange = (time, ranges) => (0, exports.normalizeTimeRanges)(ranges).some(range => (0, exports.isTimeInRange)(time, range.startTime, range.endTime));
exports.isTimeInAnyRange = isTimeInAnyRange;
const getNextAvailability = (technician, now = new Date()) => {
    if (technician.available === false)
        return null;
    const dailyRanges = (0, exports.normalizeTimeRanges)(technician.alwaysAvailable);
    if (technician.alwaysAvailableEnabled !== false && dailyRanges.length) {
        return `Daily: ${dailyRanges.map(range => `${range.startTime}–${range.endTime}`).join(' · ')}`;
    }
    const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const today = dateKey(now);
    const nextSlot = (technician.availabilitySlots || []).flatMap(slot => {
        const time = slot.time || (slot.startTime && slot.endTime ? `${slot.startTime}–${slot.endTime}` : '');
        if (slot.date)
            return slot.date >= today ? [{ date: slot.date, time }] : [];
        if (slot.dayOfWeek === undefined)
            return [];
        const nextDate = Array.from({ length: 7 }, (_, offset) => {
            const date = new Date(now);
            date.setDate(date.getDate() + offset);
            return date;
        }).find(date => date.getDay() === slot.dayOfWeek);
        return nextDate ? [{ date: dateKey(nextDate), time }] : [];
    }).filter(slot => slot.time).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];
    return nextSlot ? `Next: ${nextSlot.date} at ${nextSlot.time}` : null;
};
exports.getNextAvailability = getNextAvailability;
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const slotRange = (slot) => {
    if (slot.startTime && slot.endTime && (0, exports.isTimeRangeValid)(slot.startTime, slot.endTime))
        return { startTime: slot.startTime, endTime: slot.endTime };
    const startMinutes = slot.time ? toMinutes(slot.time) : null;
    if (startMinutes === null)
        return null;
    const startHour = Math.floor(startMinutes / 60) % 12 || 12;
    const startPeriod = startMinutes >= 720 ? 'PM' : 'AM';
    const endMinutes = startMinutes + 60;
    const endHour = Math.floor(endMinutes / 60) % 12 || 12;
    const endPeriod = endMinutes >= 1440 ? 'AM' : endMinutes >= 720 ? 'PM' : 'AM';
    return { startTime: `${startHour}:${String(startMinutes % 60).padStart(2, '0')} ${startPeriod}`, endTime: `${endHour}:${String(endMinutes % 60).padStart(2, '0')} ${endPeriod}` };
};
const zonedNow = (now, timeZone) => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone, weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now);
    const value = (type) => parts.find(part => part.type === type)?.value || '';
    const year = value('year');
    const month = value('month');
    const day = value('day');
    return {
        dayOfWeek: weekdays.indexOf(value('weekday')),
        date: `${year}-${month}-${day}`,
        minutes: Number(value('hour')) * 60 + Number(value('minute')),
    };
};
const getTechnicianAvailability = (technician, now = new Date()) => {
    const timezone = technician.timezone || 'Asia/Manila';
    let local;
    try {
        local = zonedNow(now, timezone);
    }
    catch {
        local = zonedNow(now, 'Asia/Manila');
    }
    const slots = Array.isArray(technician.availabilitySlots) ? technician.availabilitySlots : [];
    const dailyRanges = technician.alwaysAvailableEnabled === false ? [] : (0, exports.normalizeTimeRanges)(technician.alwaysAvailable);
    const hasSchedule = dailyRanges.length > 0 || slots.some(slot => !!slotRange(slot));
    const day = weekdays[local.dayOfWeek];
    const daily = dailyRanges;
    const todaySlots = slots.filter(slot => slot.date === local.date || (!slot.date && slot.dayOfWeek === local.dayOfWeek));
    const todayRanges = daily.length ? daily : todaySlots.map(slotRange).filter((range) => !!range);
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
        if (slot.date !== previousDateKey && (slot.date || slot.dayOfWeek !== previousDay))
            return false;
        const range = slotRange(slot);
        if (!range)
            return false;
        const start = toMinutes(range.startTime);
        const end = toMinutes(range.endTime);
        return start !== null && end !== null && start > end && local.minutes < end;
    });
    const hasTodaySchedule = todayRanges.length > 0 || inPreviousOvernightSlot;
    const status = !hasSchedule ? 'Availability Not Set' : technician.available === false ? 'Unavailable Today' :
        !hasTodaySchedule ? 'Unavailable Today' : inWorkingHours || inPreviousOvernightSlot ? 'Available Now' : 'Outside Working Hours';
    const schedule = weekdays.map((label, dayOfWeek) => {
        const ranges = daily.length ? daily : slots.filter(slot => !slot.date && slot.dayOfWeek === dayOfWeek).map(slotRange).filter((range) => !!range);
        return { day: label, isToday: dayOfWeek === local.dayOfWeek, ranges };
    });
    const datedSlots = slots.filter(slot => !!slot.date && slot.date >= local.date).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return { status, timezone, schedule, datedSlots, today: day };
};
exports.getTechnicianAvailability = getTechnicianAvailability;
const overlaps = (start, end, range) => {
    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);
    const rangeStart = toMinutes(range.startTime);
    const rangeEnd = toMinutes(range.endTime);
    if (startMinutes === null || endMinutes === null || rangeStart === null || rangeEnd === null || startMinutes === endMinutes || rangeStart === rangeEnd)
        return false;
    const segments = (from, to) => from < to ? [[from, to]] : [[from, 1440], [0, to]];
    return segments(startMinutes, endMinutes).some(([from, to]) => segments(rangeStart, rangeEnd).some(([otherFrom, otherTo]) => from < otherTo && otherFrom < to));
};
const dateWeekday = (date) => new Date(`${date}T00:00:00`).getDay();
const todayKey = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const hasTimeRangeConflict = (start, end, target, slots, dailyRanges) => {
    if ((0, exports.normalizeTimeRanges)(dailyRanges).some(range => overlaps(start, end, range)))
        return true;
    const weekday = 'date' in target ? dateWeekday(target.date) : undefined;
    return slots.some(slot => {
        if ('everyDay' in target && slot.date && slot.date < todayKey())
            return false;
        const applies = 'everyDay' in target || ('date' in target && (slot.date === target.date || slot.dayOfWeek === weekday));
        if (!applies)
            return false;
        if (slot.startTime && slot.endTime)
            return overlaps(start, end, { startTime: slot.startTime, endTime: slot.endTime });
        return !!slot.time && (0, exports.isTimeInRange)(slot.time, start, end);
    });
};
exports.hasTimeRangeConflict = hasTimeRangeConflict;
const hasTimeSlotConflict = (time, dayOfWeek, slots, dailyRanges) => {
    if ((0, exports.isTimeInAnyRange)(time, dailyRanges))
        return true;
    const today = todayKey();
    return slots.some(slot => {
        if (slot.date && slot.date < today)
            return false;
        const applies = slot.dayOfWeek === dayOfWeek || (slot.date !== undefined && dateWeekday(slot.date) === dayOfWeek);
        if (!applies)
            return false;
        return slot.time === time || (!!slot.startTime && !!slot.endTime && (0, exports.isTimeInRange)(time, slot.startTime, slot.endTime));
    });
};
exports.hasTimeSlotConflict = hasTimeSlotConflict;
