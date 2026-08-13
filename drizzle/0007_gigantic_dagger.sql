CREATE TABLE `business_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`monthly_goal_cents` integer DEFAULT 500000 NOT NULL,
	`loyalty_target` integer DEFAULT 10 NOT NULL,
	`loyalty_reward` text DEFAULT 'Um serviço adicional grátis' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_email` text NOT NULL,
	`client_name` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schedule_blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`time` text DEFAULT 'Dia inteiro' NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `waitlist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_email` text NOT NULL,
	`client_name` text NOT NULL,
	`service_name` text NOT NULL,
	`preferred_date` text NOT NULL,
	`preferred_time` text NOT NULL,
	`status` text DEFAULT 'Aguardando' NOT NULL,
	`created_at` text NOT NULL
);
