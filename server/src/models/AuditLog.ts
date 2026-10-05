import { Schema, model } from 'mongoose';
import { DECISIONS, RISK_LEVELS } from '../types';

const auditSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    actorType: { type: String, enum: ['USER', 'AGENT', 'SYSTEM'], required: true },
    actorId: { type: String },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent' },
    action: { type: String, required: true }, // e.g. "agent.created", "action.evaluated"
    tool: { type: String },
    decision: { type: String, enum: DECISIONS },
    riskScore: { type: Number },
    riskLevel: { type: String, enum: RISK_LEVELS },
    ip: { type: String },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);
auditSchema.index({ organizationId: 1, timestamp: -1 });
auditSchema.index({ organizationId: 1, agentId: 1, timestamp: -1 });
auditSchema.index({ organizationId: 1, riskLevel: 1, timestamp: -1 });
auditSchema.index({ organizationId: 1, action: 1, timestamp: -1 });

// Append-only: block every mutation path at the model layer.
const blocked = () => { throw new Error('AuditLog is append-only'); };
for (const op of [
  'updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace',
  'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete',
] as const) {
  auditSchema.pre(op, blocked);
}
auditSchema.pre('save', function (next) {
  if (!this.isNew) return next(new Error('AuditLog is append-only'));
  next();
});

export const AuditLog = model('AuditLog', auditSchema);
