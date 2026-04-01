"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	getStoredTimeFormat,
	setStoredTimeFormat,
	type TimeFormat,
} from "@/lib/timeFormat";

interface SettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
	const [timeFormat, setTimeFormat] = useState<TimeFormat>("24h");

	useEffect(() => {
		if (!open) return;
		setTimeFormat(getStoredTimeFormat());
	}, [open]);

	const save = () => {
		setStoredTimeFormat(timeFormat);
		onOpenChange(false);
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
			<div className="bg-card rounded-xl shadow-elevated w-full max-w-md p-4 md:p-6 border border-border/50 max-h-[90vh] overflow-y-auto scrollbar-app mx-4 md:mx-0">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-bold text-foreground">Settings</h2>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => onOpenChange(false)}
					>
						<X className="w-4 h-4" />
					</Button>
				</div>

				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Time format
						</label>
						<div className="grid grid-cols-2 gap-2">
							<button
								type="button"
								onClick={() => setTimeFormat("12h")}
								className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
									timeFormat === "12h"
										? "border-primary bg-primary/10 text-foreground"
										: "border-border bg-background text-muted-foreground hover:text-foreground"
								}`}
							>
								12-hour
								<div className="text-xs font-normal mt-0.5 text-muted-foreground">
									2:30 PM
								</div>
							</button>
							<button
								type="button"
								onClick={() => setTimeFormat("24h")}
								className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
									timeFormat === "24h"
										? "border-primary bg-primary/10 text-foreground"
										: "border-border bg-background text-muted-foreground hover:text-foreground"
								}`}
							>
								24-hour
								<div className="text-xs font-normal mt-0.5 text-muted-foreground">
									14:30
								</div>
							</button>
						</div>
					</div>
				</div>

				<div className="flex gap-2 pt-6">
					<Button
						type="button"
						variant="ghost"
						onClick={() => onOpenChange(false)}
						className="flex-1"
					>
						Cancel
					</Button>
					<Button type="button" variant="hero" onClick={save} className="flex-1">
						Save
					</Button>
				</div>
			</div>
		</div>
	);
}

