import { Schema, model } from 'mongoose';

const apiKeySchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    prefix: { type: String, required: true }, // public lookup handle
    hash: { type: String, required: true, select: false }, // sha256(full key); the key itself is never stored
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
apiKeySchema.index({ prefix: 1 }, { unique: true });
apiKeySchema.index({ organizationId: 1, agentId: 1, revokedAt: 1 });

export const ApiKey = model('ApiKey', apiKeySchema);
