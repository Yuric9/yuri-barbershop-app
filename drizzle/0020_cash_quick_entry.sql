-- Categoria dos gastos e despesas fixas (ex.: aluguel).
ALTER TABLE `transactions` ADD `category` text DEFAULT '' NOT NULL;
ALTER TABLE `transactions` ADD `recurring_expense_id` integer;
CREATE TABLE IF NOT EXISTS `recurring_expenses` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `description` text NOT NULL,
  `amount_cents` integer NOT NULL,
  `category` text DEFAULT '' NOT NULL,
  `day_of_month` integer DEFAULT 1 NOT NULL,
  `active` integer DEFAULT true NOT NULL,
  `created_at` text NOT NULL
);
-- Os lançamentos antigos de aluguel ganham a categoria correta.
UPDATE `transactions` SET `category` = 'Aluguel' WHERE `kind` = 'despesa' AND lower(`description`) LIKE '%aluguel%';
