import { useState, useEffect, useCallback, useRef } from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { CalendarIcon, Plus, X, Pencil, TreePine, UtensilsCrossed, Sofa, ShoppingBag, Dumbbell, Coffee, Film, Gamepad2, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, type TranslationKey } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface AvailabilityEntry {
  id: string;
  date: string;
  activities: string[];
  custom_note: string | null;
}

const ACTIVITY_OPTIONS: { key: TranslationKey; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "activityNature", icon: TreePine },
  { key: "activityFoodOut", icon: UtensilsCrossed },
  { key: "activityRelax", icon: Sofa },
  { key: "activityShopping", icon: ShoppingBag },
  { key: "activitySports", icon: Dumbbell },
  { key: "activityCoffee", icon: Coffee },
  { key: "activityMovies", icon: Film },
  { key: "activityGames", icon: Gamepad2 },
];

interface Props {
  userId: string;
  isOwner: boolean;
}

const HangoutAvailability = ({ userId, isOwner }: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [entries, setEntries] = useState<AvailabilityEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data } = await supabase
      .from("hangout_availability")
      .select("*")
      .eq("user_id", userId)
      .gte("date", today)
      .order("date", { ascending: true });
    if (data) setEntries(data as AvailabilityEntry[]);
  }, [userId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    );
  };

  const handleSave = async () => {
    if (!selectedDate || !user) return;
    setSaving(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const { error } = await supabase.from("hangout_availability").upsert(
      {
        user_id: user.id,
        date: dateStr,
        activities: selectedActivities,
        custom_note: customNote.trim() || null,
      },
      { onConflict: "user_id,date" }
    );

    if (error) {
      toast({ title: t("error"), description: t("couldNotSaveAvailability"), variant: "destructive" });
    } else {
      toast({ title: t("availabilitySaved") });
      setShowAdd(false);
      setSelectedDate(undefined);
      setSelectedActivities([]);
      setCustomNote("");
      await fetchEntries();
    }
    setSaving(false);
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("hangout_availability").delete().eq("id", id);
    if (error) {
      toast({ title: t("error"), description: t("couldNotRemoveAvailability"), variant: "destructive" });
    } else {
      toast({ title: t("availabilityRemoved") });
      await fetchEntries();
    }
  };

  const getActivityLabel = (activity: string) => {
    const opt = ACTIVITY_OPTIONS.find((o) => o.key === activity);
    return opt ? t(opt.key) : activity;
  };

  const getActivityIcon = (activity: string) => {
    const opt = ACTIVITY_OPTIONS.find((o) => o.key === activity);
    if (!opt) return null;
    const Icon = opt.icon;
    return <Icon className="w-3 h-3" />;
  };

  return (
    <div className="bg-card border border-border/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          {t("hangoutAvailability")}
        </h3>
        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowAdd(!showAdd)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {t("addAvailability")}
          </Button>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && isOwner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : t("selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => isBefore(date, startOfDay(new Date()))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">{t("activities")}</p>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => toggleActivity(opt.key)}
                        className={cn(
                          "px-2.5 py-1 text-xs rounded-full border transition-all inline-flex items-center gap-1.5",
                          selectedActivities.includes(opt.key)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:border-primary/50"
                        )}
                      >
                        <Icon className="w-3 h-3" /> {t(opt.key)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Input
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder={t("customNote")}
                className="text-sm"
                maxLength={100}
              />

              <Button
                size="sm"
                className="w-full"
                disabled={!selectedDate || saving}
                onClick={handleSave}
              >
                {t("save")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entries list */}
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">{t("noAvailability")}</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start justify-between gap-2 p-2.5 bg-muted/30 rounded-lg"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {format(new Date(entry.date + "T00:00:00"), "EEE, MMM d")}
                </p>
                {entry.activities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {entry.activities.map((a) => (
                      <span
                        key={a}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary inline-flex items-center gap-1"
                      >
                        {getActivityIcon(a)} {getActivityLabel(a)}
                      </span>
                    ))}
                  </div>
                )}
                {entry.custom_note && (
                  <p className="text-xs text-muted-foreground mt-1 italic">"{entry.custom_note}"</p>
                )}
              </div>
              {isOwner && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setSelectedDate(new Date(entry.date + "T00:00:00"));
                      setSelectedActivities([...entry.activities]);
                      setCustomNote(entry.custom_note || "");
                      setShowAdd(true);
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemove(entry.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HangoutAvailability;
