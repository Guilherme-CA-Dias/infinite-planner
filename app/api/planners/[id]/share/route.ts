import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Planner from "@/models/Planner";
import User from "@/models/User";
import { z } from "zod";

// POST - Share a planner with a user by email
export async function POST(
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
		const { email } = z
			.object({
				email: z.string().email("Invalid email address"),
			})
			.parse(body);

		await connectDB();

		// Find the planner (must be owned by the user)
		const planner = await Planner.findOne({ _id: id, userId });
		if (!planner) {
			return NextResponse.json({ error: "Planner not found" }, { status: 404 });
		}

		// Find the user by email
		const userToShare = await User.findOne({ email: email.toLowerCase() });
		if (!userToShare) {
			return NextResponse.json(
				{ error: "User with this email not found" },
				{ status: 404 }
			);
		}

		// Don't allow sharing with yourself
		if (userToShare._id.toString() === userId) {
			return NextResponse.json(
				{ error: "Cannot share planner with yourself" },
				{ status: 400 }
			);
		}

		// Check if already shared
		const shareWithArray = planner.shareWith || [];
		if (
			shareWithArray.some((id) => id.toString() === userToShare._id.toString())
		) {
			return NextResponse.json(
				{ error: "Planner already shared with this user" },
				{ status: 400 }
			);
		}

		// Add user to shareWith array using findByIdAndUpdate with $addToSet
		// This is more reliable than modifying the document directly
		// Ensure userToShare._id is properly formatted as ObjectId
		const userToShareId = userToShare._id;

		// Initialize shareWith to empty array if it doesn't exist, then add the user
		// First, ensure the field exists
		if (!planner.shareWith || !Array.isArray(planner.shareWith)) {
			await Planner.findByIdAndUpdate(
				planner._id,
				{
					$set: { shareWith: [] },
				},
				{ new: false }
			);
		}

		// Now add the user to the shareWith array
		const finalResult = await Planner.findByIdAndUpdate(
			planner._id,
			{
				$addToSet: { shareWith: userToShareId },
				$set: { updatedAt: new Date() },
			},
			{ new: true } // Return the updated document
		);

		if (!finalResult) {
			console.error("findByIdAndUpdate returned null");
			return NextResponse.json(
				{ error: "Failed to update planner" },
				{ status: 500 }
			);
		}

		return NextResponse.json(
			{
				message: "Planner shared successfully",
				planner: finalResult.toObject(),
				sharedWith: {
					userId: userToShare._id.toString(),
					email: userToShare.email,
					name: userToShare.name,
				},
			},
			{ status: 200 }
		);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: error.issues[0]?.message || "Invalid input" },
				{ status: 400 }
			);
		}

		console.error("Error sharing planner:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// DELETE - Unshare a planner with a user
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
		const { searchParams } = new URL(request.url);
		const shareUserId = searchParams.get("userId");

		if (!shareUserId) {
			return NextResponse.json(
				{ error: "userId parameter is required" },
				{ status: 400 }
			);
		}

		await connectDB();

		// Find the planner (must be owned by the user)
		const planner = await Planner.findOne({ _id: id, userId });
		if (!planner) {
			return NextResponse.json({ error: "Planner not found" }, { status: 404 });
		}

		// Remove user from shareWith array
		const shareWithArray = planner.shareWith || [];
		planner.shareWith = shareWithArray.filter(
			(id) => id.toString() !== shareUserId
		);
		planner.updatedAt = new Date();
		await planner.save();

		return NextResponse.json(
			{ message: "Planner unshared successfully", planner },
			{ status: 200 }
		);
	} catch (error) {
		console.error("Error unsharing planner:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
