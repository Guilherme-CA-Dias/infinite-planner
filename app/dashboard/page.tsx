"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Header } from "@/components/Header";
import CalendarView from "@/components/CalendarView";
import CreateEventModal from "@/components/CreateEventModal";
import { PlannerSidebar } from "@/components/PlannerSidebar";
import { CreatePlannerDialog } from "@/components/CreatePlannerDialog";
import { EditPlannerDialog } from "@/components/EditPlannerDialog";
import { DeletePlannerDialog } from "@/components/DeletePlannerDialog";

export default function DashboardPage() {
	const router = useRouter();
	const [userId, setUserId] = useState<string | null>(null);
	const [view] = useState<"kanban" | "calendar">("kanban");
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [addEventDialogOpen, setAddEventDialogOpen] = useState(false);
	const [createPlannerDialogOpen, setCreatePlannerDialogOpen] = useState(false);
	const [editPlannerDialogOpen, setEditPlannerDialogOpen] = useState(false);
	const [editingPlanner, setEditingPlanner] = useState<{
		_id: string;
		name: string;
		color: string;
		icon?: string;
	} | null>(null);
	const [deletePlannerDialogOpen, setDeletePlannerDialogOpen] = useState(false);
	const [deletingPlanner, setDeletingPlanner] = useState<{
		_id: string;
		name: string;
	} | null>(null);
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [refreshPlannersKey, setRefreshPlannersKey] = useState(0);
	// Load selected planners from localStorage (after hydration to avoid SSR mismatch)
	const [selectedPlanners, setSelectedPlanners] = useState<string[]>([]);

	// Load from localStorage after component mounts
	useEffect(() => {
		const saved = localStorage.getItem("selectedPlanners");
		if (saved) {
			try {
				setSelectedPlanners(JSON.parse(saved));
			} catch {
				// Ignore parse errors
			}
		}
	}, []);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const todayRef = useRef<{ scrollToToday: () => void }>({
		scrollToToday: () => {},
	});

	useEffect(() => {
		const storedUserId = localStorage.getItem("userId");
		if (!storedUserId) {
			router.push("/login");
			return;
		}
		// Use setTimeout to avoid synchronous setState in effect
		setTimeout(() => {
			setUserId(storedUserId);
			setLoading(false);
			// Run migration check after user is set
			checkAndMigrateEvents(storedUserId);
		}, 0);
	}, [router]);

	const checkAndMigrateEvents = async (userId: string) => {
		try {
			const response = await fetch("/api/migrate/assign-planners", {
				method: "POST",
				headers: {
					"x-user-id": userId,
				},
			});
			if (response.ok) {
				const data = await response.json();
				if (data.migrated) {
					console.log(
						`Migration completed: ${data.eventCardsUpdated} event cards and ${data.recurringEventsUpdated} recurring events assigned to "${data.planner.name}" planner`
					);
					// Refresh planners to show the new "Untitled" planner
					setRefreshPlannersKey((prev) => prev + 1);
				}
			}
		} catch (error) {
			console.error("Error checking migration:", error);
		}
	};

	const handleTodayClick = () => {
		if (todayRef.current?.scrollToToday) {
			todayRef.current.scrollToToday();
		}
	};

	const handlePlannerToggle = (plannerId: string) => {
		setSelectedPlanners((prev) => {
			const updated = prev.includes(plannerId)
				? prev.filter((id) => id !== plannerId)
				: [...prev, plannerId];
			// Save to localStorage
			if (typeof window !== "undefined") {
				localStorage.setItem("selectedPlanners", JSON.stringify(updated));
			}
			return updated;
		});
	};

	const handleCreatePlanner = async (
		name: string,
		color: string,
		icon?: string
	) => {
		if (!userId) return;

		// Ensure icon is always included
		const iconValue = icon || "Circle";
		const requestBody = {
			name,
			color,
			icon: iconValue,
		};

		console.log("Creating planner with:", JSON.stringify(requestBody, null, 2));

		const response = await fetch("/api/planners", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-user-id": userId,
			},
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || "Failed to create planner");
		}

		// Auto-select the newly created planner
		const data = await response.json();
		setSelectedPlanners((prev) => {
			const updated = [...prev, data.planner._id];
			// Save to localStorage
			if (typeof window !== "undefined") {
				localStorage.setItem("selectedPlanners", JSON.stringify(updated));
			}
			return updated;
		});

		// Trigger planner list refresh
		setRefreshPlannersKey((prev) => prev + 1);
	};

	const handleUpdatePlanner = async (
		id: string,
		name: string,
		color: string,
		icon?: string
	) => {
		if (!userId) return;

		// Ensure icon is always included in the request
		const iconValue = icon || "Circle";

		const response = await fetch(`/api/planners/${id}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				"x-user-id": userId,
			},
			body: JSON.stringify({ name, color, icon: iconValue }),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || "Failed to update planner");
		}

		// Trigger planner list refresh
		setRefreshPlannersKey((prev) => prev + 1);
	};

	const handleDeletePlannerClick = (planner: {
		_id: string;
		name: string;
		color: string;
		icon?: string;
	}) => {
		setDeletingPlanner({ _id: planner._id, name: planner.name });
		setDeletePlannerDialogOpen(true);
	};

	const handleDeletePlannerConfirm = async () => {
		if (!userId || !deletingPlanner) return;

		setDeleteLoading(true);
		try {
			const response = await fetch(`/api/planners/${deletingPlanner._id}`, {
				method: "DELETE",
				headers: {
					"x-user-id": userId,
				},
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to delete planner");
			}

			// Remove from selected planners if it was selected
			setSelectedPlanners((prev) => {
				const updated = prev.filter((pid) => pid !== deletingPlanner._id);
				if (typeof window !== "undefined") {
					localStorage.setItem("selectedPlanners", JSON.stringify(updated));
				}
				return updated;
			});

			// Trigger planner list refresh
			setRefreshPlannersKey((prev) => prev + 1);
			setDeletePlannerDialogOpen(false);
			setDeletingPlanner(null);
		} catch (error) {
			console.error("Error deleting planner:", error);
			throw error;
		} finally {
			setDeleteLoading(false);
		}
	};

	if (loading || !userId) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="text-lg text-gray-600">Loading...</div>
			</div>
		);
	}

	return (
		<div className="h-screen flex flex-col bg-background">
			<Header
				onAddEvent={() => setAddEventDialogOpen(true)}
				onTodayClick={handleTodayClick}
				onMenuClick={() => setIsMobileMenuOpen(true)}
			/>

			{/* Main Content with Sidebar */}
			<div className="flex-1 flex overflow-hidden">
				{/* Planner Sidebar */}
				{userId && (
					<PlannerSidebar
						key={refreshPlannersKey}
						userId={userId}
						selectedPlanners={selectedPlanners}
						onPlannerToggle={handlePlannerToggle}
						onPlannerCreate={() => setCreatePlannerDialogOpen(true)}
						onPlannerEdit={(planner) => {
							setEditingPlanner(planner);
							setEditPlannerDialogOpen(true);
						}}
						onPlannerDelete={handleDeletePlannerClick}
						isMobileOpen={isMobileMenuOpen}
						onMobileClose={() => setIsMobileMenuOpen(false)}
					/>
				)}

				{/* Main Content */}
				<main className="flex-1 overflow-hidden">
					{view === "kanban" ? (
						<KanbanBoard
							todayRef={todayRef}
							onAddEventClick={() => setAddEventDialogOpen(true)}
							addEventDialogOpen={addEventDialogOpen}
							setAddEventDialogOpen={setAddEventDialogOpen}
							userId={userId}
							selectedPlanners={selectedPlanners}
						/>
					) : (
						<div className="h-full overflow-y-auto p-6">
							<CalendarView userId={userId} />
						</div>
					)}
				</main>
			</div>

			{/* Create Recurring Event Modal */}
			<CreateEventModal
				isOpen={showCreateModal}
				onClose={() => setShowCreateModal(false)}
				userId={userId}
				onSuccess={() => {
					window.location.reload();
				}}
			/>

			{/* Create Planner Dialog */}
			<CreatePlannerDialog
				open={createPlannerDialogOpen}
				onOpenChange={setCreatePlannerDialogOpen}
				onCreate={handleCreatePlanner}
			/>

			{/* Edit Planner Dialog */}
			{editingPlanner && userId && (
				<EditPlannerDialog
					open={editPlannerDialogOpen}
					onOpenChange={setEditPlannerDialogOpen}
					planner={editingPlanner}
					onUpdate={handleUpdatePlanner}
					onDelete={async (id: string) => {
						// When deleting from edit dialog, open delete confirmation
						const planner = editingPlanner;
						if (planner && planner._id === id) {
							setEditPlannerDialogOpen(false);
							setDeletingPlanner({ _id: planner._id, name: planner.name });
							setDeletePlannerDialogOpen(true);
						}
					}}
					userId={userId}
				/>
			)}

			{/* Delete Planner Dialog */}
			<DeletePlannerDialog
				open={deletePlannerDialogOpen}
				onOpenChange={setDeletePlannerDialogOpen}
				plannerName={deletingPlanner?.name || ""}
				onConfirm={handleDeletePlannerConfirm}
				loading={deleteLoading}
			/>
		</div>
	);
}
