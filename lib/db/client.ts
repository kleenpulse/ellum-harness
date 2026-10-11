import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { parseEnv } from "@neon/env";
import config from "@/neon";
import * as schema from "./schema";

const ATTEMPTS = 4;
const ATTEMPT_TIMEOUT_MS = 10_000;

// neon-http sends every query as its own HTTPS request, so one dropped packet
// fails the whole render. Retry at the transport: only rejected fetches
// (DNS, TCP, TLS, timeout) are retried; a response, including a Postgres
// error, is returned untouched. A request lost after reaching Neon could run
// twice, which only matters for non-idempotent writes.
neonConfig.fetchFunction = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  for (let attempt = 1; ; attempt++) {
    const timeout = AbortSignal.timeout(ATTEMPT_TIMEOUT_MS);
    const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    try {
      return await fetch(input, { ...init, signal });
    } catch (error) {
      if (init.signal?.aborted || attempt === ATTEMPTS) throw error;
      // 250ms, 500ms, 1s with jitter, so a brief outage clears before the last try
      await new Promise((r) => setTimeout(r, 250 * 2 ** (attempt - 1) * (0.5 + Math.random())));
    }
  }
};

// Pooled URL for app traffic; `db:push` uses the unpooled one (drizzle.config.ts).
const { postgres } = parseEnv(config, ["DATABASE_URL"]);

export const db = drizzle(neon(postgres.databaseUrl), { schema });
export { schema };
