// Plan limits, safe to import from client components. The ledger itself is
// in ./usage.

/** Clerk plan slug that carries the bots and sandboxes features. */
export const PRO_PLAN = "pro";

/** Ledger metrics (the usage_metric enum). */
export const METRICS = ["ai_tokens", "sandbox_seconds", "sandboxes_created"] as const;
export type Metric = (typeof METRICS)[number];

/**
 * What one Pro billing period includes. Sized so the worst case stays well
 * under the $20 price at pay-as-you-go rates (Daytona's default 1 vCPU /
 * 1 GiB sandbox is about $0.067 an hour; the model is about $0.2 / $0.8 per
 * million input / output tokens).
 */
export const PRO_LIMITS = {
  /** Model tokens, input and output together. */
  ai_tokens: 10_000_000,
  /** Time a bot's sandbox runs for a turn, or with its desktop open. */
  sandbox_seconds: 30 * 60 * 60,
  /** Sandboxes made, one per new bot, so deleting and remaking can't dodge the cap. */
  sandboxes_created: 20,
} satisfies Record<Metric, number>;

/** Bots (each holding a sandbox's disk) a Pro account can have at once. */
export const MAX_BOTS = 10;

/** How often an open desktop is charged; the panel calls meterDesktop on this beat. */
export const DESKTOP_BEAT_MS = 60_000;

export const LIMIT_MESSAGES = {
  ai_tokens: "You've used this period's AI allowance.",
  sandbox_seconds: "You've used this period's sandbox time.",
  sandboxes_created: "You've made as many bots as this period allows.",
  bots: `You can have up to ${MAX_BOTS} bots. Delete one to make another.`,
} as const;
