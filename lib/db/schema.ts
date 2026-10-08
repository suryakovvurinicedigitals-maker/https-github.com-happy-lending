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
  emiPaise: integer("emi_paise").notNull(),
  totalInterestPaise: integer("total_interest_paise").notNull(),
  finalTotalPaise: integer("final_total_paise").notNull(),
  startDate: integer("start_date").notNull(),
  status: text("status", { enum: ["PENDING", "RECEIVED"] })
    .notNull()
    .default("PENDING"),
  closedAt: integer("closed_at"),
  closureNote: text("closure_note"),
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
