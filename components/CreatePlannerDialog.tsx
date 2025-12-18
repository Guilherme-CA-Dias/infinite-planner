"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import {
	PLANNER_ICONS,
	getIconComponent,
	PlannerIconName,
} from "@/lib/iconHelper";

interface CreatePlannerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreate: (name: string, color: string, icon?: string) => Promise<void>;
}

const DEFAULT_COLORS = [
	"#3b82f6", // blue
	"#10b981", // emerald
	"#f59e0b", // amber
	"#ef4444", // red
	"#8b5cf6", // violet
	"#ec4899", // pink
	"#06b6d4", // cyan
	"#84cc16", // lime
];

export function CreatePlannerDialog({
	open,
	onOpenChange,
	onCreate,
}: CreatePlannerDialogProps) {
	const [name, setName] = useState("");
	const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0]);
	const [selectedIcon, setSelectedIcon] = useState<PlannerIconName>("Circle");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		setLoading(true);
		try {
			await onCreate(name.trim(), selectedColor, selectedIcon);
			setName("");
			setSelectedColor(DEFAULT_COLORS[0]);
			setSelectedIcon("Circle");
			onOpenChange(false);
		} catch (error) {
			console.error("Error creating planner:", error);
			alert("Failed to create planner. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
			<div className="bg-card rounded-xl shadow-elevated w-full max-w-md p-4 md:p-6 border border-border/50 mx-4 md:mx-0">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-bold text-foreground">Create Planner</h2>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => onOpenChange(false)}
					>
						<X className="w-4 h-4" />
					</Button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-foreground mb-1">
							Planner Name *
						</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
							placeholder="e.g., Work, Personal, Health"
							autoFocus
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Color
						</label>
						<div className="flex gap-2 flex-wrap">
							{DEFAULT_COLORS.map((color) => (
								<button
									key={color}
									type="button"
									onClick={() => setSelectedColor(color)}
									className={cn(
										"w-10 h-10 rounded-lg border-2 transition-all",
										selectedColor === color
											? "border-foreground scale-110"
											: "border-border hover:border-primary/50"
									)}
									style={{ backgroundColor: color }}
								/>
							))}
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Icon
						</label>
						<div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 border border-border/50 rounded-lg">
							{PLANNER_ICONS.map((iconName) => {
								const IconComponent = getIconComponent(iconName);
								return (
									<button
										key={iconName}
										type="button"
										onClick={() => setSelectedIcon(iconName)}
										className={cn(
											"w-10 h-10 rounded-lg border-2 transition-all flex items-center justify-center",
											selectedIcon === iconName
												? "border-primary bg-primary/10 scale-110"
												: "border-border hover:border-primary/50 hover:bg-accent/50"
										)}
										title={iconName}
									>
										<IconComponent
											className={cn(
												"w-5 h-5",
												selectedIcon === iconName
													? "text-primary"
													: "text-muted-foreground"
											)}
										/>
									</button>
								);
							})}
						</div>
					</div>

					<div className="flex gap-2 pt-4">
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
							className="flex-1"
							disabled={loading}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="hero"
							className="flex-1"
							disabled={loading || !name.trim()}
						>
							{loading ? "Creating..." : "Create Planner"}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
