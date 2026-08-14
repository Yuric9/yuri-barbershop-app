CREATE TABLE IF NOT EXISTS `collaborators` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `email` text NOT NULL UNIQUE,
  `name` text NOT NULL,
  `phone` text DEFAULT '' NOT NULL,
  `default_commission_percent` integer DEFAULT 40 NOT NULL,
  `active` integer DEFAULT true NOT NULL,
  `owner` integer DEFAULT false NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `collaborator_services` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `collaborator_id` integer NOT NULL,
  `service_id` integer NOT NULL,
  `commission_percent` integer,
  `active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `collaborator_service_unique` ON `collaborator_services` (`collaborator_id`,`service_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `commission_settlements` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `collaborator_id` integer NOT NULL,
  `period_start` text NOT NULL,
  `period_end` text NOT NULL,
  `amount_cents` integer NOT NULL,
  `status` text DEFAULT 'Pago' NOT NULL,
  `note` text DEFAULT '' NOT NULL,
  `paid_at` text NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `appointments` ADD `collaborator_id` integer;
--> statement-breakpoint
ALTER TABLE `appointments` ADD `collaborator_name` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `appointments` ADD `payment_method` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `appointments` ADD `commission_percent` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `appointments` ADD `commission_cents` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `appointments` ADD `cash_transaction_id` integer;
--> statement-breakpoint
ALTER TABLE `transactions` ADD `appointment_id` integer;
--> statement-breakpoint
ALTER TABLE `transactions` ADD `collaborator_id` integer;
--> statement-breakpoint
ALTER TABLE `transactions` ADD `payment_method` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `schedule_blocks` ADD `collaborator_id` integer;
