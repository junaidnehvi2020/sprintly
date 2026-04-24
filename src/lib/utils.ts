import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { eachDayOfInterval, isSameDay } from 'date-fns';
import type { Holiday, OrganizationSettings } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBusinessDays(
  startDate: Date,
  endDate: Date,
  settings: OrganizationSettings | null,
  holidays: Holiday[]
): Date[] {
  if (!startDate || !endDate || !settings) return [];

  const weekendDays = new Set(settings.weekendDays);
  const holidayDates = new Set(holidays.map(h => h.date.toDateString()));

  const dates = eachDayOfInterval({ start: startDate, end: endDate });
  
  return dates.filter(date => {
    const dayOfWeek = date.getDay();
    const isWeekend = weekendDays.has(dayOfWeek);
    const isHoliday = holidayDates.has(date.toDateString());
    return !isWeekend && !isHoliday;
  });
}
