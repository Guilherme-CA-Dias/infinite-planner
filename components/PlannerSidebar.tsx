"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Edit2, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { getIconComponent } from "@/lib/iconHelper";

interface Planner {
	_id: string;
	name: string;
	color: string;
	icon?: string;
	isActive: boolean;
	shareWith?: Array<{
		userId: string;
		email: string;
		name: string;
	}>;
}

interface PlannerSidebarProps {
	userId: string;
	selectedPlanners: string[];
	onPlannerToggle: (plannerId: string) => void;
	onPlannerCreate: () => void;
	onPlannerEdit?: (planner: Planner) => void;
	onPlannerDelete?: (planner: Planner) => void;
	isMobileOpen?: boolean;
	onMobileClose?: () => void;
}

export function PlannerSidebar({
	userId,
	selectedPlanners,
	onPlannerToggle,
	onPlannerCreate,
	onPlannerEdit,
	onPlannerDelete,
	isMobileOpen: externalIsMobileOpen,
	onMobileClose,
}: PlannerSidebarProps) {
	const [planners, setPlanners] = useState<Planner[]>([]);
	const [sharedPlanners, setSharedPlanners] = useState<Planner[]>([]);
	// Load collapsed state from localStorage (after hydration to avoid SSR mismatch)
	const [isCollapsed, setIsCollapsed] = useState(true); // Default to collapsed
	
	// Load from localStorage after component mounts
	useEffect(() => {
		const saved = localStorage.getItem('plannerSidebarCollapsed');
		if (saved !== null) {
			setIsCollapsed(saved === 'true');
		}
	}, []);
	const [internalMobileOpen, setInternalMobileOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	
	// Use external state if provided, otherwise use internal state
	const isMobileOpen = externalIsMobileOpen !== undefined ? externalIsMobileOpen : internalMobileOpen;
	const handleMobileClose = () => {
		if (onMobileClose) {
			onMobileClose();
		} else {
			setInternalMobileOpen(false);
		}
	};

	// Save collapsed state to localStorage when it changes
	useEffect(() => {
		if (typeof window !== 'undefined') {
			localStorage.setItem('plannerSidebarCollapsed', String(isCollapsed));
		}
	}, [isCollapsed]);

	useEffect(() => {
		fetchPlanners();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId]);

	const fetchPlanners = async () => {
		try {
			const response = await fetch("/api/planners", {
				headers: {
					"x-user-id": userId,
				},
			});

			if (!response.ok) throw new Error("Failed to fetch planners");

			const data = await response.json();
			const fetchedPlanners = data.planners || [];
			const fetchedSharedPlanners = data.sharedPlanners || [];
			setPlanners(fetchedPlanners);
			setSharedPlanners(fetchedSharedPlanners);

			// Only auto-select all active planners if none are selected AND no saved preferences exist
			// Check localStorage to see if user has saved preferences
			if (selectedPlanners.length === 0 && fetchedPlanners.length > 0) {
				if (typeof window !== 'undefined') {
					const saved = localStorage.getItem('selectedPlanners');
					// If no saved preferences, auto-select active planners
					if (!saved || saved === '[]') {
						const activePlanners = fetchedPlanners.filter((p: Planner) => p.isActive);
						if (activePlanners.length > 0) {
							// Use setTimeout to avoid calling onPlannerToggle multiple times synchronously
							setTimeout(() => {
								activePlanners.forEach((planner: Planner) => {
									onPlannerToggle(planner._id);
								});
							}, 0);
						}
					}
				}
			}
		} catch (error) {
			console.error("Error fetching planners:", error);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="hidden md:block bg-card border-r border-border/50 w-16 transition-all duration-300">
				<div className="p-4 text-xs text-muted-foreground text-center">Loading...</div>
			</div>
		);
	}

	return (
		<>
			{/* Mobile Overlay */}
			{isMobileOpen && (
				<div
					className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
					onClick={handleMobileClose}
				/>
			)}

			{/* Desktop Sidebar - minimized when collapsed */}
			<div
				className={cn(
					"hidden md:flex bg-card border-r border-border/50 transition-all duration-300 flex-col overflow-hidden",
					isCollapsed ? "w-16" : "w-64",
					"relative h-full z-50"
				)}
			>
				{/* Desktop Header */}
				<div className="p-4 border-b border-border/50 flex items-center justify-between">
					{!isCollapsed && (
						<h2 className="text-lg font-bold text-foreground">Planners</h2>
					)}
					{isCollapsed && (
						<div className="w-full flex justify-center">
							<div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
						</div>
					)}
					<div className="flex items-center gap-2 ml-auto">
						{/* Desktop Collapse Button */}
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => {
								const newCollapsed = !isCollapsed;
								setIsCollapsed(newCollapsed);
							}}
						>
							{isCollapsed ? (
								<ChevronRight className="w-4 h-4" />
							) : (
								<ChevronLeft className="w-4 h-4" />
							)}
						</Button>
					</div>
				</div>

				{/* Desktop Planner List */}
				<div className="flex-1 overflow-y-auto p-2 space-y-1">
					{/* Owned Planners */}
					{planners.map((planner) => {
						const IconComponent = getIconComponent(planner.icon);
						return (
							<div
								key={planner._id}
								className={cn(
									"group relative w-full rounded-lg transition-all",
									"hover:bg-accent/50",
									selectedPlanners.includes(planner._id)
										? "bg-accent border-2 border-primary"
										: "bg-card border-2 border-transparent"
								)}
							>
								<button
									onClick={() => onPlannerToggle(planner._id)}
									className={cn(
										"w-full rounded-lg text-left transition-all flex items-center gap-3",
										isCollapsed ? "p-2 justify-center" : "p-3"
									)}
									title={isCollapsed ? planner.name : undefined}
								>
									{isCollapsed ? (
										<IconComponent
											className="w-5 h-5 flex-shrink-0"
											style={{ color: planner.color }}
										/>
									) : (
										<>
											<IconComponent
												className="w-4 h-4 flex-shrink-0"
												style={{ color: planner.color }}
											/>
											<span className="font-medium text-sm text-foreground flex-1 truncate">
												{planner.name}
											</span>
											{selectedPlanners.includes(planner._id) && (
												<div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
											)}
										</>
									)}
								</button>
								{!isCollapsed && (onPlannerEdit || onPlannerDelete) && (
									<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										{onPlannerEdit && (
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={(e) => {
													e.stopPropagation();
													onPlannerEdit(planner);
												}}
												className="h-7 w-7"
											>
												<Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
											</Button>
										)}
										{onPlannerDelete && (
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={(e) => {
													e.stopPropagation();
													onPlannerDelete(planner);
												}}
												className="h-7 w-7"
											>
												<Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
											</Button>
										)}
									</div>
								)}
							</div>
						);
					})}

					{/* Shared Planners Section - Desktop */}
					{sharedPlanners.length > 0 && (
						<>
							{!isCollapsed && (
								<>
									<div className="px-2 py-2">
										<div className="h-px bg-border/50" />
									</div>
									<div className="px-2 py-1">
										<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
											Shared with me
										</p>
									</div>
								</>
							)}
							{sharedPlanners.map((planner) => {
								const IconComponent = getIconComponent(planner.icon);
								return (
									<div
										key={planner._id}
										className={cn(
											"group relative w-full rounded-lg transition-all",
											"hover:bg-accent/50",
											selectedPlanners.includes(planner._id)
												? "bg-accent border-2 border-primary"
												: "bg-card border-2 border-transparent"
										)}
									>
										<button
											onClick={() => onPlannerToggle(planner._id)}
											className={cn(
												"w-full rounded-lg text-left transition-all flex items-center gap-3",
												isCollapsed ? "p-2 justify-center" : "p-3"
											)}
											title={isCollapsed ? planner.name : undefined}
										>
											{isCollapsed ? (
												<IconComponent
													className="w-5 h-5 flex-shrink-0"
													style={{ color: planner.color }}
												/>
											) : (
												<>
													<IconComponent
														className="w-4 h-4 flex-shrink-0"
														style={{ color: planner.color }}
													/>
													<span className="font-medium text-sm text-foreground flex-1 truncate">
														{planner.name}
													</span>
													{selectedPlanners.includes(planner._id) && (
														<div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
													)}
												</>
											)}
										</button>
									</div>
								);
							})}
						</>
					)}

					{planners.length === 0 && sharedPlanners.length === 0 && !isCollapsed && (
						<div className="text-center py-8 text-sm text-muted-foreground">
							<p>No planners yet</p>
							<p className="text-xs mt-1">Create one to get started</p>
						</div>
					)}
				</div>

				{/* Desktop Add Planner Button */}
				<div className="p-2 border-t border-border/50">
					<Button
						variant="ghost"
						className={cn(
							"w-full justify-start gap-2",
							isCollapsed && "justify-center px-2"
						)}
						onClick={onPlannerCreate}
						title={isCollapsed ? "New Planner" : undefined}
					>
						<Plus className="w-4 h-4" />
						{!isCollapsed && <span className="text-sm">New Planner</span>}
					</Button>
				</div>
			</div>

			{/* Mobile Dropdown - appears as floating box from burger menu */}
			{isMobileOpen && (
				<div
					className={cn(
						"md:hidden fixed top-14 left-3 z-50",
						"bg-card border border-border/50 rounded-xl shadow-elevated",
						"w-64 max-h-[calc(100vh-5rem)] overflow-hidden",
						"flex flex-col",
						"animate-fade-in"
					)}
				>
					{/* Mobile Header */}
					<div className="p-4 border-b border-border/50 flex items-center justify-between">
						<h2 className="text-lg font-bold text-foreground">Planners</h2>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={handleMobileClose}
						>
							<X className="w-4 h-4" />
						</Button>
					</div>

					{/* Mobile Planner List */}
					<div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[60vh]">
						{planners.map((planner) => {
							const IconComponent = getIconComponent(planner.icon);
							return (
								<div
									key={planner._id}
									className={cn(
										"group relative w-full rounded-lg transition-all",
										"hover:bg-accent/50",
										selectedPlanners.includes(planner._id)
											? "bg-accent border-2 border-primary"
											: "bg-card border-2 border-transparent"
									)}
								>
									<button
										onClick={() => {
											onPlannerToggle(planner._id);
											handleMobileClose();
										}}
										className={cn(
											"w-full p-3 rounded-lg text-left transition-all flex items-center gap-3"
										)}
									>
										<IconComponent
											className="w-4 h-4 flex-shrink-0"
											style={{ color: planner.color }}
										/>
										<span className="font-medium text-sm text-foreground flex-1 truncate">
											{planner.name}
										</span>
										{selectedPlanners.includes(planner._id) && (
											<div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
										)}
									</button>
									{(onPlannerEdit || onPlannerDelete) && (
										<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
											{onPlannerEdit && (
												<Button
													variant="ghost"
													size="icon-sm"
													onClick={(e) => {
														e.stopPropagation();
														onPlannerEdit(planner);
													}}
													className="h-7 w-7"
												>
													<Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
												</Button>
											)}
											{onPlannerDelete && (
												<Button
													variant="ghost"
													size="icon-sm"
													onClick={(e) => {
														e.stopPropagation();
														onPlannerDelete(planner);
													}}
													className="h-7 w-7"
												>
													<Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
												</Button>
											)}
										</div>
									)}
								</div>
							);
						})}

						{planners.length === 0 && sharedPlanners.length === 0 && (
							<div className="text-center py-8 text-sm text-muted-foreground">
								<p>No planners yet</p>
								<p className="text-xs mt-1">Create one to get started</p>
							</div>
						)}

						{/* Mobile Shared Planners Section */}
						{sharedPlanners.length > 0 && (
							<>
								<div className="px-2 py-2">
									<div className="h-px bg-border/50" />
								</div>
								<div className="px-2 py-1">
									<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Shared with me
									</p>
								</div>
								{sharedPlanners.map((planner) => {
									const IconComponent = getIconComponent(planner.icon);
									return (
										<div
											key={planner._id}
											className={cn(
												"group relative w-full rounded-lg transition-all",
												"hover:bg-accent/50",
												selectedPlanners.includes(planner._id)
													? "bg-accent border-2 border-primary"
													: "bg-card border-2 border-transparent"
											)}
										>
											<button
												onClick={() => {
													onPlannerToggle(planner._id);
													handleMobileClose();
												}}
												className={cn(
													"w-full p-3 rounded-lg text-left transition-all flex items-center gap-3"
												)}
											>
												<IconComponent
													className="w-4 h-4 flex-shrink-0"
													style={{ color: planner.color }}
												/>
												<span className="font-medium text-sm text-foreground flex-1 truncate">
													{planner.name}
												</span>
												{selectedPlanners.includes(planner._id) && (
													<div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
												)}
											</button>
											{/* Note: Shared planners are read-only, so no edit/delete buttons */}
										</div>
									);
								})}
							</>
						)}
					</div>

					{/* Mobile Add Planner Button */}
					<div className="p-2 border-t border-border/50">
						<Button
							variant="ghost"
							className="w-full justify-start gap-2"
							onClick={() => {
								onPlannerCreate();
								handleMobileClose();
							}}
						>
							<Plus className="w-4 h-4" />
							<span className="text-sm">New Planner</span>
						</Button>
					</div>
				</div>
			)}
		</>
	);
}

