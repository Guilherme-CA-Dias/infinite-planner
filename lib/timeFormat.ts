export type TimeFormat = "12h" | "24h";

export const TIME_FORMAT_STORAGE_KEY = "timeFormat";

export function getStoredTimeFormat(): TimeFormat {
	if (typeof window === "undefined") return "24h";
	const raw = window.localStorage.getItem(TIME_FORMAT_STORAGE_KEY);
	return raw === "12h" || raw === "24h" ? raw : "24h";
}

export function setStoredTimeFormat(format: TimeFormat) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(TIME_FORMAT_STORAGE_KEY, format);
	window.dispatchEvent(new Event("timeFormatChanged"));
}

export function formatTimeForDisplay(time24: string, format: TimeFormat) {
	if (!/^\d{2}:\d{2}$/.test(time24)) return time24;
	if (format === "24h") return time24;

	const [hhRaw, mmRaw] = time24.split(":");
	const hh = Number(hhRaw);
	const mm = Number(mmRaw);
	if (!Number.isFinite(hh) || !Number.isFinite(mm)) return time24;

	const suffix = hh >= 12 ? "PM" : "AM";
	const h12 = ((hh + 11) % 12) + 1;
	return `${h12}:${String(mm).padStart(2, "0")} ${suffix}`;
}

export function formatHourLabel(hour24: number, format: TimeFormat) {
	if (format === "24h") return `${String(hour24).padStart(2, "0")}:00`;

	const suffix = hour24 >= 12 ? "PM" : "AM";
	const h12 = ((hour24 + 11) % 12) + 1;
	return `${h12}${suffix}`;
}

