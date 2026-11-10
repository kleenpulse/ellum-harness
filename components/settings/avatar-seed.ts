import type { useUser } from "@clerk/nextjs";

type ClerkUser = NonNullable<ReturnType<typeof useUser>["user"]>;

// Mirrors AVATAR_SEED_KEY in lib/avatar.ts (server-only, so not importable here).
const KEY = "avatarSeed";

/** Saves the preferred avatar seed on the Clerk user; null goes back to a new face every visit. Throws on failure. */
export async function saveAvatarSeed(user: ClerkUser, seed: string | null): Promise<void> {
  // update() replaces unsafeMetadata wholesale: carry the other keys over.
  const metadata = { ...user.unsafeMetadata };
  if (seed) metadata[KEY] = seed;
  else delete metadata[KEY];
  await user.update({ unsafeMetadata: metadata });
}

export const hasAvatarSeed = (user: ClerkUser) => typeof user.unsafeMetadata[KEY] === "string";
