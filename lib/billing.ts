/**
 * Clerk Billing features. They are attached to the `pro` user plan (Clerk
 * dashboard → Billing → Plans); `free_user` has none. Check features, not the
 * plan, so a future tier only has to carry the same slugs.
 */
export const FEATURE = { bots: "bots", sandboxes: "sandboxes" } as const;
export type Feature = (typeof FEATURE)[keyof typeof FEATURE];

/** Creating or chatting with a bot also creates or runs its sandbox. */
export const BOT_FEATURES = [FEATURE.bots, FEATURE.sandboxes] as const;
export const DESKTOP_FEATURES = [FEATURE.sandboxes] as const;

/** Plan limits and what's left of them; linked from the account menu, not the rail. */
export const USAGE_PATH = "/usage";

export const UPGRADE_MESSAGE = "Bots and their sandboxes are on the Pro plan.";

type Has = (params: { feature: string }) => boolean;

export const hasFeatures = (has: Has, features: readonly Feature[]) =>
  features.every((feature) => has({ feature }));
