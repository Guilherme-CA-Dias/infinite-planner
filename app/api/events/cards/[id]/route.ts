import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import EventCard from "@/models/EventCard";
import { z } from "zod";

// PATCH - Update a single event card
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const userId = request.headers.get("x-user-id");
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		const body = await request.json();
		const { updates } = z
			.object({
				updates: z.object({
					title: z.string().optional(),
					description: z.string().optional(),
					date: z.string().or(z.date()).optional(),
					color: z.string().optional(),
				}),
			})
			.parse(body);

		await connectDB();

		const card = await EventCard.findOne({ _id: id, userId });
		if (!card) {
			return NextResponse.json({ error: "Card not found" }, { status: 404 });
		}

		// Update card
		if (updates.title) card.title = updates.title;
		if (updates.description !== undefined)
			card.description = updates.description;
		if (updates.date) {
			// Parse date as UTC to avoid timezone issues
			const dateValue = updates.date;
			if (
				typeof dateValue === "string" &&
				dateValue.match(/^\d{4}-\d{2}-\d{2}$/)
			) {
				const [year, month, day] = dateValue.split("-").map(Number);
				card.date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
			} else {
				const dateObj = new Date(dateValue);
				card.date = new Date(
					Date.UTC(
						dateObj.getUTCFullYear(),
						dateObj.getUTCMonth(),
						dateObj.getUTCDate(),
						0,
						0,
						0,
						0
					)
				);
			}
		}
		if (updates.color) card.color = updates.color;
		card.updatedAt = new Date();

		await card.save();

		return NextResponse.json({ card }, { status: 200 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: error.issues[0]?.message || "Invalid input" },
				{ status: 400 }
			);
		}

		console.error("Error updating event card:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// DELETE - Delete a single event card
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const userId = request.headers.get("x-user-id");
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		await connectDB();

		const card = await EventCard.findOne({ _id: id, userId });
		if (!card) {
			return NextResponse.json({ error: "Card not found" }, { status: 404 });
		}

		await EventCard.deleteOne({ _id: id, userId });

		return NextResponse.json({ message: "Event deleted" }, { status: 200 });
	} catch (error) {
		console.error("Error deleting event card:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
