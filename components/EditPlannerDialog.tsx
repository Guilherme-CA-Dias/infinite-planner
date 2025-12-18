"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, X as XIcon } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { PLANNER_ICONS, getIconComponent, PlannerIconName } from "@/lib/iconHelper";

interface SharedUser {
	userId: string;
	email: string;
	name: string;
}

interface EditPlannerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	planner: { _id: string; name: string; color: string; icon?: string; shareWith?: SharedUser[] } | null;
	onUpdate: (id: string, name: string, color: string, icon?: string) => Promise<void>;
	onDelete: (id: string) => Promise<void>;
	userId: string;
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

export function EditPlannerDialog({
	open,
	onOpenChange,
	planner,
	onUpdate,
	onDelete,
	userId,
}: EditPlannerDialogProps) {
	const [name, setName] = useState("");
	const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0]);
	const [selectedIcon, setSelectedIcon] = useState<PlannerIconName>("Circle");
	const [loading, setLoading] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [shareEmail, setShareEmail] = useState("");
	const [sharing, setSharing] = useState(false);
	const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
	const [unsharing, setUnsharing] = useState<string | null>(null);

	useEffect(() => {
		if (planner) {
			setName(planner.name);
			setSelectedColor(planner.color);
			setSelectedIcon((planner.icon as PlannerIconName) || "Circle");
			setSharedUsers(planner.shareWith || []);
		}
	}, [planner]);

	const handleShare = async (e: React.FormEvent) => {
		e.preventDefault();
		e.stopPropagation(); // Prevent event from bubbling to parent form
		if (!planner || !shareEmail.trim()) return;

		setSharing(true);
		try {
			const response = await fetch(`/api/planners/${planner._id}/share`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-user-id": userId,
				},
				body: JSON.stringify({ email: shareEmail.trim() }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to share planner");
			}

			const data = await response.json();
			setSharedUsers((prev) => [...prev, data.sharedWith]);
			setShareEmail("");
		} catch (error) {
			console.error("Error sharing planner:", error);
			alert(error instanceof Error ? error.message : "Failed to share planner. Please try again.");
		} finally {
			setSharing(false);
		}
	};

	const handleUnshare = async (shareUserId: string) => {
		if (!planner) return;

		setUnsharing(shareUserId);
		try {
			const response = await fetch(`/api/planners/${planner._id}/share?userId=${shareUserId}`, {
				method: "DELETE",
				headers: {
					"x-user-id": userId,
				},
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to unshare planner");
			}

			setSharedUsers((prev) => prev.filter((user) => user.userId !== shareUserId));
		} catch (error) {
			console.error("Error unsharing planner:", error);
			alert(error instanceof Error ? error.message : "Failed to unshare planner. Please try again.");
		} finally {
			setUnsharing(null);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim() || !planner) return;

		setLoading(true);
		try {
			await onUpdate(planner._id, name.trim(), selectedColor, selectedIcon);
			onOpenChange(false);
		} catch (error) {
			console.error("Error updating planner:", error);
			alert("Failed to update planner. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!planner) return;

		setLoading(true);
		try {
			await onDelete(planner._id);
			setShowDeleteConfirm(false);
			onOpenChange(false);
		} catch (error) {
			console.error("Error deleting planner:", error);
			alert("Failed to delete planner. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	if (!open || !planner) return null;

	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
			<div className="bg-card rounded-xl shadow-elevated w-full max-w-md p-4 md:p-6 border border-border/50 mx-4 md:mx-0">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-bold text-foreground">Edit Planner</h2>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => onOpenChange(false)}
					>
						<X className="w-4 h-4" />
					</Button>
				</div>

				{!showDeleteConfirm ? (
					<>
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
									variant="destructive"
									onClick={() => setShowDeleteConfirm(true)}
									className="flex-1"
									disabled={loading}
								>
									Delete
								</Button>
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
									{loading ? "Saving..." : "Save"}
								</Button>
							</div>
						</form>

						{/* Sharing Section - Outside main form to prevent conflicts */}
						<div className="border-t border-border/50 pt-4 mt-4">
							<label className="block text-sm font-medium text-foreground mb-2">
								Share with others
							</label>
							<form onSubmit={handleShare} className="flex gap-2 mb-3">
								<input
									type="email"
									value={shareEmail}
									onChange={(e) => setShareEmail(e.target.value)}
									placeholder="Enter email address"
									className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
									disabled={sharing}
								/>
								<Button
									type="submit"
									variant="hero"
									size="sm"
									disabled={sharing || !shareEmail.trim()}
								>
									<UserPlus className="w-4 h-4" />
								</Button>
							</form>
							{sharedUsers.length > 0 && (
								<div className="space-y-2">
									<p className="text-xs text-muted-foreground">Shared with:</p>
									{sharedUsers.map((user) => (
										<div
											key={user.userId}
											className="flex items-center justify-between p-2 bg-accent/50 rounded-lg"
										>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium text-foreground truncate">
													{user.name}
												</p>
												<p className="text-xs text-muted-foreground truncate">
													{user.email}
												</p>
											</div>
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={() => handleUnshare(user.userId)}
												disabled={unsharing === user.userId}
												className="ml-2 shrink-0"
											>
												{unsharing === user.userId ? (
													<div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
												) : (
													<XIcon className="w-4 h-4" />
												)}
											</Button>
										</div>
									))}
								</div>
							)}
						</div>
					</>
				) : (
					<div className="space-y-4">
						<p className="text-foreground">
							Are you sure you want to delete &ldquo;{planner.name}&rdquo;? This action cannot be undone.
						</p>
						<div className="flex gap-2 pt-4">
							<Button
								type="button"
								variant="ghost"
								onClick={() => setShowDeleteConfirm(false)}
								className="flex-1"
								disabled={loading}
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant="destructive"
								onClick={handleDelete}
								className="flex-1"
								disabled={loading}
							>
								{loading ? "Deleting..." : "Delete Planner"}
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

