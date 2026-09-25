CREATE TABLE `associate_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`area` text NOT NULL,
	`status` text DEFAULT 'reported' NOT NULL,
	`impact` text NOT NULL,
	`minutes_lost` integer DEFAULT 0 NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL
);
