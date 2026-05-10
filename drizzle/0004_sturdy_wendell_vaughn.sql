CREATE TABLE `project_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`uploaded_by` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`url` text NOT NULL,
	`mime_type` varchar(100),
	`size_bytes` int,
	`category` varchar(50) NOT NULL DEFAULT 'client_upload',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`author_id` varchar(255) NOT NULL,
	`parent_id` int,
	`body` text NOT NULL,
	`kind` varchar(30) NOT NULL DEFAULT 'note',
	`is_read_by_client` boolean NOT NULL DEFAULT false,
	`is_read_by_team` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `project_documents` ADD CONSTRAINT `project_documents_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_documents` ADD CONSTRAINT `project_documents_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_messages` ADD CONSTRAINT `project_messages_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_messages` ADD CONSTRAINT `project_messages_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;