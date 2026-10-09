import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { parseEnv } from "@neon/env";
import config from "@/neon";
import * as schema from "./schema";

// Pooled URL for app traffic; `db:push` uses the unpooled one (drizzle.config.ts).
const { postgres } = parseEnv(config, ["DATABASE_URL"]);

export const db = drizzle(neon(postgres.databaseUrl), { schema });
export { schema };
