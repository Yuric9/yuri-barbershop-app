PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_business_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`monthly_goal_cents` integer DEFAULT 500000 NOT NULL,
	`loyalty_target` integer DEFAULT 10 NOT NULL,
	`loyalty_reward` text DEFAULT '1 atendimento grátis' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_business_settings`("id", "monthly_goal_cents", "loyalty_target", "loyalty_reward") SELECT "id", "monthly_goal_cents", "loyalty_target", "loyalty_reward" FROM `business_settings`;--> statement-breakpoint
DROP TABLE `business_settings`;--> statement-breakpoint
ALTER TABLE `__new_business_settings` RENAME TO `business_settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;