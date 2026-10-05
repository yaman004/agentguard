import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    passwordHash: { type: String, required: true, select: false },
    // Bumped on logout / password change to invalidate every outstanding refresh token.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const User = model('User', userSchema);
