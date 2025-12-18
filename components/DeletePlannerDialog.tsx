"use client";

import { X } from "lucide-react";
import { Button } from "./ui/button";

interface DeletePlannerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	plannerName: string;
	onConfirm: () => Promise<void>;
	loading?: boolean;
}

export function DeletePlannerDialog({
	open,
	onOpenChange,
	plannerName,
	onConfirm,
	loading = false,
}: DeletePlannerDialogProps) {
	const handleConfirm = async () => {
		try {
			await onConfirm();
			onOpenChange(false);
		} catch (error) {
			console.error("Error deleting planner:", error);
			alert("Failed to delete planner. Please try again.");
		}
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
			<div className="bg-card rounded-xl shadow-elevated w-full max-w-md p-4 md:p-6 border border-border/50 mx-4 md:mx-0">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-bold text-foreground">Delete Planner</h2>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => onOpenChange(false)}
						disabled={loading}
					>
						<X className="w-4 h-4" />
					</Button>
				</div>

				<div className="space-y-4">
					<p className="text-foreground">
						Are you sure you want to delete <strong>&ldquo;{plannerName}&rdquo;</strong>? This action
						cannot be undone and all events associated with this planner will remain but
						will no longer be filtered by this planner.
					</p>

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
							type="button"
							variant="destructive"
							onClick={handleConfirm}
							className="flex-1"
							disabled={loading}
						>
							{loading ? "Deleting..." : "Delete Planner"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

