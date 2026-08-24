ALTER TABLE `profiles` ADD `loyalty_adjustment` integer DEFAULT 0 NOT NULL;
ALTER TABLE `profiles` ADD `loyalty_rewards_redeemed` integer DEFAULT 0 NOT NULL;
ALTER TABLE `profiles` ADD `loyalty_adjustment_note` text DEFAULT '' NOT NULL;
ALTER TABLE `profiles` ADD `loyalty_updated_at` text DEFAULT '' NOT NULL;
ALTER TABLE `profiles` ADD `loyalty_updated_by` text DEFAULT '' NOT NULL;
