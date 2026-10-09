import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const loans = sqliteTable("loans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contactId: integer("contact_id")
    .notNull()
    .references(() => contacts.id),
  principalPaise: integer("principal_paise").notNull(),
  annualRatePercent: real("annual_rate_percent").notNull(),
  tenureMonths: integer("tenure_months").notNull(),
  repaymentType: text("repayment_type", { enum: ["EMI", "INTEREST_ONLY"] })
    .notNull()
    .default("EMI"),
  // Only meaningful when repaymentType is "EMI" — flat charges interest on
  // the original principal all tenure long, reducing charges it on the
  // shrinking outstanding balance (the standard bank/NBFC method).
  interestMethod: text("interest_method", { enum: ["FLAT", "REDUCING"] })
    .notNull()
    .default("FLAT"),
  emiPaise: integer("emi_paise").notNull(),
  totalInterestPaise: integer("total_interest_paise").notNull(),
  finalTotalPaise: integer("final_total_paise").notNull(),
  startDate: integer("start_date").notNull(),
  status: text("status", { enum: ["PENDING", "RECEIVED"] })
    .notNull()
    .default("PENDING"),
  closedAt: integer("closed_at"),
  closureNote: text("closure_note"),
  // JSON array of installment IDs that "Mark as Received" auto-paid, so
  // reverting that action knows exactly which installments to restore
  // (installments that were already PAID beforehand are left alone).
  preReceiveSnapshot: text("pre_receive_snapshot"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const paymentLogs = sqliteTable("payment_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  loanId: integer("loan_id")
    .notNull()
    .references(() => loans.id),
  status: text("status", { enum: ["PENDING", "RECEIVED"] }).notNull(),
  amountPaidPaise: integer("amount_paid_paise"),
  note: text("note"),
  loggedAt: integer("logged_at").notNull(),
});

export const reminders = sqliteTable("reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  loanId: integer("loan_id")
    .notNull()
    .references(() => loans.id)
    .unique(),
  firstReminderDate: integer("first_reminder_date").notNull(),
  reminderMonths: integer("reminder_months").notNull(),
  lastSentPeriod: integer("last_sent_period"),
  createdAt: integer("created_at").notNull(),
});

export const installments = sqliteTable("installments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  loanId: integer("loan_id")
    .notNull()
    .references(() => loans.id),
  monthNumber: integer("month_number").notNull(),
  dueDate: integer("due_date").notNull(),
  principalPaise: integer("principal_paise"),
  interestPaise: integer("interest_paise"),
  amountPaise: integer("amount_paise").notNull(),
  amountPaidPaise: integer("amount_paid_paise"),
  // Snapshot of amountPaidPaise from just before the most recent payment
  // action, so a revert can restore the exact prior PARTIAL/PENDING state
  // instead of wiping the installment back to unpaid.
  previousAmountPaidPaise: integer("previous_amount_paid_paise"),
  status: text("status", { enum: ["PENDING", "PARTIAL", "PAID"] })
    .notNull()
    .default("PENDING"),
  paidAt: integer("paid_at"),
  createdAt: integer("created_at").notNull(),
});

export const attachments = sqliteTable("attachments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  loanId: integer("loan_id")
    .notNull()
    .references(() => loans.id),
  kind: text("kind", { enum: ["SCREENSHOT", "SIGNATURE"] }).notNull(),
  signerRole: text("signer_role", { enum: ["LENDER", "BORROWER"] }),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type").notNull(),
  originalFileName: text("original_file_name"),
  createdAt: integer("created_at").notNull(),
});
