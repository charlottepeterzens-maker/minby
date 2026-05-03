import { parseISO } from "date-fns";
import { monthShort, weekdayShort } from "@/utils/months";

interface DateSuggestionCardProps {
  startDate: string;
  endDate?: string;
  label: string;
  groupName: string;
  suggestedType: "available" | "confirmed";
  onAdd: () => void;
  onDismiss: () => void;
}

const DateSuggestionCard = ({
  startDate,
  endDate,
  label,
  groupName,
  suggestedType,
  onAdd,
  onDismiss,
}: DateSuggestionCardProps) => {
  const formatDate = (d: string) =>
    (() => { const _d = parseISO(d); return `${weekdayShort(_d)} ${_d.getDate()} ${monthShort(_d)}`; })();

  const dateText = endDate
    ? `${formatDate(startDate)} – ${formatDate(endDate)}`
    : formatDate(startDate);

  const typeLabel = suggestedType === "confirmed" ? "Plan" : "Ledig";

  return (
    <div
      className="mx-4 mb-2 p-3 space-y-2"
      style={{
        backgroundColor: "hsl(var(--color-surface-card))",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        borderRadius: 8,
      }}
    >
      <p className="text-[12px] font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
        Lägg till i Hitta på något?
      </p>
      <div className="flex items-center gap-2">
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "hsl(var(--color-surface-raised))", color: "hsl(var(--color-text-primary))" }}
        >
          {dateText}
        </span>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: suggestedType === "confirmed" ? "#561828" : "#D4E8F5",
            color: suggestedType === "confirmed" ? "#D4E8F5" : "#561828",
          }}
        >
          {typeLabel}
        </span>
        <span className="text-[11px]" style={{ color: "hsl(var(--color-text-secondary))" }}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        <button
          onClick={onAdd}
          className="px-4 py-1.5 text-[12px] font-medium rounded-lg"
          style={{ backgroundColor: "hsl(var(--color-surface-sage))", color: "hsl(var(--color-accent-sage-text))" }}
        >
          Lägg till
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-1.5 text-[12px] font-medium rounded-lg"
          style={{ backgroundColor: "#F0ECE7", color: "hsl(var(--color-text-secondary))" }}
        >
          Hoppa över
        </button>
      </div>
    </div>
  );
};

export default DateSuggestionCard;
