PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`address` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_contacts`("id", "profile_id", "name", "phone", "email", "address", "notes", "created_at", "updated_at") SELECT "id", "profile_id", "name", "phone", "email", "address", "notes", "created_at", "updated_at" FROM `contacts`;--> statement-breakpoint
DROP TABLE `contacts`;--> statement-breakpoint
ALTER TABLE `__new_contacts` RENAME TO `contacts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_loans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`contact_id` integer NOT NULL,
	`principal_paise` integer NOT NULL,
	`annual_rate_percent` real NOT NULL,
	`tenure_months` integer NOT NULL,
	`repayment_type` text DEFAULT 'EMI' NOT NULL,
	`interest_method` text DEFAULT 'FLAT' NOT NULL,
	`emi_paise` integer NOT NULL,
	`total_interest_paise` integer NOT NULL,
	`final_total_paise` integer NOT NULL,
	`start_date` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`closed_at` integer,
	`closure_note` text,
	`pre_receive_snapshot` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_loans`("id", "profile_id", "contact_id", "principal_paise", "annual_rate_percent", "tenure_months", "repayment_type", "interest_method", "emi_paise", "total_interest_paise", "final_total_paise", "start_date", "status", "closed_at", "closure_note", "pre_receive_snapshot", "created_at", "updated_at") SELECT "id", "profile_id", "contact_id", "principal_paise", "annual_rate_percent", "tenure_months", "repayment_type", "interest_method", "emi_paise", "total_interest_paise", "final_total_paise", "start_date", "status", "closed_at", "closure_note", "pre_receive_snapshot", "created_at", "updated_at" FROM `loans`;--> statement-breakpoint
DROP TABLE `loans`;--> statement-breakpoint
ALTER TABLE `__new_loans` RENAME TO `loans`;