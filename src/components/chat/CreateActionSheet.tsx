import { useState } from "react";
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
  
  // Poll state
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  
  // Plan state
  const [planTitle, setPlanTitle] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [planLocation, setPlanLocation] = useState("");

  // Handle prefill when opening
  const prevOpen = useRef(open);
  useEffect(() => {
    if (open && !prevOpen.current && prefill) {
      setMode("plan");
      setPlanTitle(prefill.title);
      setPlanDate(prefill.dateText);
    }
    prevOpen.current = open;
  }, [open, prefill]);

  const inputStyle = {
    backgroundColor: "#FFFFFF",
    borderColor: "#EDE8F4",
    color: "#3C2A4D",
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent style={{ backgroundColor: "#F7F3EF" }} className="rounded-t-[20px]">
        <DrawerHeader>
          <DrawerTitle className="text-[15px] font-semibold text-center" style={{ color: "#3C2A4D" }}>
            {mode === "choose" ? "Vad vill du göra?" : mode === "poll" ? "Skapa omröstning" : "Föreslå plan"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-5 pb-6">
          {mode === "choose" && (
            <div className="space-y-2">
              <button
                onClick={() => setMode("plan")}
                className="w-full flex items-center gap-3 p-3.5 rounded-[12px] text-left transition-colors hover:opacity-90"
                style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE8F4" }}
              >
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: "#EAF2E8" }}>
                  <CalendarPlus className="w-4.5 h-4.5" style={{ color: "#1F4A1A" }} />
                </div>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "#3C2A4D" }}>Föreslå en plan</p>
                  <p className="text-[11px]" style={{ color: "#7A6A85" }}>Datum, aktivitet och plats</p>
                </div>
              </button>

              <button
                onClick={() => setMode("poll")}
                className="w-full flex items-center gap-3 p-3.5 rounded-[12px] text-left transition-colors hover:opacity-90"
                style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE8F4" }}
              >
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: "#EDE8F4" }}>
                  <BarChart3 className="w-4.5 h-4.5" style={{ color: "#3C2A4D" }} />
                </div>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "#3C2A4D" }}>Skapa omröstning</p>
                  <p className="text-[11px]" style={{ color: "#7A6A85" }}>Ställ en fråga med svarsalternativ</p>
                </div>
              </button>
            </div>
          )}

          {mode === "poll" && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: "#7A6A85" }}>Fråga</label>
                <input
                  value={question} onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Vad vill du fråga?"
                  className="w-full px-3 py-2.5 text-[13px] rounded-[10px] border outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-medium block" style={{ color: "#7A6A85" }}>Svarsalternativ</label>
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={opt} onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Alternativ ${i + 1}`}
                      className="flex-1 px-3 py-2.5 text-[13px] rounded-[10px] border outline-none"
                      style={inputStyle}
                    />
                    {options.length > 2 && (
                      <button onClick={() => removeOption(i)} className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: "#EDE8F4" }}>
                        <X className="w-3.5 h-3.5" style={{ color: "#7A6A85" }} />
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 4 && (
                  <button onClick={addOption} className="flex items-center gap-1.5 text-[12px] font-medium mt-1" style={{ color: "#7A6A85" }}>
                    <Plus className="w-3.5 h-3.5" /> Lägg till alternativ
                  </button>
                )}
              </div>
              <button
                onClick={handleSubmitPoll} disabled={!canSubmitPoll || sending}
                className="w-full py-2.5 text-[13px] font-medium text-white disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: "#3C2A4D", borderRadius: 10 }}
              >
                Skicka omröstning
              </button>
            </div>
          )}

          {mode === "plan" && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: "#7A6A85" }}>Vad ska ni göra?</label>
                <input
                  value={planTitle} onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder="T.ex. Middag, Fika, Vandring..."
                  className="w-full px-3 py-2.5 text-[13px] rounded-[10px] border outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: "#7A6A85" }}>När?</label>
                <input
                  value={planDate} onChange={(e) => setPlanDate(e.target.value)}
                  placeholder="T.ex. Torsdag kväll, Nästa helg..."
                  className="w-full px-3 py-2.5 text-[13px] rounded-[10px] border outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: "#7A6A85" }}>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Var? <span className="font-normal">(valfritt)</span>
                  </span>
                </label>
                <input
                  value={planLocation} onChange={(e) => setPlanLocation(e.target.value)}
                  placeholder="T.ex. Hemma hos mig, Café..."
                  className="w-full px-3 py-2.5 text-[13px] rounded-[10px] border outline-none"
                  style={inputStyle}
                />
              </div>
              <button
                onClick={handleSubmitPlan} disabled={!canSubmitPlan || sending}
                className="w-full py-2.5 text-[13px] font-medium text-white disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: "#3C2A4D", borderRadius: 10 }}
              >
                Föreslå plan
              </button>
            </div>
          )}

          {mode !== "choose" && (
            <button
              onClick={() => setMode("choose")}
              className="w-full mt-2 py-2 text-[12px] font-medium rounded-[10px]"
              style={{ color: "#7A6A85" }}
            >
              ← Tillbaka
            </button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CreateActionSheet;
