CREATE TABLE `insights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`projectId` int,
	`title` varchar(240) NOT NULL,
	`description` text,
	`severity` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`confidence` varchar(40),
	`sourceRef` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `insights_id` PRIMARY KEY(`id`)
);
