import { Schema, model } from 'mongoose';
import { ACTION_STATUSES, DECISIONS, RISK_LEVELS } from '../types';

const actionSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    actionType: { type: String, required: true },
    tool: { type: String, required: true },
    parameters: { type: Schema.Types.Mixed, default: {} },
    userContext: { type: Schema.Types.Mixed, default: {} },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: { type: String, enum: RISK_LEVELS, required: true },
    riskBreakdown: { type: [{ factor: String, points: Number, _id: false }], default: [] },
    policyDecision: { type: String, enum: DECISIONS, required: true },
    decisionReason: { type: String, default: '' },
    matchedPolicies: {
      type: [{ policyId: String, name: String, effect: String, reason: String, _id: false }],
      default: [],
    },
    status: { type: String, enum: ACTION_STATUSES, required: true },
    result: { type: Schema.Types.Mixed },
    approvalId: { type: Schema.Types.ObjectId, ref: 'Approval' },
    dlp: { type: { redacted: Boolean, findings: [{ type: String, count: Number, _id: false }] }, _id: false },
    aiAnalysis: { type: { reasoning: String, model: String, generatedAt: Date }, _id: false },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
actionSchema.index({ organizationId: 1, timestamp: -1 });
actionSchema.index({ organizationId: 1, agentId: 1, timestamp: -1 });
actionSchema.index({ organizationId: 1, riskLevel: 1, timestamp: -1 });
actionSchema.index({ organizationId: 1, status: 1, timestamp: -1 });
actionSchema.index({ organizationId: 1, actionType: 1, timestamp: -1 });

export const Action = model('Action', actionSchema);
