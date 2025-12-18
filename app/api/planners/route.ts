import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Planner from "@/models/Planner";
import User from "@/models/User";
import { z } from "zod";
import mongoose from "mongoose";

const plannerSchema = z.object({
	name: z.string().min(1, "Planner name is required"),
	color: z.string().optional(),
	icon: z.string().optional(),
	isActive: z.boolean().optional(),
});

// GET - Fetch all planners for a user (owned and shared)
export async function GET(request: NextRequest) {
	try {
		const userId = request.headers.get("x-user-id");
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await connectDB();

		// Fetch planners owned by the user
		const ownedPlanners = await Planner.find({
			userId: new mongoose.Types.ObjectId(userId),
		}).sort({ createdAt: 1 });

		// Fetch planners shared with the user
		// Convert userId string to ObjectId for proper query matching
		// For array fields, MongoDB automatically checks if the value is in the array
		const userObjectId = new mongoose.Types.ObjectId(userId);
		const sharedPlannersRaw = await Planner.find({
			shareWith: userObjectId,
		}).sort({ createdAt: 1 });

		// Populate shareWith with user details for owned planners
		const ownedPlannersWithShares = await Promise.all(
			ownedPlanners.map(async (planner) => {
				if (planner.shareWith && planner.shareWith.length > 0) {
					const sharedUsers = await User.find({
						_id: { $in: planner.shareWith },
					}).select("email name");
					return {
						...planner.toObject(),
						shareWith: sharedUsers.map(
							(user: {
								_id: { toString: () => string };
								email: string;
								name: string;
							}) => ({
								userId: user._id.toString(),
								email: user.email,
								name: user.name,
							})
						),
					};
				}
				return planner.toObject();
			})
		);

		// For shared planners, we don't need to populate shareWith
		const sharedPlanners = sharedPlannersRaw.map((p) => p.toObject());

		return NextResponse.json(
			{ planners: ownedPlannersWithShares, sharedPlanners },
			{ status: 200 }
		);
	} catch (error) {
		console.error("Error fetching planners:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// POST - Create a new planner
export async function POST(request: NextRequest) {
	try {
		const userId = request.headers.get("x-user-id");
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const data = plannerSchema.parse(body);

		await connectDB();

		// Default colors if not provided
		const defaultColors = [
			"#3b82f6", // blue
			"#10b981", // emerald
			"#f59e0b", // amber
			"#ef4444", // red
			"#8b5cf6", // violet
			"#ec4899", // pink
			"#06b6d4", // cyan
			"#84cc16", // lime
		];

		// Get existing planners to assign a color
		const existingPlanners = await Planner.find({ userId });
		const usedColors = new Set(existingPlanners.map((p) => p.color));
		const availableColor =
			data.color ||
			defaultColors.find((c) => !usedColors.has(c)) ||
			defaultColors[0];

		// Ensure icon is always set (default to 'Circle' if not provided)
		const iconValue = data.icon?.trim() || "Circle";

		// Create planner with all fields including icon
		const planner = await Planner.create({
			userId,
			name: data.name,
			color: availableColor,
			icon: iconValue,
			isActive: data.isActive !== undefined ? data.isActive : true,
		});

		return NextResponse.json({ planner }, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: error.issues[0]?.message || "Invalid input" },
				{ status: 400 }
			);
		}

		// Handle duplicate key error
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === 11000
		) {
			return NextResponse.json(
				{ error: "A planner with this name already exists" },
				{ status: 409 }
			);
		}

		console.error("Error creating planner:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
