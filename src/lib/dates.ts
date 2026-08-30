import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { Weekday } from '../types';

/** Calendar grid (Sun-start) covering every full week that touches the given month. */
export function monthGridDays(monthAnchor: Date): Date[] {
  const start = startOfWeek(startOfMonth(monthAnchor));
  const end = endOfWeek(endOfMonth(monthAnchor));
  return eachDayOfInterval({ start, end });
}

/** The 7 days (Sun-Sat) of the week containing the given anchor date. */
export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return eachDayOfInterval({ start, end: endOfWeek(anchor) });
}

/** All dates within [start, end] that fall on `dayOfWeek`. */
export function weekdayOccurrencesInRange(dayOfWeek: Weekday, start: Date, end: Date): Date[] {
  return eachDayOfInterval({ start, end }).filter((d) => d.getDay() === dayOfWeek);
}

/**
 * All dates within [start, end] that are the `nth` occurrence of `dayOfWeek` in their month.
 * Used for Automox-style "Patch Tuesday" (2nd Tuesday) cadences.
 */
export function nthWeekdayOccurrencesInRange(
  dayOfWeek: Weekday,
  nth: number,
  start: Date,
  end: Date,
): Date[] {
  return eachDayOfInterval({ start, end }).filter((d) => {
    if (d.getDay() !== dayOfWeek) return false;
    return Math.ceil(d.getDate() / 7) === nth;
  });
}

export function combineDateAndTime(day: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const result = new Date(day);
  result.setHours(h || 0, m || 0, 0, 0);
  return result;
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_LABELS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
