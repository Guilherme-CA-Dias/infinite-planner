"use client";

import { useEffect, useMemo, useState } from "react";
import {
	formatTimeForDisplay,
	getStoredTimeFormat,
	type TimeFormat,
} from "@/lib/timeFormat";

function clamp2(n: number) {
	return String(Math.max(0, Math.min(59, n))).padStart(2, "0");
}

function toHHmm(hour24: number, minute: number) {
	const hh = String(Math.max(0, Math.min(23, hour24))).padStart(2, "0");
	const mm = clamp2(minute);
	return `${hh}:${mm}`;
}

function parseHHmm(value?: string) {
	if (!value) return null;
	if (!/^\d{2}:\d{2}$/.test(value)) return null;
	const [hh, mm] = value.split(":").map(Number);
	if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
	if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
	return { hh, mm };
}

export function TimePicker({
	value,
	onChange,
	label = "Time (optional)",
}: {
	value?: string;
	onChange: (value?: string) => void;
	label?: string;
}) {
	const [timeFormat, setTimeFormat] = useState<TimeFormat>("24h");

	useEffect(() => {
		setTimeFormat(getStoredTimeFormat());
		const onChanged = () => setTimeFormat(getStoredTimeFormat());
		const onStorage = (e: StorageEvent) => {
			if (e.key === "timeFormat") setTimeFormat(getStoredTimeFormat());
		};
		window.addEventListener("timeFormatChanged", onChanged as EventListener);
		window.addEventListener("storage", onStorage);
		return () => {
			window.removeEventListener("timeFormatChanged", onChanged as EventListener);
			window.removeEventListener("storage", onStorage);
		};
	}, []);

	const parsed = parseHHmm(value);

	const minute = parsed?.mm ?? 0;
	const hour24 = parsed?.hh ?? 9;

	const minuteOptions = useMemo(
		() => Array.from({ length: 12 }, (_, i) => i * 5),
		[]
	);

	const is12h = timeFormat === "12h";
	const ampm: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
	const hour12 = ((hour24 + 11) % 12) + 1;

	const setHourMinute = (nextHour24: number, nextMinute: number) => {
		onChange(toHHmm(nextHour24, nextMinute));
	};

	const clear = () => onChange(undefined);

	return (
		<div>
			<label className="block text-sm font-medium text-foreground mb-1">
				{label}
			</label>

			<div className="flex items-center gap-2">
				{is12h ? (
					<>
						<select
							value={hour12}
							onChange={(e) => {
								const h12 = Number(e.target.value);
								const base = ampm === "PM" ? 12 : 0;
								const h24 = (h12 % 12) + base;
								setHourMinute(h24, minute);
							}}
							className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary scrollbar-app"
						>
							{Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
								<option key={h} value={h}>
									{h}
								</option>
							))}
						</select>
						<span className="text-sm text-muted-foreground">:</span>
						<select
							value={minute}
							onChange={(e) => setHourMinute(hour24, Number(e.target.value))}
							className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary scrollbar-app"
						>
							{minuteOptions.map((m) => (
								<option key={m} value={m}>
									{String(m).padStart(2, "0")}
								</option>
							))}
						</select>
						<select
							value={ampm}
							onChange={(e) => {
								const next = e.target.value as "AM" | "PM";
								const h12 = hour12;
								const base = next === "PM" ? 12 : 0;
								const h24 = (h12 % 12) + base;
								setHourMinute(h24, minute);
							}}
							className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary scrollbar-app"
						>
							<option value="AM">AM</option>
							<option value="PM">PM</option>
						</select>
					</>
				) : (
					<>
						<select
							value={hour24}
							onChange={(e) => setHourMinute(Number(e.target.value), minute)}
							className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary scrollbar-app"
						>
							{Array.from({ length: 24 }, (_, i) => i).map((h) => (
								<option key={h} value={h}>
									{String(h).padStart(2, "0")}
								</option>
							))}
						</select>
						<span className="text-sm text-muted-foreground">:</span>
						<select
							value={minute}
							onChange={(e) => setHourMinute(hour24, Number(e.target.value))}
							className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary scrollbar-app"
						>
							{minuteOptions.map((m) => (
								<option key={m} value={m}>
									{String(m).padStart(2, "0")}
								</option>
							))}
						</select>
					</>
				)}

				<button
					type="button"
					onClick={clear}
					className="text-xs text-muted-foreground hover:text-foreground px-2 py-2"
				>
					Clear
				</button>
			</div>

			<div className="text-xs text-muted-foreground mt-1">
				Preview:{" "}
				<span className="text-foreground">
					{value ? formatTimeForDisplay(value, timeFormat) : "—"}
				</span>
			</div>
		</div>
	);
}

