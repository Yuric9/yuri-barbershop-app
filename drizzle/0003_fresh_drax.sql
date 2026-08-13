CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_email` text NOT NULL,
	`client_name` text NOT NULL,
	`status` text DEFAULT 'Aguardando pagamento' NOT NULL,
	`price_cents` integer DEFAULT 12000 NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`end_date` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
