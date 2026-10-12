CREATE TABLE `profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`pin_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_name_unique` ON `profiles` (`name`);--> statement-breakpoint
ALTER TABLE `contacts` ADD `profile_id` integer REFERENCES profiles(id);--> statement-breakpoint
ALTER TABLE `loans` ADD `profile_id` integer REFERENCES profiles(id);