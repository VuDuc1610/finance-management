import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let dbInstance: ReturnType<typeof drizzle> | null = null;

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    if (!dbInstance) {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error("DATABASE_URL is not set");
      }
      const client = postgres(connectionString, { prepare: false });
      dbInstance = drizzle(client, { schema });
    }
    return (dbInstance as any)[prop];
  },
});
