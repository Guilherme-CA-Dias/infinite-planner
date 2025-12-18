"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "./ui/button";

interface EventMenuProps {
	event: {
		id: string;
		title: string;
		recurringEventId?: string;
	};
	onEdit: () => void;
	onDelete: () => void;
}

export function EventMenu({ onEdit, onDelete }: EventMenuProps) {
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const [menuPosition, setMenuPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setIsOpen(false);
				setMenuPosition(null);
			}
		};

		if (isOpen) {
			// Calculate menu position based on button position
			if (buttonRef.current) {
				const rect = buttonRef.current.getBoundingClientRect();
				setMenuPosition({
					top: rect.bottom + window.scrollY,
					left: rect.right + window.scrollX - 192, // 192px = w-48 (menu width)
				});
			}
			document.addEventListener("mousedown", handleClickOutside);
			return () =>
				document.removeEventListener("mousedown", handleClickOutside);
		} else {
			setMenuPosition(null);
		}
	}, [isOpen]);

	useEffect(() => {
		// Update position on scroll/resize when menu is open
		if (isOpen && buttonRef.current) {
			const updatePosition = () => {
				const rect = buttonRef.current!.getBoundingClientRect();
				setMenuPosition({
					top: rect.bottom + window.scrollY,
					left: rect.right + window.scrollX - 192,
				});
			};

			window.addEventListener("scroll", updatePosition, true);
			window.addEventListener("resize", updatePosition);

			return () => {
				window.removeEventListener("scroll", updatePosition, true);
				window.removeEventListener("resize", updatePosition);
			};
		}
	}, [isOpen]);

	return (
		<>
			<div className="relative">
				<Button
					ref={buttonRef}
					variant="ghost"
					size="icon-sm"
					className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity touch-manipulation"
					onClick={(e) => {
						e.stopPropagation();
						setIsOpen(!isOpen);
					}}
				>
					<MoreHorizontal className="w-4 h-4 text-muted-foreground" />
				</Button>
			</div>

			{isOpen &&
				menuPosition &&
				typeof window !== "undefined" &&
				createPortal(
					<div
						ref={menuRef}
						className="fixed z-[9999] w-48 bg-card border border-border rounded-lg shadow-elevated overflow-hidden"
						style={{
							top: `${menuPosition.top}px`,
							left: `${menuPosition.left}px`,
						}}
					>
						<div className="py-1">
							<button
								onClick={(e) => {
									e.stopPropagation();
									setIsOpen(false);
									onEdit();
								}}
								className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2 transition-colors"
							>
								<Edit className="w-4 h-4" />
								Modify
							</button>
							<button
								onClick={(e) => {
									e.stopPropagation();
									setIsOpen(false);
									onDelete();
								}}
								className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-accent flex items-center gap-2 transition-colors"
							>
								<Trash2 className="w-4 h-4" />
								Delete
							</button>
						</div>
					</div>,
					document.body
				)}
		</>
	);
}
