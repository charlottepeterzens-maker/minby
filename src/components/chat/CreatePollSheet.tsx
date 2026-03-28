import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface CreatePollSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (question: string, options: string[]) => void;
  sending: boolean;
}

const CreatePollSheet = ({ open, onOpenChange, onSubmit, sending }: CreatePollSheetProps) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const addOption = () => {
    if (options.length < 4) setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const canSubmit = question.trim() && options.filter((o) => o.trim()).length >= 2;

  const handleSubmit = () => {
    if (!canSubmit || sending) return;
    onSubmit(
      question.trim(),
      options.filter((o) => o.trim())
    );
    setQuestion("");
    setOptions(["", ""]);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        style={{ backgroundColor: "hsl(var(--color-surface))" }}
        className="rounded-t-[20px]"
      >
        <DrawerHeader>
          <DrawerTitle
            className="text-[15px] font-semibold text-center"
            style={{ color: "hsl(var(--color-text-primary))" }}
          >
            Skapa omröstning
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-5 pb-6 space-y-4">
          {/* Question */}
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: "hsl(var(--color-text-secondary))" }}>
              Fråga
            </label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Vad vill du fråga?"
              className="w-full px-3 py-2.5 text-[13px] rounded-[10px] border outline-none"
              style={{
                backgroundColor: "hsl(var(--color-surface-card))",
                borderColor: "hsl(var(--color-surface-raised))",
                color: "hsl(var(--color-text-primary))",
              }}
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium block" style={{ color: "hsl(var(--color-text-secondary))" }}>
              Svarsalternativ
            </label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Alternativ ${i + 1}`}
                  className="flex-1 px-3 py-2.5 text-[13px] rounded-[10px] border outline-none"
                  style={{
                    backgroundColor: "hsl(var(--color-surface-card))",
                    borderColor: "hsl(var(--color-surface-raised))",
                    color: "hsl(var(--color-text-primary))",
                  }}
                />
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(i)}
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}
                  >
                    <X className="w-3.5 h-3.5" style={{ color: "hsl(var(--color-text-secondary))" }} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 4 && (
              <button
                onClick={addOption}
                className="flex items-center gap-1.5 text-[12px] font-medium mt-1"
                style={{ color: "hsl(var(--color-text-secondary))" }}
              >
                <Plus className="w-3.5 h-3.5" />
                Lägg till alternativ
              </button>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || sending}
            className="w-full py-2.5 text-[13px] font-medium text-white disabled:opacity-40 transition-opacity"
            style={{
              backgroundColor: "hsl(var(--color-text-primary))",
              borderRadius: 10,
            }}
          >
            Skicka omröstning
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CreatePollSheet;
