import { Schema, model } from 'mongoose';
import { POLICY_EFFECTS } from '../types';

const policySchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 500 },
    actionType: { type: String, required: true, trim: true }, // exact action type or "*"
    tool: { type: String, trim: true }, // optional: restrict to one tool
    effect: { type: String, enum: POLICY_EFFECTS, required: true },
    conditions: {
      // Fires when parameters.amount > maxAmount
      maxAmount: { type: Number, min: 0 },
      // Fires when the calling agent is NOT in this list (allow-list style restriction)
      allowedAgentIds: { type: [String], default: undefined },
    },
    enabled: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
policySchema.index({ organizationId: 1, enabled: 1, actionType: 1 });

export const Policy = model('Policy', policySchema);
