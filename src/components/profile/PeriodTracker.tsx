import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, subDays, differenceInDays } from "date-fns";

interface PeriodEntry {
  id: string;
  date: string;
  flow_level: string;
  symptoms: string[];
  notes: string | null;
}

interface Props {
  section: { id: string; name: string; emoji: string; min_tier: string };
  isOwner: boolean;
}

const flowColors: Record<string, string> = {
  light: "bg-accent/40",
  medium: "bg-accent/70",
  heavy: "bg-accent",
};

const PeriodTracker = ({ section, isOwner }: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [entries, setEntries] = useState<PeriodEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [flowLevel, setFlowLevel] = useState("medium");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  const symptomOptions = [
    { key: "Cramps", label: t("symptomCramps") },
    { key: "Headache", label: t("symptomHeadache") },
    { key: "Fatigue", label: t("symptomFatigue") },
    { key: "Bloating", label: t("symptomBloating") },
    { key: "Mood swings", label: t("symptomMoodSwings") },
    { key: "Back pain", label: t("symptomBackPain") },
  ];

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("period_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(60);
    if (data) setEntries(data as PeriodEntry[]);
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const logToday = async () => {
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const { error } = await supabase.from("period_entries").upsert(
      { user_id: user.id, date: today, flow_level: flowLevel, symptoms: selectedSymptoms },
      { onConflict: "user_id,date" }
    );
    if (error) {
      toast.error(t("couldNotLog"));
    } else {
      toast.success(t("logged"));
      setShowLog(false);
      fetchEntries();
    }
  };

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  // Calculate cycle info
  const periodDates = entries.map((e) => new Date(e.date)).sort((a, b) => b.getTime() - a.getTime());
  const lastPeriod = periodDates[0];
  const daysSinceLast = lastPeriod ? differenceInDays(new Date(), lastPeriod) : null;

  // Simple 14-day calendar
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const entry = entries.find((e) => e.date === dateStr);
    return { date, dateStr, entry };
  });

  return (
    <Card className="border-border/50 shadow-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base flex items-center gap-2">
            {section.name}
          </CardTitle>
          {isOwner && (
            <Button variant="warm" size="sm" className="text-xs" onClick={() => setShowLog(!showLog)}>
              {t("logToday")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Mini calendar */}
        <div className="flex gap-1 mb-3">
          {last14.map((day) => (
            <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-[9px] text-muted-foreground/60">{format(day.date, "d")}</span>
              <div className={`w-full aspect-square rounded-sm ${day.entry ? flowColors[day.entry.flow_level] || "bg-accent/50" : "bg-muted/30"}`} />
            </div>
          ))}
        </div>

        {daysSinceLast !== null && (
          <p className="text-xs text-muted-foreground text-center">
            {t("dayOfCycle", daysSinceLast)}
          </p>
        )}

        {/* Log form */}
        {showLog && isOwner && (
          <div className="mt-3 bg-muted/30 p-3 space-y-2">
            <div>
              <span className="text-xs text-muted-foreground">{t("flowLevel")}</span>
              <Select value={flowLevel} onValueChange={setFlowLevel}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t("flowLight")}</SelectItem>
                  <SelectItem value="medium">{t("flowMedium")}</SelectItem>
                  <SelectItem value="heavy">{t("flowHeavy")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">{t("symptoms")}</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {symptomOptions.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => toggleSymptom(s.key)}
                    className={`px-2 py-0.5 text-[10px] font-medium border transition-all ${
                      selectedSymptoms.includes(s.key)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "text-muted-foreground border-border/50 hover:bg-muted"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <Button size="sm" onClick={logToday} className="w-full text-xs">
              {t("saveEntry")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PeriodTracker;
