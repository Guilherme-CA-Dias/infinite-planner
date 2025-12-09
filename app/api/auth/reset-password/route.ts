import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  userId: z.string(),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, newPassword } = resetPasswordSchema.parse(body);

    await connectDB();

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if password is actually "reset"
    if (user.password !== 'reset') {
      return NextResponse.json(
        { error: 'Password reset not required' },
        { status: 400 }
      );
    }

    // Set new password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    return NextResponse.json(
      {
        message: 'Password reset successful',
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

