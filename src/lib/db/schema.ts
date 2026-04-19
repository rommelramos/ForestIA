import {
  mysqlTable, varchar, int, timestamp, text,
  decimal, boolean, tinyint, json, date,
} from "drizzle-orm/mysql-core"

// ─── NextAuth tables ──────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).unique(),
  emailVerified: timestamp("email_verified"),
  image: varchar("image", { length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  role: varchar("role", { length: 50 }).notNull().default("pending"),
  isActive: boolean("is_active").notNull().default(false),
  allowGoogleLogin: boolean("allow_google_login").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
})

export const accounts = mysqlTable("accounts", {
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: int("expires_at"),
  token_type: varchar("token_type", { length: 255 }),
  scope: varchar("scope", { length: 255 }),
  id_token: text("id_token"),
  session_state: varchar("session_state", { length: 255 }),
})

export const sessions = mysqlTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
})

export const verificationTokens = mysqlTable("verification_tokens", {
  identifier: varchar("identifier", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  expires: timestamp("expires").notNull(),
})

// ─── Módulo 1 — Gestão de Usuários ───────────────────────────────────────────

export const accessRequests = mysqlTable("access_requests", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  requestedRole: varchar("requested_role", { length: 50 }).notNull(),
  justification: text("justification"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  reviewedBy: varchar("reviewed_by", { length: 255 }).references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  action: varchar("action", { length: 255 }).notNull(),
  entity: varchar("entity", { length: 100 }),
  entityId: varchar("entity_id", { length: 255 }),
  metadata: json("metadata"),
  ip: varchar("ip", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ─── Módulo 2 — Catálogo de Bases Geoespaciais ───────────────────────────────

export const geospatialSources = mysqlTable("geospatial_sources", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  organization: varchar("organization", { length: 255 }),
  dataType: varchar("data_type", { length: 50 }).notNull(),
  thematicCategory: varchar("thematic_category", { length: 100 }),
  reliabilityLevel: tinyint("reliability_level").notNull().default(3),
  description: text("description"),
  origin: varchar("origin", { length: 255 }),
  updateFrequency: varchar("update_frequency", { length: 100 }),
  format: varchar("format", { length: 100 }),
  scale: varchar("scale", { length: 50 }),
  crs: varchar("crs", { length: 100 }),
  accessType: varchar("access_type", { length: 50 }).notNull(),
  accessUrl: text("access_url"),
  applicability: text("applicability"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
})

// ─── Módulo 6 — Gestão de Projetos ───────────────────────────────────────────

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  clientId: varchar("client_id", { length: 255 }).references(() => users.id),
  managerId: varchar("manager_id", { length: 255 }).references(() => users.id),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  startDate: date("start_date"),
  expectedEndDate: date("expected_end_date"),
  actualEndDate: date("actual_end_date"),
  aoi: text("aoi"),
  sicarCode: varchar("sicar_code", { length: 100 }),
  municipality: varchar("municipality", { length: 255 }),
  state: varchar("state", { length: 2 }),
  areaHectares: decimal("area_hectares", { precision: 12, scale: 4 }),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
})

export const projectMembers = mysqlTable("project_members", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  role: varchar("role", { length: 50 }).notNull().default("analyst"),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
})

export const projectStages = mysqlTable("project_stages", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  order: tinyint("order").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  assignedTo: varchar("assigned_to", { length: 255 }).references(() => users.id),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
})

// ─── Módulo 3 — Análise Geoespacial ──────────────────────────────────────────

export const aoiAnalyses = mysqlTable("aoi_analyses", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  geojson: text("geojson"),
  sourceType: varchar("source_type", { length: 50 }),
  uploadedFile: varchar("uploaded_file", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  analysisResult: json("analysis_result"),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const layerOverlaps = mysqlTable("layer_overlaps", {
  id: int("id").autoincrement().primaryKey(),
  aoiAnalysisId: int("aoi_analysis_id").notNull().references(() => aoiAnalyses.id, { onDelete: "cascade" }),
  sourceId: int("source_id").references(() => geospatialSources.id),
  overlapType: varchar("overlap_type", { length: 100 }),
  overlapAreaHa: decimal("overlap_area_ha", { precision: 12, scale: 4 }),
  overlapPercent: decimal("overlap_percent", { precision: 5, scale: 2 }),
  isCritical: boolean("is_critical").notNull().default(false),
  details: json("details"),
  consultantNotes: text("consultant_notes"),
})

// ─── Módulo 4 — Análise por Satélite ─────────────────────────────────────────

export const satelliteAnalyses = mysqlTable("satellite_analyses", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 100 }),
  imageDate: date("image_date"),
  cloudCoverPercent: decimal("cloud_cover_percent", { precision: 5, scale: 2 }),
  ndvi: decimal("ndvi", { precision: 6, scale: 4 }),
  evi: decimal("evi", { precision: 6, scale: 4 }),
  savi: decimal("savi", { precision: 6, scale: 4 }),
  ndwi: decimal("ndwi", { precision: 6, scale: 4 }),
  vegetationClass: varchar("vegetation_class", { length: 50 }),
  classificationOverride: varchar("classification_override", { length: 50 }),
  overrideBy: varchar("override_by", { length: 255 }).references(() => users.id),
  mapUrl: text("map_url"),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ─── Módulo 5 — Relatório de Viabilidade ─────────────────────────────────────

export const viabilityReports = mysqlTable("viability_reports", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  version: int("version").notNull().default(1),
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  geospatialScore: decimal("geospatial_score", { precision: 5, scale: 2 }),
  vegetationScore: decimal("vegetation_score", { precision: 5, scale: 2 }),
  consultantScore: decimal("consultant_score", { precision: 5, scale: 2 }),
  finalScore: decimal("final_score", { precision: 5, scale: 2 }),
  conclusion: text("conclusion"),
  content: json("content"),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
})

// ─── Módulo 7 — Inteligência de Novos Serviços ───────────────────────────────

export const servicesCatalog = mysqlTable("services_catalog", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  triggerCondition: text("trigger_condition"),
  isActive: boolean("is_active").notNull().default(true),
})

export const serviceOpportunities = mysqlTable("service_opportunities", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  serviceId: int("service_id").references(() => servicesCatalog.id),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  status: varchar("status", { length: 50 }).notNull().default("open"),
  notes: text("notes"),
  reviewedBy: varchar("reviewed_by", { length: 255 }).references(() => users.id),
})

// ─── Módulo 8 — Integração ────────────────────────────────────────────────────

export const integrationJobs = mysqlTable("integration_jobs", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  payload: json("payload"),
  result: json("result"),
  error: text("error"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
