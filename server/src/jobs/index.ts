import { analyzeAction } from '../services/ai/ai.service';
import { sweepExpiredApprovals } from '../services/approvals/approval.service';
import { runEvaluation } from '../services/evaluations/evaluation.service';
import { registerHandler } from '../queues';

export function registerJobs() {
  registerHandler('ai-analysis', ({ actionId }) => analyzeAction(actionId));
  registerHandler('evaluation-run', ({ runId }) => runEvaluation(runId));
  registerHandler('expire-approvals', () => sweepExpiredApprovals());
}
