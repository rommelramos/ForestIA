import { mysqlTable, varchar, int, timestamp, text, decimal, boolean } from "drizzle-orm/mysql-core"

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  role: varchar("role", { length: 50 }).notNull().default("viewer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
})

export const forestAreas = mysqlTable("forest_areas", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  areaHectares: decimal("area_hectares", { precision: 10, scale: 2 }),
  municipality: varchar("municipality", { length: 255 }),
  state: varchar("state", { length: 2 }),
  geojson: text("geojson"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
})

export const monitoringRecords = mysqlTable("monitoring_records", {
  id: int("id").autoincrement().primaryKey(),
  forestAreaId: int("forest_area_id").notNull().references(() => forestAreas.id),
  recordDate: timestamp("record_date").notNull(),
  ndviIndex: decimal("ndvi_index", { precision: 5, scale: 4 }),
  carbonEstimate: decimal("carbon_estimate", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const viabilityReports = mysqlTable("viability_reports", {
  id: int("id").autoincrement().primaryKey(),
  forestAreaId: int("forest_area_id").notNull().references(() => forestAreas.id),
  title: varchar("title", { length: 255 }).notNull(),
  consultantId: int("consultant_id").references(() => users.id),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  geospatialScore: decimal("geospatial_score", { precision: 5, scale: 2 }),
  consultantScore: decimal("consultant_score", { precision: 5, scale: 2 }),
  finalScore: decimal("final_score", { precision: 5, scale: 2 }),
  conclusion: text("conclusion"),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
})
