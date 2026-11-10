import type { LanguageModelUsage, StopCondition, ToolSet } from "ai";
import { UPGRADE_MESSAGE } from "@/lib/billing";
import { getAllowance, LIMIT_MESSAGES, meterSandbox, recordUsage, remaining } from "@/lib/usage";

/**
 * One turn's share of the user's allowance. Opened when the turn starts, so
 * every turn re-checks the plan: a chat token minted on Pro outlives a
 * cancelled subscription by up to an hour, the agent doesn't.
 */
export type TurnBudget = {
  userId: string;
  botId: string;
  chatId: string;
  /** Left at the start of the turn. */
  tokensLeft: number;
  sandboxSecondsLeft: number;
  /** Spent so far this turn. */
  tokens: number;
  /** First time this turn's tools touched the sandbox. */
  sandboxSince?: Date;
};

export class UsageLimitError extends Error {}

/** Throws when the user isn't on Pro or has no AI allowance left. */
export async function openTurnBudget(chatId: string, userId: string, botId: string): Promise<TurnBudget> {
  const allowance = await getAllowance(userId);
  if (!allowance.pro) throw new UsageLimitError(UPGRADE_MESSAGE);
  const tokensLeft = remaining(allowance.used, "ai_tokens");
  if (tokensLeft < 1) throw new UsageLimitError(LIMIT_MESSAGES.ai_tokens);
  return {
    userId,
    botId,
    chatId,
    tokensLeft,
    sandboxSecondsLeft: remaining(allowance.used, "sandbox_seconds"),
    tokens: 0,
  };
}

const sandboxSeconds = (budget: TurnBudget) =>
  budget.sandboxSince ? (Date.now() - budget.sandboxSince.getTime()) / 1000 : 0;

/** Called before every sandbox tool; the error reaches the model as the tool's result. */
export function enterSandbox(budget: TurnBudget) {
  if (sandboxSeconds(budget) >= budget.sandboxSecondsLeft) throw new UsageLimitError(LIMIT_MESSAGES.sandbox_seconds);
  budget.sandboxSince ??= new Date();
}

function stepTokens(usage: LanguageModelUsage) {
  const tokens = usage.totalTokens ?? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
  // A provider that reports nothing would make every turn free; say so loudly.
  if (!tokens) console.warn("Model step reported no token usage; nothing charged.", usage);
  return tokens;
}

/**
 * Writes a finished step to the ledger: its tokens, and the sandbox's time so
 * far this turn (meterSandbox skips what earlier steps already charged).
 */
export async function chargeStep(budget: TurnBudget, usage: LanguageModelUsage) {
  const tokens = stepTokens(usage);
  budget.tokens += tokens;
  await Promise.all([
    recordUsage(budget.userId, "ai_tokens", tokens, { botId: budget.botId, chatId: budget.chatId }),
    budget.sandboxSince &&
      meterSandbox(budget.userId, budget.botId, budget.sandboxSince, new Date(), budget.chatId),
  ]);
}

/** Ends the turn after the step that uses up the tokens or the sandbox time. */
export const overBudget =
  (budget: TurnBudget): StopCondition<ToolSet> =>
  () =>
    budget.tokens >= budget.tokensLeft || sandboxSeconds(budget) >= budget.sandboxSecondsLeft;
