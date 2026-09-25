CREATE TABLE `inventory_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`order_item` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_checks_order_item_unique` ON `inventory_checks` (`order_item`);