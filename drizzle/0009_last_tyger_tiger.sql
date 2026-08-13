CREATE TABLE `subscription_campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`image_key` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`show_on_login` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `promotions` ADD `image_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `promotions` ADD `show_on_login` integer DEFAULT false NOT NULL;