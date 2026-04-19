import mysql from "mysql2/promise"

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

export async function createDatabase(credentials: DbCredentials): Promise<void> {
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
}

export async function dropAndRecreateDatabase(credentials: DbCredentials): Promise<void> {
  let conn: mysql.Connection | undefined
  try {
    conn = await mysql.createConnection({
      host: credentials.host,
      port: credentials.port,
      user: credentials.user,
      password: credentials.password,
    })
    await conn.execute(`DROP DATABASE IF EXISTS \`${credentials.database}\``)
    await conn.execute(`CREATE DATABASE \`${credentials.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  } finally {
    if (conn) await conn.end()
  }
}
