import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";

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
    format(parseISO(d), "EEE d MMM", { locale: sv }).replace(".", "");

  const dateText = endDate
    ? `${formatDate(startDate)} – ${formatDate(endDate)}`
    : formatDate(startDate);

  const typeLabel = suggestedType === "confirmed" ? "Plan" : "Ledig";

  return (
    <div
      className="mx-4 mb-2 p-3 space-y-2"
      style={{
        backgroundColor: "#FFFFFF",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        borderRadius: 12,
      }}
    >
      <p className="text-[12px] font-medium" style={{ color: "#3C2A4D" }}>
        Lägg till i Hitta på något?
      </p>
      <div className="flex items-center gap-2">
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }}
        >
          {dateText}
        </span>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: suggestedType === "confirmed" ? "#3C2A4D" : "#EDE8F4",
            color: suggestedType === "confirmed" ? "#C9B8D8" : "#3C2A4D",
          }}
        >
          {typeLabel}
        </span>
        <span className="text-[11px]" style={{ color: "#7A6A85" }}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        <button
          onClick={onAdd}
          className="px-4 py-1.5 text-[12px] font-medium rounded-[8px]"
          style={{ backgroundColor: "#EAF2E8", color: "#1F4A1A" }}
        >
          Lägg till
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-1.5 text-[12px] font-medium rounded-[8px]"
          style={{ backgroundColor: "#F0ECE7", color: "#7A6A85" }}
        >
          Hoppa över
        </button>
      </div>
    </div>
  );
};

export default DateSuggestionCard;
