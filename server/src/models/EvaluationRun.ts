import { Schema, model } from 'mongoose';
import { DECISIONS } from '../types';

const runSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    triggeredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['RUNNING', 'COMPLETED', 'FAILED'], default: 'RUNNING' },
    model: { type: String, default: 'deterministic-policy-engine' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    results: {
      type: [{
        caseId: String, name: String, agentName: String,
        expected: { type: String, enum: DECISIONS }, actual: { type: String, enum: DECISIONS },
        passed: Boolean, unsafe: Boolean, riskScore: Number, latencyMs: Number, reason: String, _id: false,
      }],
      default: [],
    },
    summary: {
      type: { total: Number, passed: Number, failed: Number, unsafe: Number, complianceRate: Number, avgLatencyMs: Number },
      _id: false,
    },
    error: { type: String },
  },
  { timestamps: true }
);
runSchema.index({ organizationId: 1, agentId: 1, createdAt: -1 });
runSchema.index({ organizationId: 1, createdAt: -1 });

export const EvaluationRun = model('EvaluationRun', runSchema);
