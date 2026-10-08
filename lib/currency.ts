const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatPaise(paise: number): string {
  return formatter.format(paise / 100);
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

const plainFormatter = new Intl.NumberFormat("en-IN", {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * @react-pdf/renderer's standard Helvetica font has no ₹ glyph (it falls
 * back to a garbled character), so PDF output uses "INR" text instead of
 * the ₹ symbol used everywhere else in the app.
 */
export function formatPaiseForPdf(paise: number): string {
  return `INR ${plainFormatter.format(paise / 100)}`;
}
