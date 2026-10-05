import { Schema, model } from 'mongoose';
import { APPROVAL_STATUSES, RISK_LEVELS } from '../types';

const approvalSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    actionId: { type: Schema.Types.ObjectId, ref: 'Action', required: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    requestedBy: { type: String, required: true }, // agent id that made the request
    riskScore: { type: Number, required: true },
    riskLevel: { type: String, enum: RISK_LEVELS, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: APPROVAL_STATUSES, default: 'PENDING' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date },
    decisionNote: { type: String, maxlength: 500 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);
approvalSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
approvalSchema.index({ actionId: 1 }, { unique: true });
approvalSchema.index({ status: 1, expiresAt: 1 }); // expiry sweeps

export const Approval = model('Approval', approvalSchema);
