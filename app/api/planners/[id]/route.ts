import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Planner from "@/models/Planner";
import { z } from "zod";

// PATCH - Update a planner
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
    const { name, color, icon, isActive } = z
      .object({
        name: z.string().min(1).optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(body);

    await connectDB();

    const planner = await Planner.findOne({ _id: id, userId });
    if (!planner) {
      return NextResponse.json(
        { error: "Planner not found" },
        { status: 404 }
      );
    }

    if (name) planner.name = name;
    if (color) planner.color = color;
    // Always update icon - use provided value or default to 'Circle'
    planner.icon = icon || 'Circle';
    if (isActive !== undefined) planner.isActive = isActive;
    planner.updatedAt = new Date();

    await planner.save();

    return NextResponse.json({ planner }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    console.error("Error updating planner:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a planner
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

    const planner = await Planner.findOne({ _id: id, userId });
    if (!planner) {
      return NextResponse.json(
        { error: "Planner not found" },
        { status: 404 }
      );
    }

    await Planner.deleteOne({ _id: id, userId });

    return NextResponse.json({ message: "Planner deleted" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting planner:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

