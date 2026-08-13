CREATE TABLE `marketing_contacts` (
	`key` text PRIMARY KEY NOT NULL,
	`client_email` text NOT NULL,
	`campaign` text NOT NULL,
	`sent_at` text DEFAULT '' NOT NULL,
	`answered` integer DEFAULT false NOT NULL,
	`returned` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL
);
