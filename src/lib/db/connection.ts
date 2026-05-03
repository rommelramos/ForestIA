import mysql from "mysql2/promise"
import { drizzle } from "drizzle-orm/mysql2"
import { migrate } from "drizzle-orm/mysql2/migrator"
import path from "path"

export interface DbCredentials {
  host: string
  port: number
  user: string
  password: string
  database: string
}

function getCredentialsFromEnv(): DbCredentials {
  return {
    host: process.env.DB_HOST ?? "",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "",
  }
}

let pool: mysql.Pool | null = null

export function getPool(credentials?: DbCredentials): mysql.Pool {
  const creds = credentials ?? getCredentialsFromEnv()
  if (!pool || credentials) {
    pool = mysql.createPool({
      host: creds.host,
      port: creds.port,
      user: creds.user,
      password: creds.password,
      database: creds.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    })
  }
  return pool
}

export async function testConnection(credentials: DbCredentials): Promise<{ success: boolean; error?: string }> {
  let conn: mysql.Connection | undefined
  try {
    conn = await mysql.createConnection({
      host: credentials.host,
      port: credentials.port,
      user: credentials.user,
      password: credentials.password,
      connectTimeout: 10000,
    })
    await conn.ping()
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido"
    return { success: false, error: message }
  } finally {
    if (conn) await conn.end()
  }
}

export async function checkDatabaseExists(credentials: DbCredentials): Promise<boolean> {
  let conn: mysql.Connection | undefined
  try {
    conn = await mysql.createConnection({
      host: credentials.host,
      port: credentials.port,
      user: credentials.user,
      password: credentials.password,
    })
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?",
      [credentials.database]
    )
    return rows.length > 0
  } finally {
    if (conn) await conn.end()
  }
}

export async function runMigrations(credentials: DbCredentials): Promise<void> {
  const pool = mysql.createPool({
    host: credentials.host,
    port: credentials.port,
    user: credentials.user,
    password: credentials.password,
    database: credentials.database,
  })
  const db = drizzle(pool)
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") })
  await pool.end()
}

/** Validates that a database/table name is safe to interpolate into a SQL identifier. */
function assertSafeIdentifier(name: string, label = "identifier"): void {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Unsafe SQL ${label}: "${name}" — only letters, numbers and underscores are allowed`)
  }
}

export async function createDatabase(credentials: DbCredentials): Promise<void> {
  assertSafeIdentifier(credentials.database, "database name")
  let conn: mysql.Connection | undefined
  try {
    conn = await mysql.createConnection({
      host: credentials.host,
      port: credentials.port,
      user: credentials.user,
      password: credentials.password,
    })
    await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${credentials.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  } finally {
    if (conn) await conn.end()
  }
  await runMigrations(credentials)
}

export async function dropAndRecreateDatabase(credentials: DbCredentials): Promise<void> {
  assertSafeIdentifier(credentials.database, "database name")
  // Shared-hosting MySQL users typically lack DROP/CREATE DATABASE privileges.
  // Instead we connect directly to the target database, discover every table
  // via information_schema (including __drizzle_migrations), disable FK checks,
  // drop them all, re-enable FK checks, and then run migrations from scratch.
  let conn: mysql.Connection | undefined
  try {
    conn = await mysql.createConnection({
      host: credentials.host,
      port: credentials.port,
      user: credentials.user,
      password: credentials.password,
      database: credentials.database,
    })

    // Discover all tables in the target schema
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
      [credentials.database]
    )

    if (rows.length > 0) {
      await conn.execute("SET FOREIGN_KEY_CHECKS = 0")
      for (const row of rows) {
        const tableName = row.TABLE_NAME as string
        assertSafeIdentifier(tableName, "table name")   // defense-in-depth
        await conn.execute(`DROP TABLE IF EXISTS \`${tableName}\``)
      }
      await conn.execute("SET FOREIGN_KEY_CHECKS = 1")
    }
  } finally {
    if (conn) await conn.end()
  }

  // Run all migrations against the now-empty database
  await runMigrations(credentials)
}
