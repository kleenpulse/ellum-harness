import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
import { connection } from "next/server";

/** Where the preferred avatar lives: Clerk unsafeMetadata, written from Settings. */
export const AVATAR_SEED_KEY = "avatarSeed";

/** The user's preferred avatar seed, or null when they want a fresh one each visit. */
export async function getPreferredSeed(): Promise<string | null> {
  const user = await currentUser();
  const seed = user?.unsafeMetadata?.[AVATAR_SEED_KEY];
  return typeof seed === "string" && seed ? seed : null;
}

/** A fresh seed per request (connection() opts out of prerendering the random value). */
export async function randomSeed() {
  await connection();
  return nanoid(10);
}

export async function getAvatarSeed() {
  return (await getPreferredSeed()) ?? (await randomSeed());
}
