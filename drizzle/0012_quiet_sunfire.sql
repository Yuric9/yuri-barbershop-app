CREATE TABLE `accounts` (
	`email` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'client' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_email` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
