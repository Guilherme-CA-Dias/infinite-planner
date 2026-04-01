/* eslint-disable react/no-array-index-key */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
	addDays,
	endOfWeek,
	format,
	isSameDay,
	startOfDay,
	startOfWeek,
	subDays,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEvents } from "@/hooks/useEvents";
import { DayEvent } from "@/types/event";
import { Button } from "@/components/ui/button";
import { AddEventDialog } from "@/components/AddEventDialog";
import {
	formatHourLabel,
	formatTimeForDisplay,
	getStoredTimeFormat,
	type TimeFormat,
} from "@/lib/timeFormat";

interface WeeklyCalendarViewProps {
	userId: string;
	selectedPlanners?: string[];
	addEventDialogOpen?: boolean;
	setAddEventDialogOpen?: (open: boolean) => void;
}

type TimedEvent = DayEvent & { time: string };

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 00:00 -> 23:00
const ZOOM_MIN = 0.75;
const ZOOM_MAX = 1.75;
const ZOOM_DEFAULT = 1;
const HOUR_ROW_HEIGHT_BASE = 56; // px

function parseTimeToMinutes(time: string) {
	const [hh, mm] = time.split(":").map(Number);
	if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
	return hh * 60 + mm;
}

function isTimedEvent(event: DayEvent): event is TimedEvent {
	return typeof event.time === "string" && /^\d{2}:\d{2}$/.test(event.time);
}

export function WeeklyCalendarView({
	userId,
	selectedPlanners = [],
	addEventDialogOpen,
	setAddEventDialogOpen,
}: WeeklyCalendarViewProps) {
	const { events, fetchEvents, toggleComplete, addEvent } = useEvents(userId);
	const desktopScrollRef = useRef<HTMLDivElement>(null);
	const [weekAnchor, setWeekAnchor] = useState(() => startOfDay(new Date()));
	const [allDayOpen, setAllDayOpen] = useState(true);
	const [timeFormat, setTimeFormat] = useState<TimeFormat>("24h");
	const [zoom, setZoom] = useState<number>(() => {
		if (typeof window === "undefined") return ZOOM_DEFAULT;
		const raw = window.localStorage.getItem("weeklyCalendarZoom");
		const n = raw ? Number(raw) : NaN;
		if (!Number.isFinite(n)) return ZOOM_DEFAULT;
		return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, n));
	});
	const [mobileSelectedDayIdx, setMobileSelectedDayIdx] = useState(() => {
		const today = startOfDay(new Date());
		const start = startOfWeek(today, { weekStartsOn: 0 });
		return Math.max(0, Math.min(6, Math.floor((+today - +start) / 86400000)));
	});

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem("weeklyCalendarZoom", String(zoom));
	}, [zoom]);

	useEffect(() => {
		// Keep in sync with Settings (localStorage)
		setTimeFormat(getStoredTimeFormat());

		const onStorage = (e: StorageEvent) => {
			if (e.key === "timeFormat") setTimeFormat(getStoredTimeFormat());
		};
		const onChanged = () => setTimeFormat(getStoredTimeFormat());

		window.addEventListener("storage", onStorage);
		window.addEventListener("timeFormatChanged", onChanged as EventListener);
		return () => {
			window.removeEventListener("storage", onStorage);
			window.removeEventListener("timeFormatChanged", onChanged as EventListener);
		};
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const raw = window.localStorage.getItem("weeklyCalendarAllDayOpen");
		if (raw === "0") setAllDayOpen(false);
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem("weeklyCalendarAllDayOpen", allDayOpen ? "1" : "0");
	}, [allDayOpen]);

	const weekStart = useMemo(
		() => startOfWeek(weekAnchor, { weekStartsOn: 0 }),
		[weekAnchor]
	);
	const weekEnd = useMemo(
		() => endOfWeek(weekAnchor, { weekStartsOn: 0 }),
		[weekAnchor]
	);
	const days = useMemo(
		() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
		[weekStart]
	);
	const todayKey = format(startOfDay(new Date()), "yyyy-MM-dd");

	useEffect(() => {
		fetchEvents(weekStart, weekEnd, false, selectedPlanners);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [weekStart.getTime(), weekEnd.getTime(), selectedPlanners.join(",")]);

	const timedByDay = useMemo(() => {
		const map = new Map<string, TimedEvent[]>();
		for (const d of days) map.set(format(d, "yyyy-MM-dd"), []);

		for (const e of events) {
			if (!isTimedEvent(e)) continue;
			const list = map.get(e.date);
			if (!list) continue;
			list.push(e);
		}

		for (const [k, list] of map.entries()) {
			list.sort((a, b) => {
				const am = parseTimeToMinutes(a.time) ?? 999999;
				const bm = parseTimeToMinutes(b.time) ?? 999999;
				if (am !== bm) return am - bm;
				// fallback stable ordering
				const ao = typeof a.order === "number" ? a.order : 0;
				const bo = typeof b.order === "number" ? b.order : 0;
				return ao - bo;
			});
			map.set(k, list);
		}

		return map;
	}, [events, days]);

	const allDayByDay = useMemo(() => {
		const map = new Map<string, DayEvent[]>();
		for (const d of days) map.set(format(d, "yyyy-MM-dd"), []);

		for (const e of events) {
			if (isTimedEvent(e)) continue;
			const list = map.get(e.date);
			if (!list) continue;
			list.push(e);
		}

		for (const [k, list] of map.entries()) {
			list.sort((a, b) => {
				const ao =
					typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
				const bo =
					typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
				if (ao !== bo) return ao - bo;
				return 0;
			});
			map.set(k, list);
		}

		return map;
	}, [events, days]);

	const now = new Date();
	const nowMinutes = now.getHours() * 60 + now.getMinutes();
	const isThisWeek = now >= weekStart && now <= weekEnd;
	const hourRowHeight = Math.round(HOUR_ROW_HEIGHT_BASE * zoom);
	const nowTop =
		Math.max(0, nowMinutes - HOURS[0] * 60) * (hourRowHeight / 60);

	// Auto-scroll desktop view to the current hour
	useEffect(() => {
		const el = desktopScrollRef.current;
		if (!el) return;

		const targetHour = new Date().getHours();

		const top = Math.max(0, targetHour - HOURS[0]) * hourRowHeight;
		// Scroll so the target hour is near the top, with a little breathing room
		el.scrollTop = Math.max(0, top - hourRowHeight);
	}, [weekStart.getTime(), weekEnd.getTime(), hourRowHeight, events.length]);

	return (
		<div className="h-full flex flex-col">
			<div className="flex items-center justify-between px-3 md:px-6 py-3 border-b border-border/50 bg-background/60 backdrop-blur">
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setWeekAnchor((d) => subDays(d, 7))}
						aria-label="Previous week"
					>
						<ChevronLeft className="w-4 h-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setWeekAnchor((d) => addDays(d, 7))}
						aria-label="Next week"
					>
						<ChevronRight className="w-4 h-4" />
					</Button>
					<div className="ml-1">
						<div className="text-sm font-semibold text-foreground">
							{format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}
						</div>
						<div className="text-xs text-muted-foreground">
							Weekly calendar (timed reminders)
						</div>
					</div>
				</div>

				<div className="flex items-center gap-3">
					<div className="hidden md:flex items-center gap-2">
						<div className="text-xs text-muted-foreground">Zoom</div>
						<input
							aria-label="Calendar zoom"
							type="range"
							min={ZOOM_MIN}
							max={ZOOM_MAX}
							step={0.05}
							value={zoom}
							onChange={(e) => setZoom(Number(e.target.value))}
							className="w-28"
						/>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setZoom(ZOOM_DEFAULT)}
						>
							Reset
						</Button>
					</div>
					<Button
						variant="soft"
						size="sm"
						onClick={() => {
							const t = startOfDay(new Date());
							setWeekAnchor(t);
							const s = startOfWeek(t, { weekStartsOn: 0 });
							setMobileSelectedDayIdx(
								Math.max(0, Math.min(6, Math.floor((+t - +s) / 86400000)))
							);
						}}
					>
						Today
					</Button>
				</div>
			</div>

			{/* Add Event Dialog (so Header "New Reminder" works on Week view) */}
			{typeof addEventDialogOpen === "boolean" && setAddEventDialogOpen && (
				<AddEventDialog
					open={addEventDialogOpen}
					onOpenChange={setAddEventDialogOpen}
					onAdd={addEvent}
					initialDate={todayKey}
					userId={userId}
				/>
			)}

			{/* Collapsible all-day (no time) section */}
			<div className="border-b border-border/50 bg-background/80 backdrop-blur">
				<div className="flex items-center justify-between px-3 md:px-6 py-2">
					<button
						type="button"
						onClick={() => setAllDayOpen((v) => !v)}
						className="text-sm font-semibold text-foreground hover:opacity-80"
					>
						All-day (no time)
						<span className="ml-2 text-xs text-muted-foreground font-normal">
							{events.filter((e) => !isTimedEvent(e)).length}
						</span>
					</button>
					<Button variant="ghost" size="sm" onClick={() => setAllDayOpen((v) => !v)}>
						{allDayOpen ? "Hide" : "Show"}
					</Button>
				</div>

				{allDayOpen && (
					<div className="px-3 md:px-6 pb-3">
						<div className="grid grid-cols-1 md:grid-cols-7 gap-2">
							{days.map((d) => {
								const key = format(d, "yyyy-MM-dd");
								const list = allDayByDay.get(key) || [];
								return (
									<div key={key} className="min-w-0">
										<div className="text-xs font-medium text-muted-foreground mb-1">
											{format(d, "EEE d")}
										</div>
										{list.length === 0 ? (
											<div className="text-xs text-muted-foreground/70">—</div>
										) : (
											<div className="flex flex-wrap gap-1.5">
												{list.map((e) => (
													<div
														key={e.id}
														className={`max-w-full rounded-md border border-border bg-card px-2 py-1 text-xs flex items-center gap-2 ${
															e.completed ? "opacity-70" : ""
														}`}
													>
														<button
															type="button"
															onClick={() => toggleComplete(e.id)}
															aria-label={
																e.completed ? "Mark incomplete" : "Mark complete"
															}
															className={`h-4 w-4 rounded border flex items-center justify-center ${
																e.completed
																	? "bg-primary border-primary"
																	: "bg-background border-border"
															}`}
														>
															{e.completed && (
																<span className="text-primary-foreground text-[10px]">
																	✓
																</span>
															)}
														</button>
														<span
															className="inline-block w-2 h-2 rounded-full"
															style={{
																backgroundColor:
																	e.plannerColor || e.color || "#3b82f6",
															}}
														/>
														<span
															className={`truncate ${
																e.completed ? "line-through" : ""
															}`}
														>
															{e.title}
														</span>
													</div>
												))}
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>

			{/* Mobile: day tabs + agenda */}
			<div className="md:hidden border-b border-border/50 bg-background">
				<div className="flex overflow-x-auto px-3 py-2 gap-2 scrollbar-hide">
					{days.map((d, idx) => {
						const isSel = idx === mobileSelectedDayIdx;
						const isToday = isSameDay(d, new Date());
						return (
							<button
								key={d.toISOString()}
								type="button"
								onClick={() => setMobileSelectedDayIdx(idx)}
								className={`shrink-0 rounded-lg border px-3 py-2 text-left ${
									isSel
										? "border-primary bg-primary/10"
										: "border-border bg-card"
								}`}
							>
								<div className="text-xs text-muted-foreground">
									{format(d, "EEE")}
								</div>
								<div
									className={`text-sm font-semibold ${
										isToday ? "text-primary" : "text-foreground"
									}`}
								>
									{format(d, "d")}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			<div className="flex-1 overflow-hidden">
				{/* Mobile agenda list */}
				<div className="md:hidden h-full overflow-y-auto px-3 py-3 scrollbar-hide scroll-smooth">
					{(() => {
						const day = days[mobileSelectedDayIdx];
						const key = format(day, "yyyy-MM-dd");
						const timed = timedByDay.get(key) || [];
						const allDay = allDayByDay.get(key) || [];
						return (
							<div className="space-y-4">
								<div>
									<div className="text-sm font-semibold text-foreground">
										{format(day, "EEEE, MMM d")}
									</div>
									<div className="text-xs text-muted-foreground">
										{timed.length} timed · {allDay.length} all-day
									</div>
								</div>

								{allDay.length > 0 && (
									<div className="space-y-2">
										<div className="text-xs font-medium text-muted-foreground">
											All-day
										</div>
										{allDay.map((e) => (
											<div
												key={e.id}
												className="rounded-lg border border-border bg-card p-3 flex items-start gap-3"
											>
												<button
													type="button"
													onClick={() => toggleComplete(e.id)}
													aria-label={e.completed ? "Mark incomplete" : "Mark complete"}
													className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center ${
														e.completed
															? "bg-primary border-primary"
															: "bg-background border-border"
													}`}
												>
													{e.completed && (
														<span className="text-primary-foreground text-xs">✓</span>
													)}
												</button>
												<div className="flex-1 min-w-0">
													<div
														className="h-1 rounded-full mb-2"
														style={{
															backgroundColor:
																e.plannerColor || e.color || "#3b82f6",
														}}
													/>
													<div
														className={`text-sm font-semibold ${
															e.completed
																? "text-muted-foreground line-through"
																: "text-foreground"
														}`}
													>
														{e.title}
													</div>
													{e.description && (
														<div className="text-xs text-muted-foreground mt-1 line-clamp-2">
															{e.description}
														</div>
													)}
												</div>
											</div>
										))}
									</div>
								)}

								<div className="space-y-2">
									<div className="text-xs font-medium text-muted-foreground">
										Timed
									</div>
									{timed.length === 0 ? (
										<div className="text-sm text-muted-foreground">
											No timed reminders for this day.
										</div>
									) : (
										timed.map((e) => (
											<div
												key={e.id}
												className="rounded-lg border border-border bg-card p-3 flex items-start gap-3"
											>
												<button
													type="button"
													onClick={() => toggleComplete(e.id)}
													aria-label={e.completed ? "Mark incomplete" : "Mark complete"}
													className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center ${
														e.completed
															? "bg-primary border-primary"
															: "bg-background border-border"
													}`}
												>
													{e.completed && (
														<span className="text-primary-foreground text-xs">✓</span>
													)}
												</button>
												<div className="w-14 shrink-0 text-xs font-medium text-muted-foreground pt-1">
													{formatTimeForDisplay(e.time, timeFormat)}
												</div>
												<div className="flex-1">
													<div
														className="h-1 rounded-full mb-2"
														style={{
															backgroundColor:
																e.plannerColor || e.color || "#3b82f6",
														}}
													/>
													<div
														className={`text-sm font-semibold ${
															e.completed
																? "text-muted-foreground line-through"
																: "text-foreground"
														}`}
													>
														{e.title}
													</div>
													{e.description && (
														<div className="text-xs text-muted-foreground mt-1 line-clamp-2">
															{e.description}
														</div>
													)}
												</div>
											</div>
										))
									)}
								</div>
							</div>
						);
					})()}
				</div>

				{/* Desktop grid */}
				<div
					ref={desktopScrollRef}
					className="hidden md:block h-full overflow-auto scrollbar-hide scroll-smooth"
				>
					<div className="min-w-[980px]">
						<div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-border/50 bg-background sticky top-0 z-10">
							<div className="h-12" />
							{days.map((d) => {
								const isToday = isSameDay(d, new Date());
								return (
									<div
										key={d.toISOString()}
										className="h-12 px-3 py-2 border-l border-border/50"
									>
										<div className="text-xs text-muted-foreground">
											{format(d, "EEE")}
										</div>
										<div
											className={`text-sm font-semibold ${
												isToday ? "text-primary" : "text-foreground"
											}`}
										>
											{format(d, "d")}
										</div>
									</div>
								);
							})}
						</div>

						<div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))]">
							{/* Time gutter */}
							<div className="border-r border-border/50 bg-background">
								{HOURS.map((h) => (
									<div
										key={h}
										className="pr-2 text-right text-[11px] text-muted-foreground flex items-start justify-end pt-1"
										style={{ height: hourRowHeight }}
									>
										{formatHourLabel(h, timeFormat)}
									</div>
								))}
							</div>

							{/* Day columns */}
							{days.map((d) => {
								const key = format(d, "yyyy-MM-dd");
								const timed = timedByDay.get(key) || [];
								const allDay = allDayByDay.get(key) || [];
								const isToday = isSameDay(d, new Date());

								return (
									<div
										key={d.toISOString()}
										className="relative border-l border-border/50"
										style={{ height: HOURS.length * hourRowHeight }}
									>
										{/* Hour grid lines */}
										{HOURS.map((h) => (
											<div
												key={`${key}_${h}`}
												className="absolute left-0 right-0 border-t border-border/30"
												style={{ top: (h - HOURS[0]) * hourRowHeight }}
											/>
										))}

										{/* Now indicator */}
										{isThisWeek && isToday && (
											<div
												className="absolute left-0 right-0 z-10"
												style={{ top: nowTop }}
											>
												<div className="h-px bg-primary" />
											</div>
										)}

										{/* Timed events */}
										{timed.map((e) => {
											const minutes = parseTimeToMinutes(e.time);
											if (minutes === null) return null;
											const top =
												Math.max(0, minutes - HOURS[0] * 60) *
												(hourRowHeight / 60);
											return (
												<div
													key={e.id}
													className="absolute left-2 right-2 rounded-lg border border-border bg-card shadow-sm overflow-hidden"
													style={{ top, height: 40 }}
													title={e.title}
												>
													<div
														className="h-1"
														style={{
															backgroundColor:
																e.plannerColor || e.color || "#3b82f6",
														}}
													/>
													<div className="px-2 py-1 flex items-start gap-2">
														<button
															type="button"
															onClick={() => toggleComplete(e.id)}
															aria-label={
																e.completed ? "Mark incomplete" : "Mark complete"
															}
															className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center ${
																e.completed
																	? "bg-primary border-primary"
																	: "bg-background border-border"
															}`}
														>
															{e.completed && (
																<span className="text-primary-foreground text-[10px]">
																	✓
																</span>
															)}
														</button>
														<div className="text-[11px] text-muted-foreground">
															{formatTimeForDisplay(e.time, timeFormat)}
														</div>
														<div
															className={`text-xs font-semibold truncate ${
																e.completed
																	? "text-muted-foreground line-through"
																	: "text-foreground"
															}`}
														>
															{e.title}
														</div>
													</div>
												</div>
											);
										})}
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

