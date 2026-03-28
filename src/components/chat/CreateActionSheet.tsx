import { useState, useRef, useEffect } from "react";
import { BarChart3, CalendarPlus, X, Plus, MapPin } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

interface CreateActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitPoll: (question: string, options: string[]) => void;
  onSubmitPlan: (title: string, dateText: string, location: string | null) => void;
  sending: boolean;
  prefill?: { title: string; dateText: string } | null;
}

type Mode = "choose" | "poll" | "plan";

const CreateActionSheet = ({ open, onOpenChange, onSubmitPoll, onSubmitPlan, sending, prefill }: CreateActionSheetProps) => {
  const [mode, setMode] = useState<Mode>("choose");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [planTitle, setPlanTitle] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [planLocation, setPlanLocation] = useState("");

  const prevOpen = useRef(open);
  useEffect(() => {
    if (open && !prevOpen.current && prefill) {
      setMode("plan");
      setPlanTitle(prefill.title);
      setPlanDate(prefill.dateText);
    }
    prevOpen.current = open;
  }, [open, prefill]);

  const resetAll = () => {
    setMode("choose");
    setQuestion("");
    setOptions(["", ""]);
    setPlanTitle("");
    setPlanDate("");
    setPlanLocation("");
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetAll();
    onOpenChange(v);
  };

  const addOption = () => { if (options.length < 4) setOptions([...options, ""]); };
  const removeOption = (i: number) => { if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i)); };
  const updateOption = (i: number, val: string) => { const u = [...options]; u[i] = val; setOptions(u); };
  const canSubmitPoll = question.trim() && options.filter((o) => o.trim()).length >= 2;
  const canSubmitPlan = planTitle.trim() && planDate.trim();

  const handleSubmitPoll = () => {
    if (!canSubmitPoll || sending) return;
    onSubmitPoll(question.trim(), options.filter((o) => o.trim()));
    handleOpenChange(false);
  };

  const handleSubmitPlan = () => {
    if (!canSubmitPlan || sending) return;
    onSubmitPlan(planTitle.trim(), planDate.trim(), planLocation.trim() || null);
    handleOpenChange(false);
  };

  const inputStyle = { backgroundColor: "hsl(var(--color-surface-card))", borderColor: "hsl(var(--color-surface-raised))", color: "hsl(var(--color-text-primary))" };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent style={{ backgroundColor: "hsl(var(--color-surface))" }} className="rounded-t-[20px]">
        <DrawerHeader>
          <DrawerTitle className="text-[15px] font-semibold text-center" style={{ color: "hsl(var(--color-text-primary))" }}>
            {mode === "choose" ? "Vad vill du göra?" : mode === "poll" ? "Skapa omröstning" : "Föreslå plan"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-5 pb-6">
          {mode === "choose" && (
            <div className="space-y-2">
              <button onClick={() => setMode("plan")}
                className="w-full flex items-center gap-3 p-3.5 rounded-[12px] text-left transition-colors hover:opacity-90"
                style={{ backgroundColor: "hsl(var(--color-surface-card))" }}>
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: "hsl(var(--color-surface-sage))" }}>
                  <CalendarPlus className="w-4 h-4" style={{ color: "hsl(var(--color-accent-sage-text))" }} />
                </div>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>Föreslå en plan</p>
                  <p className="text-[11px]" style={{ color: "hsl(var(--color-text-secondary))" }}>Datum, aktivitet och plats</p>
                </div>
              </button>
              <button onClick={() => setMode("poll")}
                className="w-full flex items-center gap-3 p-3.5 rounded-[12px] text-left transition-colors hover:opacity-90"
                style={{ backgroundColor: "hsl(var(--color-surface-card))" }}>
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}>
                  <BarChart3 className="w-4 h-4" style={{ color: "hsl(var(--color-text-primary))" }} />
                </div>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>Skapa omröstning</p>
                  <p className="text-[11px]" style={{ color: "hsl(var(--color-text-secondary))" }}>Ställ en fråga med svarsalternativ</p>
                </div>
              </button>
            </div>
          )}

          {mode === "poll" && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: "hsl(var(--color-text-secondary))" }}>Fråga</label>
                <input value={question} onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Vad vill du fråga?" className="w-full px-3 py-2.5 text-[13px] rounded-[10px] border outline-none" style={inputStyle} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-medium block" style={{ color: "hsl(var(--color-text-secondary))" }}>Svarsalternativ</label>
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={opt} onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Alternativ ${i + 1}`} className="flex-1 px-3 py-2.5 text-[13px] rounded-[10px] border outline-none" style={inputStyle} />
                    {options.length > 2 && (
                      <button onClick={() => removeOption(i)} className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}>
                        <X className="w-3.5 h-3.5" style={{ color: "hsl(var(--color-text-secondary))" }} />
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 4 && (
                  <button onClick={addOption} className="flex items-center gap-1.5 text-[12px] font-medium mt-1" style={{ color: "hsl(var(--color-text-secondary))" }}>
                    <Plus className="w-3.5 h-3.5" /> Lägg till alternativ
                  </button>
                )}
              </div>
              <button onClick={handleSubmitPoll} disabled={!canSubmitPoll || sending}
                className="w-full py-2.5 text-[13px] font-medium text-white disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: "hsl(var(--color-text-primary))", borderRadius: 10 }}>
                Skicka omröstning
              </button>
            </div>
          )}

          {mode === "plan" && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: "hsl(var(--color-text-secondary))" }}>Vad ska ni göra?</label>
                <input value={planTitle} onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder="T.ex. Middag, Fika, Vandring..." className="w-full px-3 py-2.5 text-[13px] rounded-[10px] border outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: "hsl(var(--color-text-secondary))" }}>När?</label>
                <input value={planDate} onChange={(e) => setPlanDate(e.target.value)}
                  placeholder="T.ex. Torsdag kväll, Nästa helg..." className="w-full px-3 py-2.5 text-[13px] rounded-[10px] border outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: "hsl(var(--color-text-secondary))" }}>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Var? <span className="font-normal">(valfritt)</span></span>
                </label>
                <input value={planLocation} onChange={(e) => setPlanLocation(e.target.value)}
                  placeholder="T.ex. Hemma hos mig, Café..." className="w-full px-3 py-2.5 text-[13px] rounded-[10px] border outline-none" style={inputStyle} />
              </div>
              <button onClick={handleSubmitPlan} disabled={!canSubmitPlan || sending}
                className="w-full py-2.5 text-[13px] font-medium text-white disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: "hsl(var(--color-text-primary))", borderRadius: 10 }}>
                Föreslå plan
              </button>
            </div>
          )}

          {mode !== "choose" && (
            <button onClick={() => setMode("choose")} className="w-full mt-2 py-2 text-[12px] font-medium rounded-[10px]" style={{ color: "hsl(var(--color-text-secondary))" }}>
              ← Tillbaka
            </button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CreateActionSheet;
