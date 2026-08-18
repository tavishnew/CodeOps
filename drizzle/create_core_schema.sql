CREATE TABLE `automation_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`automationId` int NOT NULL,
	`workspaceId` int NOT NULL,
	`status` enum('queued','running','succeeded','failed') NOT NULL DEFAULT 'queued',
	`result` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `automation_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`trigger` varchar(180) NOT NULL,
	`actions` text NOT NULL,
	`enabled` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deployments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`projectId` int NOT NULL,
	`externalId` varchar(80) NOT NULL,
	`environment` varchar(40) NOT NULL,
	`version` varchar(80) NOT NULL,
	`commitSha` varchar(80) NOT NULL,
	`status` enum('successful','watch','failed') NOT NULL DEFAULT 'successful',
	`duration` varchar(40),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deployments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`projectId` int NOT NULL,
	`key` varchar(40) NOT NULL,
	`title` varchar(240) NOT NULL,
	`description` text,
	`severity` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`status` enum('investigating','identified','monitoring','resolved') NOT NULL DEFAULT 'investigating',
	`service` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`projectId` int NOT NULL,
	`key` varchar(40) NOT NULL,
	`title` varchar(240) NOT NULL,
	`description` text,
	`status` enum('open','in_progress','closed') NOT NULL DEFAULT 'open',
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `issues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`projectId` int,
	`type` varchar(80) NOT NULL,
	`label` varchar(180) NOT NULL,
	`sourceRef` varchar(500),
	`content` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledge_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pull_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`projectId` int NOT NULL,
	`number` int NOT NULL,
	`title` varchar(240) NOT NULL,
	`status` enum('open','merged','closed') NOT NULL DEFAULT 'open',
	`risk` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pull_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `workspaces` MODIFY COLUMN `mode` enum('preview','connected') NOT NULL DEFAULT 'connected';--> statement-breakpoint
ALTER TABLE `projects` ADD `description` text;