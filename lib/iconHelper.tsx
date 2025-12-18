import * as LucideIcons from "lucide-react";
import { LucideIcon } from "lucide-react";

// Common icons for planners
export const PLANNER_ICONS = [
	"Briefcase",
	"Home",
	"Heart",
	"Book",
	"GraduationCap",
	"Dumbbell",
	"Utensils",
	"Plane",
	"Music",
	"Palette",
	"Code",
	"Calendar",
	"CheckCircle",
	"Star",
	"Target",
	"Zap",
	"Dog",
	"Circle",
] as const;

export type PlannerIconName = (typeof PLANNER_ICONS)[number];

export function getIconComponent(iconName: string | undefined): LucideIcon {
	const name = iconName || "Circle";
	const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[
		name
	];
	return IconComponent || LucideIcons.Circle;
}
