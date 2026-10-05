import { Schema, model } from 'mongoose';
import { DECISIONS } from '../types';

const evaluationSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 500 },
    actionType: { type: String, required: true },
    tool: { type: String, required: true },
    parameters: { type: Schema.Types.Mixed, default: {} },
    expectedDecision: { type: String, enum: DECISIONS, required: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent' }, // pin to an agent; otherwise the run's agent is used
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
evaluationSchema.index({ organizationId: 1, createdAt: -1 });

export const Evaluation = model('Evaluation', evaluationSchema);
