"use client";

import {
	useRef,
	useEffect,
	useLayoutEffect,
	useCallback,
	useState,
} from "react";
import { format, addDays, subDays, startOfDay } from "date-fns";
import { DayColumn } from "./DayColumn";
import { useEvents } from "@/hooks/useEvents";
import { AddEventDialog } from "./AddEventDialog";
import { EditEventDialog } from "./EditEventDialog";
import { EventActionDialog } from "./EventActionDialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { DayEvent } from "@/types/event";

interface KanbanBoardProps {
	todayRef: React.RefObject<{ scrollToToday: () => void }>;
	onAddEventClick: () => void;
	addEventDialogOpen: boolean;
	setAddEventDialogOpen: (open: boolean) => void;
	userId: string;
}

const DAYS_PER_WEEK = 7;
const INITIAL_DAYS_BEFORE = DAYS_PER_WEEK;
const INITIAL_DAYS_AFTER = DAYS_PER_WEEK;
const LOAD_THRESHOLD = 200; // pixels from edge to trigger load

export function KanbanBoard({
	todayRef,
	onAddEventClick: _onAddEventClick,
	addEventDialogOpen,
	setAddEventDialogOpen,
	userId,
}: KanbanBoardProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const {
		getEventsForDate,
		addEvent,
		toggleComplete,
		fetchEvents,
		deleteEvent,
		updateEvent,
	} = useEvents(userId);
	const [selectedDate, setSelectedDate] = useState<string | undefined>();
	const [editEvent, setEditEvent] = useState<DayEvent | null>(null);
	const [deleteEventData, setDeleteEventData] = useState<{
		event: DayEvent;
		action: "delete";
	} | null>(null);
	const [actionScope, setActionScope] = useState<
		"this" | "future" | "all" | null
	>(null);

	const today = startOfDay(new Date());
	const todayStr = format(today, "yyyy-MM-dd");

	// Track the date range we're displaying
	const [startDateOffset, setStartDateOffset] = useState(-INITIAL_DAYS_BEFORE);
	const [endDateOffset, setEndDateOffset] = useState(INITIAL_DAYS_AFTER);
	const [loadedStartDate, setLoadedStartDate] = useState<Date | null>(null);
	const [loadedEndDate, setLoadedEndDate] = useState<Date | null>(null);
	const isLoadingMoreRef = useRef(false);
	const hasInitialScrollRef = useRef(false);

	// Generate dates array based on current offsets
	const dates = Array.from(
		{ length: endDateOffset - startDateOffset + 1 },
		(_, i) => format(addDays(today, startDateOffset + i), "yyyy-MM-dd")
	);

	// Find today's index - should be at INITIAL_DAYS_BEFORE (7) when starting
	const todayIndex = dates.findIndex((d) => d === todayStr);

	// Initial fetch on mount
	useEffect(() => {
		const start = subDays(today, INITIAL_DAYS_BEFORE);
		const end = addDays(today, INITIAL_DAYS_AFTER);
		setLoadedStartDate(start);
		setLoadedEndDate(end);
		fetchEvents(start, end);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Only run on mount

	// Initial scroll to today - use useLayoutEffect for synchronous execution before paint
	useLayoutEffect(() => {
		if (hasInitialScrollRef.current) return; // Only run once

		// Wait for dates to be generated and todayIndex to be valid
		if (todayIndex < 0 || dates.length === 0) {
			return; // Will retry on next render
		}

		const container = scrollContainerRef.current;
		if (!container) return;

		// Disable smooth scrolling temporarily by setting style (overrides class)
		const originalScrollBehavior = container.style.scrollBehavior;
		container.style.scrollBehavior = "auto";

		// Try to scroll immediately, but columns might not be rendered yet
		// So we'll also set up a fallback
		const performScroll = () => {
			const firstColumn = container.querySelector(
				"[data-day-column]"
			) as HTMLElement;
			if (!firstColumn || firstColumn.offsetWidth === 0) {
				// Columns not ready yet, will be handled by the fallback
				return;
			}

			// Get actual gap from computed styles (gap-3 = 12px on mobile, gap-4 = 16px on desktop)
			const containerStyles = window.getComputedStyle(container);
			const gap = parseFloat(containerStyles.gap) || 12; // Default to 12px if not found

			// Get actual padding from computed styles (px-3 = 12px on mobile, px-6 = 24px on desktop)
			const paddingLeft = parseFloat(containerStyles.paddingLeft) || 12;

			const columnWidth = firstColumn.offsetWidth;
			const totalColumnWidth = columnWidth + gap;
			const containerWidth = container.clientWidth;

			if (containerWidth > 0 && columnWidth > 0 && todayIndex >= 0) {
				// Calculate scroll position to center today
				// todayIndex * totalColumnWidth = position of today's column start
				// + paddingLeft = account for left padding
				// - containerWidth / 2 = move left by half viewport
				// + columnWidth / 2 = center the column in viewport
				const scrollPosition =
					todayIndex * totalColumnWidth +
					paddingLeft -
					containerWidth / 2 +
					columnWidth / 2;

				container.scrollLeft = Math.max(0, scrollPosition);
				hasInitialScrollRef.current = true;

				// Restore original scroll behavior after a brief delay
				setTimeout(() => {
					container.style.scrollBehavior = originalScrollBehavior;
				}, 100);
			}
		};

		// Try immediately (might work if DOM is ready)
		performScroll();

		// Fallback: try after layout is complete
		requestAnimationFrame(() => {
			requestAnimationFrame(performScroll);
		});

		// Final fallback: try after a short delay
		const timeoutId = setTimeout(performScroll, 100);

		return () => {
			clearTimeout(timeoutId);
			// Restore scroll behavior on cleanup
			container.style.scrollBehavior = originalScrollBehavior;
		};
	}, [todayIndex, dates.length]); // Depend on todayIndex and dates array

	// Expose scroll-to-today function via ref (for the "Today" button)
	useEffect(() => {
		const scrollToToday = () => {
			const container = scrollContainerRef.current;
			if (!container) return;

			const todayDate = startOfDay(new Date());
			const todayDateStr = format(todayDate, "yyyy-MM-dd");
			const currentTodayIndex = dates.findIndex((d) => d === todayDateStr);

			if (currentTodayIndex >= 0) {
				// Dynamically calculate column width and gap from actual DOM
				const firstColumn = container.querySelector(
					"[data-day-column]"
				) as HTMLElement;

				if (!firstColumn) {
					// Fallback: try again after a short delay if columns aren't ready
					setTimeout(scrollToToday, 100);
					return;
				}

				// Get actual column width from DOM
				const columnWidth = firstColumn.offsetWidth;

				// Get actual gap from computed styles (gap-3 = 12px on mobile, gap-4 = 16px on desktop)
				const containerStyles = window.getComputedStyle(container);
				const gap = parseFloat(containerStyles.gap) || 12; // Default to 12px if not found

				// Get actual padding from computed styles (px-3 = 12px on mobile, px-6 = 24px on desktop)
				const paddingLeft = parseFloat(containerStyles.paddingLeft) || 12;

				const containerWidth = container.clientWidth;
				const totalColumnWidth = columnWidth + gap;

				// Calculate scroll position to center today's column
				const scrollPosition =
					currentTodayIndex * totalColumnWidth +
					paddingLeft -
					containerWidth / 2 +
					columnWidth / 2;

				container.scrollTo({
					left: Math.max(0, scrollPosition),
					behavior: "smooth",
				});
			}
		};

		if (todayRef.current) {
			(todayRef.current as { scrollToToday: () => void }).scrollToToday =
				scrollToToday;
		}
	}, [dates, todayRef]);

	// Load more days when scrolling
	const loadMoreDays = useCallback(
		async (direction: "left" | "right") => {
			if (
				isLoadingMoreRef.current ||
				!loadedStartDate ||
				!loadedEndDate ||
				!scrollContainerRef.current
			)
				return;

			isLoadingMoreRef.current = true;
			const container = scrollContainerRef.current;
			const previousScrollLeft = container.scrollLeft;
			const columnWidth = 320 + 16; // width + gap

			try {
				let newStartDate = loadedStartDate;
				let newEndDate = loadedEndDate;
				let newStartOffset = startDateOffset;
				let newEndOffset = endDateOffset;

				if (direction === "left") {
					// Load a week before
					newStartDate = subDays(loadedStartDate, DAYS_PER_WEEK);
					newStartOffset = startDateOffset - DAYS_PER_WEEK;
					await fetchEvents(newStartDate, loadedEndDate, true); // merge = true

					// Adjust scroll position to maintain visual position
					// We added DAYS_PER_WEEK columns on the left, so we need to shift scroll right
					setTimeout(() => {
						if (container) {
							container.scrollLeft =
								previousScrollLeft + DAYS_PER_WEEK * columnWidth;
						}
					}, 0);
				} else {
					// Load a week after
					newEndDate = addDays(loadedEndDate, DAYS_PER_WEEK);
					newEndOffset = endDateOffset + DAYS_PER_WEEK;
					await fetchEvents(loadedStartDate, newEndDate, true); // merge = true
					// No scroll adjustment needed for right-side loading
				}

				setLoadedStartDate(newStartDate);
				setLoadedEndDate(newEndDate);
				setStartDateOffset(newStartOffset);
				setEndDateOffset(newEndOffset);
			} catch (error) {
				console.error("Error loading more days:", error);
			} finally {
				isLoadingMoreRef.current = false;
			}
		},
		[
			startDateOffset,
			endDateOffset,
			loadedStartDate,
			loadedEndDate,
			fetchEvents,
		]
	);

	// Handle scroll to detect when we need to load more
	const handleScroll = useCallback(() => {
		if (!scrollContainerRef.current || isLoadingMoreRef.current) return;

		const container = scrollContainerRef.current;
		const scrollLeft = container.scrollLeft;
		const scrollWidth = container.scrollWidth;
		const clientWidth = container.clientWidth;

		// Check if we're near the left edge (past dates) - always allow loading more past dates
		if (scrollLeft < LOAD_THRESHOLD) {
			loadMoreDays("left");
		}

		// Check if we're near the right edge (future dates) - always allow loading more future dates
		if (scrollLeft + clientWidth > scrollWidth - LOAD_THRESHOLD) {
			loadMoreDays("right");
		}
	}, [loadMoreDays]);

	// Attach scroll listener
	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		container.addEventListener("scroll", handleScroll, { passive: true });
		return () => container.removeEventListener("scroll", handleScroll);
	}, [handleScroll]);

	const handleAddEvent = (date: string) => {
		setSelectedDate(date);
		setAddEventDialogOpen(true);
	};

	const handleEditEvent = (event: DayEvent) => {
		setEditEvent(event);
		setActionScope(null);
	};

	const handleDeleteEvent = (event: DayEvent) => {
		setDeleteEventData({ event, action: "delete" });
		setActionScope(null);
	};

	const handleActionConfirm = async (scope: "this" | "future" | "all") => {
		if (!deleteEventData && !editEvent) return;

		try {
			if (deleteEventData) {
				await deleteEvent(deleteEventData.event, scope);
				setDeleteEventData(null);
				setActionScope(null);
			} else if (editEvent) {
				// Edit will be handled by EditEventDialog
				setActionScope(scope);
			}
		} catch (error) {
			console.error("Error performing action:", error);
			alert("Failed to perform action. Please try again.");
		}
	};

	const handleEditSave = async (data: {
		title: string;
		description?: string;
		date: string;
		color?: string;
	}) => {
		if (!editEvent) return;

		const scope = actionScope || "this";
		await updateEvent(editEvent, data, scope);
		setEditEvent(null);
		setActionScope(null);
	};

	const handleScrollButton = (direction: "left" | "right") => {
		if (scrollContainerRef.current) {
			const scrollAmount = 336 * 2; // Two columns
			scrollContainerRef.current.scrollBy({
				left: direction === "right" ? scrollAmount : -scrollAmount,
				behavior: "smooth",
			});
		}
	};

	return (
		<div className="relative h-full overflow-hidden">
			{/* Navigation arrows - hidden on mobile, visible on larger screens */}
			<Button
				variant="glass"
				size="icon"
				className="hidden md:flex absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 shadow-elevated"
				onClick={() => handleScrollButton("left")}
			>
				<ChevronLeft className="w-5 h-5" />
			</Button>
			<Button
				variant="glass"
				size="icon"
				className="hidden md:flex absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 shadow-elevated"
				onClick={() => handleScrollButton("right")}
			>
				<ChevronRight className="w-5 h-5" />
			</Button>

			{/* Scroll container */}
			<div
				ref={scrollContainerRef}
				className="flex gap-3 md:gap-4 h-full w-full overflow-x-auto overflow-y-auto px-3 md:px-6 py-3 md:py-4 scrollbar-hide scroll-smooth"
			>
				{dates.map((date) => (
					<DayColumn
						key={date}
						date={date}
						events={getEventsForDate(date)}
						onToggleComplete={toggleComplete}
						onAddEvent={handleAddEvent}
						onEditEvent={handleEditEvent}
						onDeleteEvent={handleDeleteEvent}
					/>
				))}
			</div>

			{/* Add Event Dialog */}
			<AddEventDialog
				open={addEventDialogOpen}
				onOpenChange={setAddEventDialogOpen}
				onAdd={addEvent}
				initialDate={selectedDate}
			/>

			{/* Edit Event Dialog */}
			{editEvent && (
				<>
					{!actionScope &&
					(editEvent.recurringEventId ||
						editEvent.id.startsWith("recurring_")) ? (
						<EventActionDialog
							open={true}
							action="modify"
							isRecurring={true}
							onClose={() => {
								setEditEvent(null);
								setActionScope(null);
							}}
							onConfirm={handleActionConfirm}
						/>
					) : (
						<EditEventDialog
							open={true}
							event={editEvent}
							onClose={() => {
								setEditEvent(null);
								setActionScope(null);
							}}
							onSave={handleEditSave}
						/>
					)}
				</>
			)}

			{/* Delete Confirmation Dialog */}
			{deleteEventData && (
				<EventActionDialog
					open={true}
					action="delete"
					isRecurring={
						!!(
							deleteEventData.event.recurringEventId ||
							deleteEventData.event.id.startsWith("recurring_")
						)
					}
					onClose={() => {
						setDeleteEventData(null);
						setActionScope(null);
					}}
					onConfirm={handleActionConfirm}
				/>
			)}
		</div>
	);
}
