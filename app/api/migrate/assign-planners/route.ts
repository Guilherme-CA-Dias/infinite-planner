import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Planner from "@/models/Planner";
import EventCard from "@/models/EventCard";
import RecurringEvent from "@/models/RecurringEvent";

// POST - Migrate existing events without planners to an "Untitled" planner
export async function POST(request: NextRequest) {
	try {
		const userId = request.headers.get("x-user-id");
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await connectDB();

		// Find all events without a plannerId
		const eventsWithoutPlanner = await EventCard.find({
			userId,
			$or: [{ plannerId: { $exists: false } }, { plannerId: null }],
		});

		const recurringEventsWithoutPlanner = await RecurringEvent.find({
			userId,
			$or: [{ plannerId: { $exists: false } }, { plannerId: null }],
		});

		// If there are no events to migrate, return early
		if (
			eventsWithoutPlanner.length === 0 &&
			recurringEventsWithoutPlanner.length === 0
		) {
			return NextResponse.json(
				{
					message: "No events to migrate",
					migrated: false,
				},
				{ status: 200 }
			);
		}

		// Check if "Untitled" planner already exists for this user
		let untitledPlanner = await Planner.findOne({
			userId,
			name: "Untitled",
		});

		// Create "Untitled" planner if it doesn't exist
		if (!untitledPlanner) {
			untitledPlanner = await Planner.create({
				userId,
				name: "Untitled",
				color: "#6b7280", // Gray color for untitled
				icon: "Circle",
				isActive: true,
			});
		}

		// Update all event cards without plannerId
		const eventCardsUpdated = await EventCard.updateMany(
			{
				userId,
				$or: [{ plannerId: { $exists: false } }, { plannerId: null }],
			},
			{
				$set: { plannerId: untitledPlanner._id },
			}
		);

		// Update all recurring events without plannerId
		const recurringEventsUpdated = await RecurringEvent.updateMany(
			{
				userId,
				$or: [{ plannerId: { $exists: false } }, { plannerId: null }],
			},
			{
				$set: { plannerId: untitledPlanner._id },
			}
		);

		return NextResponse.json(
			{
				message: "Migration completed",
				migrated: true,
				planner: {
					_id: untitledPlanner._id,
					name: untitledPlanner.name,
				},
				eventCardsUpdated: eventCardsUpdated.modifiedCount,
				recurringEventsUpdated: recurringEventsUpdated.modifiedCount,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error("Error migrating events:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
