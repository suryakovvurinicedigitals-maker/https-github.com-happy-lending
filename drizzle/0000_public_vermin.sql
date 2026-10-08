CREATE TABLE `attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`loan_id` integer NOT NULL,
	`kind` text NOT NULL,
	`file_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`original_file_name` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`address` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `loans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contact_id` integer NOT NULL,
	`principal_paise` integer NOT NULL,
	`annual_rate_percent` real NOT NULL,
	`tenure_months` integer NOT NULL,
	`emi_paise` integer NOT NULL,
	`total_interest_paise` integer NOT NULL,
	`final_total_paise` integer NOT NULL,
	`start_date` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`closed_at` integer,
	`closure_note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payment_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`loan_id` integer NOT NULL,
	`status` text NOT NULL,
	`amount_paid_paise` integer,
	`note` text,
	`logged_at` integer NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action
);
