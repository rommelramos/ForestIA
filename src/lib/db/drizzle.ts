import { drizzle } from "drizzle-orm/mysql2"
import { getPool } from "./connection"
import * as schema from "./schema"

export function getDb() {
  const pool = getPool()
  return drizzle(pool, { schema, mode: "default" })
}
