ALTER TABLE `workspaces` ADD `githubConnected` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `githubProvider` varchar(40);--> statement-breakpoint
ALTER TABLE `workspaces` ADD `githubAccountLogin` varchar(180);--> statement-breakpoint
ALTER TABLE `workspaces` ADD `githubLastSyncedAt` timestamp;