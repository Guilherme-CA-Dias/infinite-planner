import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPlanner extends Document {
	userId: mongoose.Types.ObjectId;
	name: string;
	color: string;
	icon?: string;
	isActive: boolean;
	shareWith?: mongoose.Types.ObjectId[];
	createdAt: Date;
	updatedAt: Date;
}

const PlannerSchema: Schema = new Schema({
	userId: {
		type: Schema.Types.ObjectId,
		ref: "User",
		required: true,
		index: true,
	},
	name: {
		type: String,
		required: [true, "Planner name is required"],
		trim: true,
	},
	color: {
		type: String,
		required: true,
		default: "#3b82f6",
	},
	icon: {
		type: String,
		required: true,
		default: "Circle", // Default icon name from lucide-react
	},
	isActive: {
		type: Boolean,
		default: true,
	},
	shareWith: {
		type: [Schema.Types.ObjectId],
		ref: "User",
		default: [],
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
});

// Ensure unique planner names per user
PlannerSchema.index({ userId: 1, name: 1 }, { unique: true });

const Planner: Model<IPlanner> =
	mongoose.models.Planner || mongoose.model<IPlanner>("Planner", PlannerSchema);

export default Planner;
