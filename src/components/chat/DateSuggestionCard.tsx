import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";

interface DateSuggestionCardProps {
  startDate: string;
  endDate?: string;
  label: string;
  groupName: string;
  onAdd: () => void;
  onDismiss: () => void;
}

const DateSuggestionCard = ({
  startDate,
  endDate,
  label,
  groupName,
  onAdd,
  onDismiss,
}: DateSuggestionCardProps) => {
  const formatDate = (d: string) =>
    format(parseISO(d), "d MMM", { locale: sv });

  const dateText = endDate
    ? `${formatDate(startDate)} – ${formatDate(endDate)}`
    : formatDate(startDate);

  return (
    <div
      className="mx-4 mb-2 p-3 space-y-2"
      style={{
        backgroundColor: "#FFFFFF",
        border: "0.5px solid #EDE8F4",
        borderRadius: 12,
      }}
    >
      <p className="text-[12px] font-medium" style={{ color: "#3C2A4D" }}>
        📅 Vill du lägga till detta i din kalender?
      </p>
      <div className="flex items-center gap-2">
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "#EDE8F3", color: "#3C2A4D" }}
        >
          {dateText}
        </span>
        <span className="text-[11px]" style={{ color: "#7A6A85" }}>
          {label} · {groupName}
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
