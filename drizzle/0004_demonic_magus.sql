CREATE TABLE `installments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`loan_id` integer NOT NULL,
	`month_number` integer NOT NULL,
	`due_date` integer NOT NULL,
	`amount_paise` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`paid_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action
);
