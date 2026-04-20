CREATE TABLE `invite_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(255) NOT NULL,
	`email` varchar(255),
	`role` varchar(50) NOT NULL DEFAULT 'funcionario',
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invite_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `invite_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `project_workflow_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`order` tinyint NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`completed_at` timestamp,
	`updated_by` varchar(255),
	CONSTRAINT `project_workflow_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_patterns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trigger` text NOT NULL,
	`suggested_service` text NOT NULL,
	`rationale` text,
	`category` varchar(100),
	`tags` json,
	`created_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `service_patterns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `project_id` int;--> statement-breakpoint
ALTER TABLE `invite_tokens` ADD CONSTRAINT `invite_tokens_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_workflow_steps` ADD CONSTRAINT `project_workflow_steps_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_workflow_steps` ADD CONSTRAINT `project_workflow_steps_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_patterns` ADD CONSTRAINT `service_patterns_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;