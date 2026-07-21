import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CircleOption {
  id: string;
  name: string;
}

interface Props {
  label?: string;
  circles: CircleOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  emptyText?: string;
}

/**
 * Reusable circle multi-select. Collapsed by default; expands inline while
 * the user picks. Stays open between selections; parent decides when to close.
 * Shared surface for tips, photos, meetings and other cross-circle sharing.
 */
const CircleSelector = ({
  label = "Dela med",
  circles,
  value,
  onChange,
  placeholder = "Välj kretsar",
  emptyText = "Du är inte med i någon krets ännu",
}: Props) => {
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((c) => c !== id) : [...value, id]);
  };

  const selectedNames = value
    .map((id) => circles.find((c) => c.id === id)?.name)
    .filter(Boolean) as string[];

  const summary =
    selectedNames.length === 0
      ? placeholder
      : selectedNames.length === 1
        ? selectedNames[0]
        : `${selectedNames[0]} +${selectedNames.length - 1} kretsar`;

  return (
    <div className="space-y-2">
      <div className="text-eyebrow uppercase" style={{ color: "#675332" }}>
        {label}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between py-3 text-left"
      >
        <span className="text-body" style={{ color: "#2B2B2B" }}>
          {summary}
        </span>
        <ChevronDown
          className={cn("w-4 h-4 transition-transform", open && "rotate-180")}
          style={{ color: "hsl(20, 4%, 40%)" }}
        />
      </button>
      {open && (
        <div className="space-y-1 pb-1">
          {circles.length === 0 ? (
            <p className="text-body" style={{ color: "hsl(20, 4%, 40%)" }}>
              {emptyText}
            </p>
          ) : (
            circles.map((c) => {
              const active = value.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className="w-full flex items-center gap-3 py-2.5 text-left"
                >
                  <span
                    className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: active ? "#561828" : "transparent",
                      border: active ? "none" : "1.5px solid #DDD2BF",
                    }}
                  >
                    {active && <Check className="w-3.5 h-3.5" style={{ color: "#fff" }} />}
                  </span>
                  <span className="text-body" style={{ color: "#2B2B2B" }}>
                    {c.name}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default CircleSelector;
