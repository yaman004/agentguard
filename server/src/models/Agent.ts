import { Schema, model } from 'mongoose';
import { AGENT_STATUSES, ENVIRONMENTS, RISK_LEVELS } from '../types';

const agentSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', maxlength: 500 },
    status: { type: String, enum: AGENT_STATUSES, default: 'ACTIVE' },
    environment: { type: String, enum: ENVIRONMENTS, default: 'DEVELOPMENT' },
    riskLevel: { type: String, enum: RISK_LEVELS, default: 'LOW' },
    // Action types the agent may request, e.g. "refund_customer", "get_customer", or "*".
    permissions: { type: [String], default: [] },
    // Tools the agent may call, e.g. "payment_api", "crm_api", or "*".
    allowedTools: { type: [String], default: [] },
    lastSeenAt: { type: Date },
  },
  { timestamps: true }
);
agentSchema.index({ organizationId: 1, name: 1 }, { unique: true });
agentSchema.index({ organizationId: 1, status: 1 });
agentSchema.index({ organizationId: 1, riskLevel: 1 });
agentSchema.index({ organizationId: 1, lastSeenAt: -1 });

export const Agent = model('Agent', agentSchema);
