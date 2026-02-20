import { useState, useCallback, useRef } from "react";
import { format, subDays, addDays } from "date-fns";
import { DayEvent } from "@/types/event";

interface EventCardData {
	_id: string;
	title: string;
	description?: string;
	date: string;
	completed: boolean;
	color?: string;
	recurringEventId?: string;
	plannerId?: string;
	plannerColor?: string;
	order?: number;
	isGenerated?: boolean;
	createdAt?: string;
}

export function useEvents(userId: string) {
	const [events, setEvents] = useState<DayEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const isFetchingRef = useRef(false);
	const ORDER_MIN = 10000;
	const ORDER_MAX = 100000;

	const randomOrder = () =>
		Math.floor(ORDER_MIN + Math.random() * (ORDER_MAX - ORDER_MIN + 1));

	const clampOrder = (value: number) =>
		Math.min(ORDER_MAX, Math.max(ORDER_MIN, value));

	const fetchEvents = useCallback(
		async (
			startDate: Date,
			endDate: Date,
			merge: boolean = false,
			plannerIds?: string[]
		) => {
			// Prevent multiple simultaneous fetches
			if (isFetchingRef.current && !merge) return;

			isFetchingRef.current = true;
			try {
				const plannerIdsParam =
					plannerIds && plannerIds.length > 0
						? `&plannerIds=${plannerIds.join(",")}`
						: "";
				const response = await fetch(
					`/api/events/cards?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}${plannerIdsParam}`,
					{
						headers: {
							"x-user-id": userId,
						},
					}
				);

				if (!response.ok) throw new Error("Failed to fetch events");

				const data = await response.json();
				const mappedEvents: DayEvent[] = data.cards.map(
					(card: EventCardData) => {
						// Parse the UTC date and extract UTC components to avoid timezone shifts
						// card.date is an ISO string like "2025-12-10T00:00:00.000Z"
						const dateObj = new Date(card.date);
						// Use UTC components to get the correct calendar date
						const year = dateObj.getUTCFullYear();
						const month = dateObj.getUTCMonth();
						const day = dateObj.getUTCDate();
						// Create a local date from UTC components (this represents the calendar date)
						const localDate = new Date(year, month, day);
						const dateStr = format(localDate, "yyyy-MM-dd");

						return {
							id: card._id,
							title: card.title,
							description: card.description,
							date: dateStr,
							completed: card.completed,
							color: card.color,
							recurringEventId: card.recurringEventId,
							plannerId: card.plannerId,
							plannerColor: card.plannerColor,
							order: card.order,
							isGenerated: card.isGenerated,
							createdAt: card.createdAt,
						};
					}
				);

				if (merge) {
					// Merge with existing events, avoiding duplicates
					setEvents((prev) => {
						const existingIds = new Set(prev.map((e) => e.id));
						const newEvents = mappedEvents.filter(
							(e) => !existingIds.has(e.id)
						);
						return [...prev, ...newEvents];
					});
				} else {
					setEvents(mappedEvents);
				}
			} catch (error) {
				console.error("Error fetching events:", error);
			} finally {
				setLoading(false);
				isFetchingRef.current = false;
			}
		},
		[userId]
	);

	const getEventsForDate = useCallback(
		(date: string): DayEvent[] => {
			const dayEvents = events.filter((event) => event.date === date);
			const hasOrder = dayEvents.some(
				(event) => typeof event.order === "number"
			);
			if (!hasOrder) return dayEvents;

			return dayEvents.sort((a, b) => {
				if (a.completed !== b.completed) {
					return a.completed ? 1 : -1;
				}
				const orderA =
					typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
				const orderB =
					typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
				if (orderA !== orderB) return orderA - orderB;

				const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
				const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
				if (createdA === createdB) return 0;
				return createdA - createdB;
			});
		},
		[events]
	);

	const toggleComplete = useCallback(
		async (id: string) => {
			const event = events.find((e) => e.id === id);
			if (!event) return;

			try {
				const response = await fetch("/api/events/cards", {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						"x-user-id": userId,
					},
					body: JSON.stringify({
						cardId: id,
						updates: {
							completed: !event.completed,
						},
					}),
				});

				if (!response.ok) throw new Error("Failed to update event");

				// Optimistically update UI
				setEvents((prev) =>
					prev.map((e) => (e.id === id ? { ...e, completed: !e.completed } : e))
				);
			} catch (error) {
				console.error("Error updating event:", error);
				// Revert on error
				setEvents((prev) =>
					prev.map((e) =>
						e.id === id ? { ...e, completed: event.completed } : e
					)
				);
			}
		},
		[events, userId]
	);

	const addEvent = useCallback(
		async (eventData: {
			title: string;
			description?: string;
			date: string;
			recurrenceType?: string;
			recurrenceConfig?: { interval?: number; days?: number[] };
			endDate?: string;
			plannerId?: string;
		}) => {
			try {
				if (eventData.recurrenceType) {
					// Create recurring event
					const response = await fetch("/api/events/recurring", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"x-user-id": userId,
						},
						body: JSON.stringify({
							title: eventData.title,
							description: eventData.description,
							recurrenceType: eventData.recurrenceType,
							recurrenceConfig: eventData.recurrenceConfig || {},
							startDate: eventData.date,
							endDate: eventData.endDate,
							plannerId: eventData.plannerId,
						}),
					});

					if (!response.ok) {
						const errorData = await response.json();
						throw new Error(errorData.error || "Failed to create event");
					}
				} else {
					// Create single event card
					const response = await fetch("/api/events/cards", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"x-user-id": userId,
						},
						body: JSON.stringify({
							title: eventData.title,
							description: eventData.description,
							date: eventData.date,
							plannerId: eventData.plannerId,
						}),
					});

					if (!response.ok) {
						const errorData = await response.json();
						throw new Error(errorData.error || "Failed to create event");
					}
				}

				// Refresh events - fetch a wider range to ensure we have the new event
				const eventDate = new Date(eventData.date);
				const start = subDays(eventDate, 7);
				const end = addDays(eventDate, 7);
				await fetchEvents(start, end, true); // merge = true to avoid losing existing events
			} catch (error) {
				console.error("Error adding event:", error);
				throw error;
			}
		},
		[userId, fetchEvents]
	);

	const deleteEvent = useCallback(
		async (event: DayEvent, scope: "this" | "future" | "all" = "this") => {
			try {
				if (event.id.startsWith("recurring_")) {
					// This is a generated recurring event card
					const parts = event.id.split("_");
					if (parts.length >= 3) {
						const recurringEventId = parts[1];
						const response = await fetch(
							`/api/events/recurring/${recurringEventId}?scope=${scope}&eventDate=${event.date}`,
							{
								method: "DELETE",
								headers: {
									"x-user-id": userId,
								},
							}
						);
						if (!response.ok)
							throw new Error("Failed to delete recurring event");
					}
				} else if (event.recurringEventId) {
					// This is a stored card from a recurring event
					if (scope === "this") {
						// Delete just this card
						const response = await fetch(`/api/events/cards/${event.id}`, {
							method: "DELETE",
							headers: {
								"x-user-id": userId,
							},
						});
						if (!response.ok) throw new Error("Failed to delete event");
					} else {
						// Delete recurring event with scope
						const response = await fetch(
							`/api/events/recurring/${event.recurringEventId}?scope=${scope}&eventDate=${event.date}`,
							{
								method: "DELETE",
								headers: {
									"x-user-id": userId,
								},
							}
						);
						if (!response.ok)
							throw new Error("Failed to delete recurring event");
					}
				} else {
					// Regular single event
					const response = await fetch(`/api/events/cards/${event.id}`, {
						method: "DELETE",
						headers: {
							"x-user-id": userId,
						},
					});
					if (!response.ok) throw new Error("Failed to delete event");
				}

				// Refresh events
				const today = new Date();
				const start = subDays(today, 30);
				const end = addDays(today, 30);
				await fetchEvents(start, end, true);
			} catch (error) {
				console.error("Error deleting event:", error);
				throw error;
			}
		},
		[userId, fetchEvents]
	);

	const updateEvent = useCallback(
		async (
			event: DayEvent,
			updates: {
				title?: string;
				description?: string;
				date?: string;
				plannerId?: string;
			},
			scope: "this" | "future" | "all" = "this"
		) => {
			try {
				if (event.id.startsWith("recurring_")) {
					// This is a generated recurring event card
					const parts = event.id.split("_");
					if (parts.length >= 3) {
						const recurringEventId = parts[1];
						const response = await fetch(
							`/api/events/recurring/${recurringEventId}`,
							{
								method: "PATCH",
								headers: {
									"Content-Type": "application/json",
									"x-user-id": userId,
								},
								body: JSON.stringify({
									scope,
									eventDate: event.date,
									updates,
								}),
							}
						);
						if (!response.ok)
							throw new Error("Failed to update recurring event");
					}
				} else if (event.recurringEventId) {
					// This is a stored card from a recurring event
					if (scope === "this") {
						// Update just this card
						const response = await fetch(`/api/events/cards/${event.id}`, {
							method: "PATCH",
							headers: {
								"Content-Type": "application/json",
								"x-user-id": userId,
							},
							body: JSON.stringify({ updates }),
						});
						if (!response.ok) throw new Error("Failed to update event");
					} else {
						// Update recurring event with scope
						const response = await fetch(
							`/api/events/recurring/${event.recurringEventId}`,
							{
								method: "PATCH",
								headers: {
									"Content-Type": "application/json",
									"x-user-id": userId,
								},
								body: JSON.stringify({
									scope,
									eventDate: event.date,
									updates,
								}),
							}
						);
						if (!response.ok)
							throw new Error("Failed to update recurring event");
					}
				} else {
					// Regular single event
					const response = await fetch(`/api/events/cards/${event.id}`, {
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
							"x-user-id": userId,
						},
						body: JSON.stringify({ updates }),
					});
					if (!response.ok) throw new Error("Failed to update event");
				}

				// Refresh events
				const today = new Date();
				const start = subDays(today, 30);
				const end = addDays(today, 30);
				await fetchEvents(start, end, true);
			} catch (error) {
				console.error("Error updating event:", error);
				throw error;
			}
		},
		[userId, fetchEvents]
	);

	const reorderEvents = useCallback(
		async (orderedEvents: DayEvent[], activeId: string) => {
			const previousEvents = events;
			const activeIndex = orderedEvents.findIndex(
				(event) => event.id === activeId
			);
			if (activeIndex < 0) return;

			const prevEvent = orderedEvents[activeIndex - 1];
			const nextEvent = orderedEvents[activeIndex + 1];
			const prevOrder =
				typeof prevEvent?.order === "number" ? prevEvent.order : randomOrder();
			const nextOrder =
				typeof nextEvent?.order === "number" ? nextEvent.order : randomOrder();

			let newOrder: number;
			if (prevEvent && nextEvent) {
				newOrder =
					prevOrder >= nextOrder
						? randomOrder()
						: prevOrder + (nextOrder - prevOrder) / 2;
			} else if (prevEvent) {
				newOrder = prevOrder + 1000;
			} else if (nextEvent) {
				newOrder = nextOrder - 1000;
			} else {
				newOrder = randomOrder();
			}

			newOrder = clampOrder(newOrder);

			setEvents((prev) =>
				prev.map((event) =>
					event.id === activeId ? { ...event, order: newOrder } : event
				)
			);

			try {
				const response = await fetch("/api/events/cards", {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						"x-user-id": userId,
					},
					body: JSON.stringify({
						cardId: activeId,
						updates: { order: newOrder },
					}),
				});

				if (!response.ok) {
					throw new Error("Failed to reorder events");
				}
			} catch (error) {
				console.error("Error reordering events:", error);
				setEvents(previousEvents);
			}
		},
		[events, userId]
	);

	return {
		events,
		loading,
		getEventsForDate,
		toggleComplete,
		addEvent,
		fetchEvents,
		deleteEvent,
		updateEvent,
		reorderEvents,
	};
}
