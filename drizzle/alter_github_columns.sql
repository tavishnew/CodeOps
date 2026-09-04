ALTER TABLE `users` ADD `demo` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `projects` ADD `source` varchar(20) NOT NULL DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE `issues` ADD `source` varchar(20) NOT NULL DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE `pull_requests` ADD `source` varchar(20) NOT NULL DEFAULT 'manual';
