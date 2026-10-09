"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { formatPaise } from "@/lib/currency";

interface LoanRow {
  id: number;
  principalPaise: number;
  finalTotalPaise: number;
  status: "PENDING" | "RECEIVED";
  repaymentType: "EMI" | "INTEREST_ONLY";
  contactName: string;
  overdue: boolean;
}

type Filter = "ALL" | "PENDING" | "OVERDUE" | "RECEIVED";
type TypeFilter = "ALL" | "EMI" | "INTEREST_ONLY";

const filters: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "OVERDUE", label: "Overdue" },
  { key: "RECEIVED", label: "Received" },
];

const typeFilters: { key: TypeFilter; label: string }[] = [
  { key: "ALL", label: "All types" },
  { key: "EMI", label: "EMI" },
  { key: "INTEREST_ONLY", label: "Interest only" },
];

export function LoanListFilter({ loans }: { loans: LoanRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");

  const filtered = loans.filter((loan) => {
    if (filter === "PENDING" && loan.status !== "PENDING") return false;
    if (filter === "RECEIVED" && loan.status !== "RECEIVED") return false;
    if (filter === "OVERDUE" && !loan.overdue) return false;
    if (typeFilter !== "ALL" && loan.repaymentType !== typeFilter) return false;
    if (query && !loan.contactName.toLowerCase().includes(query.trim().toLowerCase()))
      return false;
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <TextInput
          type="text"
          placeholder="Search borrower..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <Button
              key={f.key}
              type="button"
              size="sm"
              variant={filter === f.key ? "primary" : "secondary"}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {typeFilters.map((f) => (
          <Button
            key={f.key}
            type="button"
            size="sm"
            variant={typeFilter === f.key ? "primary" : "secondary"}
            onClick={() => setTypeFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          No loans match this search.
        </p>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((r) => (
            <Link key={r.id} href={`/loans/${r.id}`}>
              <Card hover className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-foreground">{r.contactName}</p>
                  <p className="text-sm text-muted">
                    {formatPaise(r.principalPaise)} principal &middot; Total{" "}
                    {formatPaise(r.finalTotalPaise)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {r.overdue ? (
                    <span className="text-xs font-medium text-danger">Overdue</span>
                  ) : (
                    <StatusBadge status={r.status} />
                  )}
                  <ChevronRight className="h-4 w-4 text-muted" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
