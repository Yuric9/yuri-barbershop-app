CREATE TABLE IF NOT EXISTS `product_orders` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `client_email` text DEFAULT '' NOT NULL,
  `client_name` text NOT NULL,
  `phone` text DEFAULT '' NOT NULL,
  `status` text DEFAULT 'Pendente' NOT NULL,
  `total_cents` integer NOT NULL,
  `payment_method` text DEFAULT '' NOT NULL,
  `created_at` text NOT NULL,
  `completed_at` text DEFAULT '' NOT NULL
);

CREATE TABLE IF NOT EXISTS `product_order_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `order_id` integer NOT NULL,
  `product_id` integer NOT NULL,
  `product_name` text NOT NULL,
  `quantity` integer NOT NULL,
  `price_cents` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `product_orders_status_idx` ON `product_orders` (`status`);
CREATE INDEX IF NOT EXISTS `product_order_items_order_idx` ON `product_order_items` (`order_id`);
