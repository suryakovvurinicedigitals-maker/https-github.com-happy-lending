"use client";

import { useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { saveReminder, deleteReminder } from "@/actions/reminders";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";

function toDateInputValue(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function ReminderSettings({
  loanId,
  defaultMonths,
  reminder,
}: {
  loanId: number;
  defaultMonths: number;
  reminder: {
    firstReminderDate: number;
    reminderMonths: number;
    lastSentPeriod: number | null;
  } | null;
}) {
  const [date, setDate] = useState(
    reminder ? toDateInputValue(reminder.firstReminderDate) : ""
  );
  const [months, setMonths] = useState(
    String(reminder?.reminderMonths ?? defaultMonths)
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (!date || !months) return;
    const timestamp = new Date(`${date}T00:00:00`).getTime();
    startTransition(async () => {
      await saveReminder(loanId, timestamp, Number(months));
      setSaved(true);
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await deleteReminder(loanId);
      setDate("");
      setMonths(String(defaultMonths));
      setSaved(false);
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        <BellRing className="h-4 w-4 text-muted" />
        Monthly payment reminder
      </div>

      <div className="mb-3 flex gap-3">
        <div className="flex-1">
          <Field label="First reminder date">
            <TextInput
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSaved(false);
              }}
            />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Remind for (months)">
            <TextInput
              type="number"
              min="1"
              step="1"
              value={months}
              onChange={(e) => {
                setMonths(e.target.value);
                setSaved(false);
              }}
            />
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isPending || !date || !months}
        >
          {isPending ? "Saving..." : reminder ? "Update reminder" : "Set reminder"}
        </Button>
        {reminder && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRemove}
            disabled={isPending}
          >
            Remove
          </Button>
        )}
        {saved && <span className="text-sm text-success">Saved.</span>}
      </div>

      {reminder && (
        <p className="mt-2 text-xs text-muted">
          Reminds every month on the {new Date(reminder.firstReminderDate).getDate()}
          {ordinalSuffix(new Date(reminder.firstReminderDate).getDate())}, for{" "}
          {reminder.reminderMonths} month{reminder.reminderMonths === 1 ? "" : "s"}
          {reminder.lastSentPeriod !== null
            ? ` — last sent for month ${reminder.lastSentPeriod + 1}.`
            : " — none sent yet."}
          {" "}It will show up on the dashboard as due; click to send.
        </p>
      )}
    </div>
  );
}

function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}
