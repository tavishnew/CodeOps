CREATE TABLE IF NOT EXISTS `github_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accessTokenEnc` text NOT NULL,
	`githubUsername` varchar(180) NOT NULL,
	`scopes` varchar(500),
	`connectedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `github_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `github_connections_userId_unique` UNIQUE(`userId`)
);
