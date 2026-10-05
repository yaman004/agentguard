import { Schema, model } from 'mongoose';

const notificationSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    type: { type: String, required: true }, // approval_created, security_alert, ...
    title: { type: String, required: true },
    body: { type: String, default: '' },
    link: { type: String }, // client route
    readBy: { type: [Schema.Types.ObjectId], default: [] },
  },
  { timestamps: true }
);
notificationSchema.index({ organizationId: 1, createdAt: -1 });

export const Notification = model('Notification', notificationSchema);
