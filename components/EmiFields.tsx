"use client";

import { useMemo, useState } from "react";
import {
  calculateEmi,
  calculateInterestOnly,
  calculateTenureFromEmi,
} from "@/lib/emi";
import { rupeesToPaise, paiseToRupees, formatPaise } from "@/lib/currency";
import { Field, TextInput } from "@/components/ui/Field";

export function EmiFields() {
  const [repaymentType, setRepaymentType] = useState<"EMI" | "INTEREST_ONLY">(
    "EMI"
  );
  const [mode, setMode] = useState<"tenure" | "emi">("tenure");
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState(""); // annual %
  const [monthlyRate, setMonthlyRate] = useState(""); // monthly %
  const [rateRupees, setRateRupees] = useState(""); // monthly ₹
  const [tenure, setTenure] = useState("");
  const [desiredEmi, setDesiredEmi] = useState("");

  const principalPaise = rupeesToPaise(Number(principal) || 0);
  const ratePercent = Number(rate) || 0;

  function handleRateChange(value: string) {
    setRate(value);
    if (value === "") {
      setMonthlyRate("");
      setRateRupees("");
      return;
    }
    const annual = Number(value) || 0;
    setMonthlyRate((annual / 12).toFixed(2));
    if (principalPaise > 0) {
      const monthlyInterestPaise = Math.round((principalPaise * annual) / 1200);
      setRateRupees(paiseToRupees(monthlyInterestPaise).toFixed(2));
    } else {
      setRateRupees("");
    }
  }

  function handleMonthlyRateChange(value: string) {
    setMonthlyRate(value);
    if (value === "") {
      setRate("");
      setRateRupees("");
      return;
    }
    const monthly = Number(value) || 0;
    setRate((monthly * 12).toFixed(2));
    if (principalPaise > 0) {
      const monthlyInterestPaise = Math.round((principalPaise * monthly) / 100);
      setRateRupees(paiseToRupees(monthlyInterestPaise).toFixed(2));
    } else {
      setRateRupees("");
    }
  }

  function handleRateRupeesChange(value: string) {
    setRateRupees(value);
    if (principalPaise > 0 && value !== "") {
      const monthlyInterestPaise = rupeesToPaise(Number(value) || 0);
      const monthly = (monthlyInterestPaise / principalPaise) * 100;
      setMonthlyRate(monthly.toFixed(2));
      setRate((monthly * 12).toFixed(2));
    } else {
      setMonthlyRate("");
      setRate("");
    }
  }

  function handlePrincipalChange(value: string) {
    setPrincipal(value);
    const newPrincipalPaise = rupeesToPaise(Number(value) || 0);
    if (newPrincipalPaise > 0 && rate !== "") {
      const monthlyInterestPaise = Math.round(
        (newPrincipalPaise * (Number(rate) || 0)) / 1200
      );
      setRateRupees(paiseToRupees(monthlyInterestPaise).toFixed(2));
    } else {
      setRateRupees("");
    }
  }

  const effectiveMode = repaymentType === "INTEREST_ONLY" ? "tenure" : mode;

  const solvedTenure = useMemo(() => {
    if (effectiveMode !== "emi") return null;
    const emiPaise = rupeesToPaise(Number(desiredEmi) || 0);
    if (!principalPaise || !emiPaise) return null;
    return calculateTenureFromEmi(principalPaise, ratePercent, emiPaise);
  }, [effectiveMode, desiredEmi, principalPaise, ratePercent]);

  const effectiveTenure =
    effectiveMode === "tenure" ? Number(tenure) || 0 : solvedTenure ?? 0;

  const result = useMemo(() => {
    if (!principalPaise || !effectiveTenure) return null;
    if (repaymentType === "INTEREST_ONLY") {
      return calculateInterestOnly(principalPaise, ratePercent, effectiveTenure);
    }
    return calculateEmi(principalPaise, ratePercent, effectiveTenure);
  }, [principalPaise, ratePercent, effectiveTenure, repaymentType]);

  return (
    <div>
      <input type="hidden" name="repaymentType" value={repaymentType} />

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <label
          className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-colors ${
            repaymentType === "EMI"
              ? "border-accent text-foreground"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          <input
            type="radio"
            className="accent-accent"
            checked={repaymentType === "EMI"}
            onChange={() => setRepaymentType("EMI")}
          />
          EMI (equal monthly installments)
        </label>
        <label
          className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-colors ${
            repaymentType === "INTEREST_ONLY"
              ? "border-accent text-foreground"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          <input
            type="radio"
            className="accent-accent"
            checked={repaymentType === "INTEREST_ONLY"}
            onChange={() => setRepaymentType("INTEREST_ONLY")}
          />
          Interest-only (principal at the end)
        </label>
      </div>

      <Field label="Principal amount (₹)">
        <TextInput
          name="principalRupees"
          type="number"
          min="0"
          step="0.01"
          required
          value={principal}
          onChange={(e) => handlePrincipalChange(e.target.value)}
        />
      </Field>

      <div className="mb-4 flex gap-3">
        <div className="flex-1">
          <Field
            label="Annual interest rate (%)"
            hint={rate !== "" ? `= ${monthlyRate || "0"}% / month` : undefined}
          >
            <TextInput
              name="annualRatePercent"
              type="number"
              min="0"
              step="0.01"
              required
              value={rate}
              onChange={(e) => handleRateChange(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex-1">
          <Field
            label="Monthly interest rate (%)"
            hint={monthlyRate !== "" ? `= ${rate || "0"}% p.a.` : undefined}
          >
            <TextInput
              type="number"
              min="0"
              step="0.01"
              value={monthlyRate}
              onChange={(e) => handleMonthlyRateChange(e.target.value)}
            />
          </Field>
        </div>
      </div>

      <Field
        label="Monthly interest amount (₹)"
        hint={
          principalPaise === 0
            ? "Enter principal first to type interest as a ₹ amount"
            : rateRupees !== ""
              ? `= ${rate || "0"}% p.a. (${monthlyRate || "0"}% / month)`
              : undefined
        }
      >
        <TextInput
          type="number"
          min="0"
          step="0.01"
          disabled={principalPaise === 0}
          value={rateRupees}
          onChange={(e) => handleRateRupeesChange(e.target.value)}
        />
      </Field>

      {repaymentType === "EMI" && (
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          <label
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-colors ${
              mode === "tenure"
                ? "border-accent text-foreground"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            <input
              type="radio"
              className="accent-accent"
              checked={mode === "tenure"}
              onChange={() => setMode("tenure")}
            />
            I know the tenure
          </label>
          <label
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-colors ${
              mode === "emi"
                ? "border-accent text-foreground"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            <input
              type="radio"
              className="accent-accent"
              checked={mode === "emi"}
              onChange={() => setMode("emi")}
            />
            I know the desired EMI, solve tenure
          </label>
        </div>
      )}

      {effectiveMode === "tenure" ? (
        <Field label="Tenure (months)">
          <TextInput
            name="tenureMonths"
            type="number"
            min="1"
            step="1"
            required
            value={tenure}
            onChange={(e) => setTenure(e.target.value)}
          />
        </Field>
      ) : (
        <>
          <Field label="Desired EMI (₹)">
            <TextInput
              type="number"
              min="0"
              step="0.01"
              value={desiredEmi}
              onChange={(e) => setDesiredEmi(e.target.value)}
            />
          </Field>
          {/* hidden field carries the solved tenure into the form submit */}
          <input
            type="hidden"
            name="tenureMonths"
            value={solvedTenure ?? ""}
          />
          {desiredEmi && !solvedTenure && (
            <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              That EMI is too low to ever cover the interest on this
              principal.
            </p>
          )}
          {solvedTenure && (
            <p className="mb-4 text-sm text-muted">
              Solved tenure: <strong className="text-foreground">{solvedTenure} months</strong>
            </p>
          )}
        </>
      )}

      {result && effectiveTenure > 0 && (
        <div className="mb-4 rounded-lg border border-border bg-background p-4 text-sm">
          <div className="mb-1.5 flex justify-between">
            <span className="text-muted">Interest</span>
            <span className="font-medium text-foreground">
              {ratePercent}% &middot; {formatPaise(result.totalInterestPaise)}
            </span>
          </div>
          {"monthlyInterestPaise" in result ? (
            <>
              <div className="mb-1.5 flex justify-between">
                <span className="text-muted">Interest / month (months 1-{effectiveTenure - 1})</span>
                <span className="font-medium text-foreground">
                  {formatPaise(result.monthlyInterestPaise)}
                </span>
              </div>
              <div className="mb-1.5 flex justify-between">
                <span className="text-muted">Final month payment</span>
                <span className="font-medium text-foreground">
                  {formatPaise(result.finalMonthPaymentPaise)}
                </span>
              </div>
            </>
          ) : (
            <div className="mb-1.5 flex justify-between">
              <span className="text-muted">EMI / month</span>
              <span className="font-medium text-foreground">
                {formatPaise(result.emiPaise)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-1.5">
            <span className="text-muted">Final total</span>
            <span className="font-semibold text-foreground">
              {formatPaise(result.finalTotalPaise)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
