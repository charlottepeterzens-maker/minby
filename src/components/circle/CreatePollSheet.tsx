import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { BottomSheetBody, BottomSheetContent, BottomSheetHeader } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import TextButton from "@/components/ui/text-button";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  onCreate: (data: { question: string; options: string[]; closesAt: string | null }) => Promise<void> | void;
}

/**
 * Create a poll — presentation + local form state only.
 * Persistence is handled by the caller (usePolls).
 */
const CreatePollSheet = ({ open, onOpenChange, saving, onCreate }: Props) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [closesAt, setClosesAt] = useState("");

  const filled = options.map((o) => o.trim()).filter(Boolean);
  const canCreate = question.trim().length > 0 && filled.length >= 2 && !saving;

  const reset = () => {
    setQuestion("");
    setOptions(["", ""]);
    setClosesAt("");
  };

  const submit = async () => {
    if (!canCreate) return;
    await onCreate({ question: question.trim(), options: filled, closesAt: closesAt || null });
    reset();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <BottomSheetContent>
        <BottomSheetHeader title="Starta omröstning" />
        <BottomSheetBody className="px-5 pt-4 pb-8 space-y-5">
          <div className="space-y-2">
            <label className="text-[11px] font-medium" style={{ color: "#675332" }}>Vad ska ni bestämma?</label>
            <Input
              placeholder="T.ex. Vilken dag passar bäst?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium" style={{ color: "#675332" }}>Alternativ</label>
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder={`Alternativ ${i + 1}`}
                  value={o}
                  onChange={(e) =>
                    setOptions((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                  }
                  className="rounded-lg"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    aria-label="Ta bort alternativ"
                    onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                    className="p-2 shrink-0"
                    style={{ color: "#675332" }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {options.length < 8 && (
              <TextButton variant="secondary" onClick={() => setOptions((prev) => [...prev, ""])}>
                Lägg till alternativ
              </TextButton>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium" style={{ color: "#675332" }}>Slutdatum (valfritt)</label>
            <Input
              type="date"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              className="rounded-lg"
            />
          </div>

          <div className="flex justify-end pt-1">
            <TextButton onClick={submit} disabled={!canCreate}>
              {saving ? "Skapar…" : "Skapa omröstning"}
            </TextButton>
          </div>
        </BottomSheetBody>
      </BottomSheetContent>
    </Sheet>
  );
};

export default CreatePollSheet;
