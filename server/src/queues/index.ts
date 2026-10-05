import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';

type Handler = (data: any) => Promise<unknown>;
const handlers = new Map<string, Handler>();
let queue: Queue | null = null;

export const registerHandler = (name: string, fn: Handler) => handlers.set(name, fn);
export const queuesEnabled = () => queue !== null;

/**
 * With REDIS_URL (Upstash/Redis): durable BullMQ jobs with retries + backoff.
 * Without it: the same handlers run in-process, so the app works with only MongoDB.
 */
export async function enqueue(name: string, data: Record<string, unknown> = {}) {
  if (queue) {
    await queue.add(name, data, { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 200, removeOnFail: 500 });
    return;
  }
  const fn = handlers.get(name);
  if (fn) setImmediate(() => fn(data).catch((e) => console.error(`[job:${name}] failed`, e?.message)));
}

export async function startQueues() {
  if (!env.REDIS_URL) {
    console.log('Queues: REDIS_URL not set, running jobs inline');
    setInterval(() => handlers.get('expire-approvals')?.({}).catch(() => {}), 5 * 60_000).unref();
    return;
  }
  const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  queue = new Queue('agentguard', { connection });
  new Worker('agentguard', async (job) => {
    const fn = handlers.get(job.name);
    if (!fn) throw new Error(`No handler for job ${job.name}`);
    return fn(job.data);
  }, { connection: connection.duplicate(), concurrency: 5 })
    .on('failed', (job, err) => console.error(`[job:${job?.name}] failed`, err.message));
  await queue.add('expire-approvals', {}, { repeat: { every: 5 * 60_000 }, jobId: 'expire-approvals' });
  console.log('Queues: BullMQ worker started');
}
