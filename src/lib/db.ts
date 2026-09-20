import postgres, { type Sql } from "postgres";

declare global {
  var hiveSql: Sql | undefined;
}

export class DatabaseConfigurationError extends Error {
  constructor() {
    super("DATABASE_URL is not configured. Add it to .env.local before using persistence.");
    this.name = "DatabaseConfigurationError";
  }
}

export function getDatabase(): Sql {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new DatabaseConfigurationError();

  if (!globalThis.hiveSql) {
    globalThis.hiveSql = postgres(connectionString, {
      max: 4,
      prepare: false,
      ssl: process.env.DATABASE_SSL === "false" ? false : "require",
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return globalThis.hiveSql;
}
