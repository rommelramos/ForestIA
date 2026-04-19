CREATE TABLE `access_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`requested_role` varchar(50) NOT NULL,
	`justification` text,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`reviewed_by` varchar(255),
	`reviewed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `access_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`user_id` varchar(255) NOT NULL,
	`type` varchar(255) NOT NULL,
	`provider` varchar(255) NOT NULL,
	`provider_account_id` varchar(255) NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` int,
	`token_type` varchar(255),
	`scope` varchar(255),
	`id_token` text,
	`session_state` varchar(255)
);
--> statement-breakpoint
CREATE TABLE `aoi_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`geojson` text,
	`source_type` varchar(50),
	`uploaded_file` varchar(255),
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`analysis_result` json,
	`created_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aoi_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255),
	`action` varchar(255) NOT NULL,
	`entity` varchar(100),
	`entity_id` varchar(255),
	`metadata` json,
	`ip` varchar(45),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `geospatial_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`organization` varchar(255),
	`data_type` varchar(50) NOT NULL,
	`thematic_category` varchar(100),
	`reliability_level` tinyint NOT NULL DEFAULT 3,
	`description` text,
	`origin` varchar(255),
	`update_frequency` varchar(100),
	`format` varchar(100),
	`scale` varchar(50),
	`crs` varchar(100),
	`access_type` varchar(50) NOT NULL,
	`access_url` text,
	`applicability` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `geospatial_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integration_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`type` varchar(100) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`payload` json,
	`result` json,
	`error` text,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `integration_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `layer_overlaps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`aoi_analysis_id` int NOT NULL,
	`source_id` int,
	`overlap_type` varchar(100),
	`overlap_area_ha` decimal(12,4),
	`overlap_percent` decimal(5,2),
	`is_critical` boolean NOT NULL DEFAULT false,
	`details` json,
	`consultant_notes` text,
	CONSTRAINT `layer_overlaps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`role` varchar(50) NOT NULL DEFAULT 'analyst',
	`assigned_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_stages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`order` tinyint NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`assigned_to` varchar(255),
	`due_date` date,
	`completed_at` timestamp,
	CONSTRAINT `project_stages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`client_id` varchar(255),
	`manager_id` varchar(255),
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`start_date` date,
	`expected_end_date` date,
	`actual_end_date` date,
	`aoi` text,
	`sicar_code` varchar(100),
	`municipality` varchar(255),
	`state` varchar(2),
	`area_hectares` decimal(12,4),
	`created_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `satellite_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`provider` varchar(100),
	`image_date` date,
	`cloud_cover_percent` decimal(5,2),
	`ndvi` decimal(6,4),
	`evi` decimal(6,4),
	`savi` decimal(6,4),
	`ndwi` decimal(6,4),
	`vegetation_class` varchar(50),
	`classification_override` varchar(50),
	`override_by` varchar(255),
	`map_url` text,
	`created_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `satellite_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`service_id` int,
	`detected_at` timestamp NOT NULL DEFAULT (now()),
	`status` varchar(50) NOT NULL DEFAULT 'open',
	`notes` text,
	`reviewed_by` varchar(255),
	CONSTRAINT `service_opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`trigger_condition` text,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `services_catalog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_token` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`expires` timestamp NOT NULL,
	CONSTRAINT `sessions_session_token` PRIMARY KEY(`session_token`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(255) NOT NULL,
	`name` varchar(255),
	`email` varchar(255),
	`email_verified` timestamp,
	`image` varchar(255),
	`password_hash` varchar(255),
	`role` varchar(50) NOT NULL DEFAULT 'pending',
	`is_active` boolean NOT NULL DEFAULT false,
	`allow_google_login` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`identifier` varchar(255) NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires` timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE `viability_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`title` varchar(255) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'draft',
	`geospatial_score` decimal(5,2),
	`vegetation_score` decimal(5,2),
	`consultant_score` decimal(5,2),
	`final_score` decimal(5,2),
	`conclusion` text,
	`content` json,
	`is_published` boolean NOT NULL DEFAULT false,
	`published_at` timestamp,
	`created_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `viability_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `access_requests` ADD CONSTRAINT `access_requests_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `aoi_analyses` ADD CONSTRAINT `aoi_analyses_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `aoi_analyses` ADD CONSTRAINT `aoi_analyses_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `geospatial_sources` ADD CONSTRAINT `geospatial_sources_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `integration_jobs` ADD CONSTRAINT `integration_jobs_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `integration_jobs` ADD CONSTRAINT `integration_jobs_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `layer_overlaps` ADD CONSTRAINT `layer_overlaps_aoi_analysis_id_aoi_analyses_id_fk` FOREIGN KEY (`aoi_analysis_id`) REFERENCES `aoi_analyses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `layer_overlaps` ADD CONSTRAINT `layer_overlaps_source_id_geospatial_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `geospatial_sources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_stages` ADD CONSTRAINT `project_stages_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_stages` ADD CONSTRAINT `project_stages_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_client_id_users_id_fk` FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_manager_id_users_id_fk` FOREIGN KEY (`manager_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `satellite_analyses` ADD CONSTRAINT `satellite_analyses_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `satellite_analyses` ADD CONSTRAINT `satellite_analyses_override_by_users_id_fk` FOREIGN KEY (`override_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `satellite_analyses` ADD CONSTRAINT `satellite_analyses_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_opportunities` ADD CONSTRAINT `service_opportunities_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_opportunities` ADD CONSTRAINT `service_opportunities_service_id_services_catalog_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services_catalog`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_opportunities` ADD CONSTRAINT `service_opportunities_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `viability_reports` ADD CONSTRAINT `viability_reports_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `viability_reports` ADD CONSTRAINT `viability_reports_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;