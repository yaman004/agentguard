import { Router } from 'express';
import { Types } from 'mongoose';
import { authOf } from '../middleware/auth';
import { Notification } from '../models/Notification';
import { asyncHandler } from '../utils/asyncHandler';
import { idParams } from '../utils/schemas';
import { validate } from '../middleware/validate';

const r = Router();
r.get('/', asyncHandler(async (req, res) => {
  const a = authOf(req);
  const items = await Notification.find({ organizationId: a.orgId }).sort({ createdAt: -1 }).limit(30).lean();
  const uid = String(a.userId);
  res.json({
    items: items.map((n) => ({ id: String(n._id), type: n.type, title: n.title, body: n.body, link: n.link, createdAt: n.createdAt, read: n.readBy.some((u) => String(u) === uid) })),
    unread: items.filter((n) => !n.readBy.some((u) => String(u) === uid)).length,
  });
}));
r.post('/read-all', asyncHandler(async (req, res) => {
  const a = authOf(req);
  await Notification.updateMany({ organizationId: a.orgId, readBy: { $ne: new Types.ObjectId(a.userId) } }, { $addToSet: { readBy: a.userId } });
  res.json({ ok: true });
}));
r.post('/:id/read', validate({ params: idParams }), asyncHandler(async (req, res) => {
  const a = authOf(req);
  await Notification.updateOne({ _id: req.params.id, organizationId: a.orgId }, { $addToSet: { readBy: a.userId } });
  res.json({ ok: true });
}));
export default r;
