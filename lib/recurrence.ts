import { addDays, startOfDay, getDay } from "date-fns";
import { RecurrenceType } from "@/models/RecurringEvent";

export interface RecurrenceConfig {
	interval?: number;
	days?: number[];
}

/**
 * Check if a date matches the recurrence pattern
 */
export function matchesRecurrence(
	date: Date,
	recurrenceType: RecurrenceType,
	config: RecurrenceConfig,
	startDate: Date
): boolean {
	const checkDate = startOfDay(date);
	const start = startOfDay(startDate);

	switch (recurrenceType) {
		case "daily":
			return checkDate >= start;

		case "everyXDays":
			if (!config.interval) return false;
			if (checkDate < start) return false;
			const daysDiff = Math.floor(
				(checkDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
			);
			return daysDiff % config.interval === 0;

		case "daysOfWeek":
			if (!config.days || config.days.length === 0) return false;
			if (checkDate < start) return false;
			const dayOfWeek = getDay(checkDate);
			return config.days.includes(dayOfWeek);

		default:
			return false;
	}
}

/**
 * Generate all dates that match the recurrence pattern within a date range
 */
export function generateRecurrenceDates(
	recurrenceType: RecurrenceType,
	config: RecurrenceConfig,
	startDate: Date,
	endDate: Date,
	maxDates: number = 365
): Date[] {
	const dates: Date[] = [];
	const start = startOfDay(startDate);
	const end = startOfDay(endDate);
	let current = new Date(start);

	switch (recurrenceType) {
		case "daily":
			while (current <= end && dates.length < maxDates) {
				dates.push(new Date(current));
				current = addDays(current, 1);
			}
			break;

		case "everyXDays":
			if (!config.interval) break;
			while (current <= end && dates.length < maxDates) {
				dates.push(new Date(current));
				current = addDays(current, config.interval);
			}
			break;

		case "daysOfWeek":
			if (!config.days || config.days.length === 0) break;
			while (current <= end && dates.length < maxDates) {
				const dayOfWeek = getDay(current);
				if (config.days.includes(dayOfWeek)) {
					dates.push(new Date(current));
				}
				current = addDays(current, 1);
			}
			break;
	}

	return dates;
}

/**
 * Get the next occurrence date after a given date
 */
export function getNextOccurrence(
	recurrenceType: RecurrenceType,
	config: RecurrenceConfig,
	startDate: Date,
	afterDate: Date
): Date | null {
	const start = startOfDay(startDate);
	const after = startOfDay(afterDate);

	if (after < start) {
		return start;
	}

	switch (recurrenceType) {
		case "daily":
			return addDays(after, 1);

		case "everyXDays":
			if (!config.interval) return null;
			const daysDiff = Math.floor(
				(after.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
			);
			const nextInterval =
				Math.ceil((daysDiff + 1) / config.interval) * config.interval;
			return addDays(start, nextInterval);

		case "daysOfWeek":
			if (!config.days || config.days.length === 0) return null;
			let current = addDays(after, 1);
			const maxDays = 14; // Check up to 2 weeks ahead
			for (let i = 0; i < maxDays; i++) {
				const dayOfWeek = getDay(current);
				if (config.days.includes(dayOfWeek)) {
					return current;
				}
				current = addDays(current, 1);
			}
			return null;

		default:
			return null;
	}
}
