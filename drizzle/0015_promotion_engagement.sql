ALTER TABLE `promotions` ADD `audience` text DEFAULT 'Todos' NOT NULL;--> statement-breakpoint
ALTER TABLE `promotions` ADD `views` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `promotions` ADD `clicks` integer DEFAULT 0 NOT NULL;
