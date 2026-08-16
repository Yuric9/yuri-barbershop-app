ALTER TABLE `transactions` ADD `client_email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `client_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `service_id` integer;--> statement-breakpoint
ALTER TABLE `transactions` ADD `service_name` text DEFAULT '' NOT NULL;
