import { ReactNode } from "react";

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface p-6 shadow-sm transition-all duration-150 ${
        hover ? "hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
