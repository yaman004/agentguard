import { Schema, model } from 'mongoose';
import { ROLES } from '../types';

const membershipSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    role: { type: String, enum: ROLES, required: true },
  },
  { timestamps: true }
);
membershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
membershipSchema.index({ organizationId: 1, role: 1 });

export const Membership = model('Membership', membershipSchema);
