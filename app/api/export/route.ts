import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { loans, contacts, installments } from "@/lib/db/schema";
import { paiseToRupees } from "@/lib/currency";
import { buildCsv } from "@/lib/csv";

export async function GET() {
  const loanRows = await db
    .select({
      id: loans.id,
      borrower: contacts.name,
      phone: contacts.phone,
      principalPaise: loans.principalPaise,
      annualRatePercent: loans.annualRatePercent,
      repaymentType: loans.repaymentType,
      tenureMonths: loans.tenureMonths,
      emiPaise: loans.emiPaise,
      totalInterestPaise: loans.totalInterestPaise,
      finalTotalPaise: loans.finalTotalPaise,
      startDate: loans.startDate,
      status: loans.status,
      closedAt: loans.closedAt,
    })
    .from(loans)
    .innerJoin(contacts, eq(loans.contactId, contacts.id))
    .orderBy(loans.id);

  const allInstallments = await db.select().from(installments);
  const owedByLoan = new Map<number, number>();
  for (const i of allInstallments) {
    const owed = i.status === "PAID" ? 0 : i.amountPaise - (i.amountPaidPaise ?? 0);
    owedByLoan.set(i.loanId, (owedByLoan.get(i.loanId) ?? 0) + owed);
  }

  const header = [
    "Loan ID",
    "Borrower",
    "Phone",
    "Principal (INR)",
    "Annual Rate (%)",
    "Repayment Type",
    "Tenure (months)",
    "EMI (INR)",
    "Total Interest (INR)",
    "Final Total (INR)",
    "Start Date",
    "Status",
    "Closed Date",
    "Amount Received (INR)",
    "Remaining Balance (INR)",
  ];

  const rows = loanRows.map((loan) => {
    const remainingPaise = owedByLoan.get(loan.id) ?? 0;
    const receivedPaise = loan.finalTotalPaise - remainingPaise;
    return [
      loan.id,
      loan.borrower,
      loan.phone,
      paiseToRupees(loan.principalPaise),
      loan.annualRatePercent,
      loan.repaymentType,
      loan.tenureMonths,
      paiseToRupees(loan.emiPaise),
      paiseToRupees(loan.totalInterestPaise),
      paiseToRupees(loan.finalTotalPaise),
      new Date(loan.startDate).toLocaleDateString("en-IN"),
      loan.status,
      loan.closedAt ? new Date(loan.closedAt).toLocaleDateString("en-IN") : "",
      paiseToRupees(receivedPaise),
      paiseToRupees(remainingPaise),
    ];
  });

  const csv = buildCsv([header, ...rows]);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="happy-lending-export-${date}.csv"`,
    },
  });
}
