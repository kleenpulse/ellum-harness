import "server-only";
import { auth } from "@clerk/nextjs/server";
import { cache } from "react";
import { getAllowance } from "@/lib/usage";

/** The signed-in user's plan, period and usage; null when signed out. One Clerk call per request. */
export const getMyAllowance = cache(async () => {
  const { userId } = await auth();
  return userId ? getAllowance(userId) : null;
});
