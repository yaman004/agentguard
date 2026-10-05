import { Schema, model } from 'mongoose';
import { RISK_LEVELS, SECURITY_EVENT_TYPES, SECURITY_STATUSES } from '../types';

const securityEventSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    type: { type: String, enum: SECURITY_EVENT_TYPES, required: true },
    severity: { type: String, enum: RISK_LEVELS, required: true },
    status: { type: String, enum: SECURITY_STATUSES, default: 'OPEN' },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent' },
    actionId: { type: Schema.Types.ObjectId, ref: 'Action' },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: {
      type: [{ authorId: { type: Schema.Types.ObjectId, ref: 'User' }, text: { type: String, maxlength: 2000 }, createdAt: { type: Date, default: Date.now } }],
      default: [],
    },
    aiExplanation: { type: { text: String, model: String, generatedAt: Date }, _id: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
securityEventSchema.index({ organizationId: 1, severity: 1, status: 1, createdAt: -1 });
securityEventSchema.index({ organizationId: 1, agentId: 1, createdAt: -1 });
securityEventSchema.index({ organizationId: 1, type: 1, createdAt: -1 });

export const SecurityEvent = model('SecurityEvent', securityEventSchema);
