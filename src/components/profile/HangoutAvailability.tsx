import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import AddHangoutFreeText from "@/components/profile/AddHangoutFreeText";
import HangoutDetailSheet from "@/components/profile/HangoutDetailSheet";

interface AvailabilityEntry {
  id: string;
  date: string;
  activities: string[];
  custom_note: string | null;
  entry_type: string;
  user_id: string;
}

const ACTIVITY_MAP: Record<string, string> = {
  activityNature: "Natur",
  activityFoodOut: "Äta ute",
  activityRelax: "Hänga",
  activityShopping: "Shopping",
  activitySports: "Sport",
  activityCoffee: "Fika",
  activityMovies: "Bio",
  activityGames: "Spel",
};

interface Props {
  userId: string;
  isOwner: boolean;
  openEntryId?: string | null;
  onOpenedEntry?: () => void;
}

const HangoutAvailability = ({ userId, isOwner, openEntryId, onOpenedEntry }: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [entries, setEntries] = useState<AvailabilityEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AvailabilityEntry | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmedCounts, setConfirmedCounts] = useState<Map<string, number>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Activity group map: activity name → array of entries
  const [activityGroupMap, setActivityGroupMap] = useState<Map<string, AvailabilityEntry[]>>(new Map());

  // Prefilled activity name for AddHangoutSheet
  const [prefillActivityName, setPrefillActivityName] = useState<string | undefined>();

  const getActivityLabel = (key: string) => ACTIVITY_MAP[key] || key;

  const getActivityName = (entry: AvailabilityEntry) => {
    return entry.activities.length > 0 ? getActivityLabel(entry.activities[0]) : entry.custom_note || "";
  };

  const fetchEntries = useCallback(async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data } = await supabase
      .from("hangout_availability")
      .select("*")
      .eq("user_id", userId)
      .gte("date", today)
      .order("date", { ascending: true });
    if (data) {
      const typedData = data as AvailabilityEntry[];
      setEntries(typedData);

      // Build activity group map
      const groupMap = new Map<string, AvailabilityEntry[]>();
      for (const entry of typedData) {
        if (entry.entry_type === "activity") {
          const name = entry.activities.length > 0 ? getActivityLabel(entry.activities[0]) : entry.custom_note || "";
          if (!groupMap.has(name)) {
            groupMap.set(name, []);
          }
          groupMap.get(name)!.push(entry);
        }
      }
      setActivityGroupMap(groupMap);

      const ids = typedData.map((e) => e.id);
      if (ids.length > 0) {
        const { data: tags } = await supabase
          .from("hangout_tagged_friends")
          .select("availability_id")
          .in("availability_id", ids);
        const counts = new Map<string, number>();
        tags?.forEach((t: any) => {
          counts.set(t.availability_id, (counts.get(t.availability_id) || 0) + 1);
        });
        setConfirmedCounts(counts);
      }
    }
  }, [userId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Open a specific entry from notification
  useEffect(() => {
    if (openEntryId && entries.length > 0) {
      const entry = entries.find((e) => e.id === openEntryId);
      if (entry) {
        setSelectedEntry(entry);
        setSheetOpen(true);
        onOpenedEntry?.();
      }
    }
  }, [openEntryId, entries, onOpenedEntry]);

  const handleCardClick = (entry: AvailabilityEntry) => {
    setSelectedEntry(entry);
    setSheetOpen(true);
  };

  // Scroll tracking for pagination dots
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cardWidth = 130;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setCurrentIndex(idx);
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "confirmed":
        return { bg: "#EDE8F4", border: "#C9B8D8" };
      case "activity":
        return { bg: "#EAF2E8", border: "#B5CCBF" };
      default:
        return { bg: "#F7F3EF", border: "#EDE8F4" };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "confirmed":
        return "häng med";
      case "activity":
        return "sugen på";
      default:
        return "vill ses";
    }
  };

  // Group activity entries by activity name
  interface GroupedActivity {
    id: string;
    entry_type: "activity";
    activityName: string;
    dates: string[];
    ids: string[];
  }

  type CarouselItem = AvailabilityEntry | GroupedActivity;

  const isGrouped = (item: CarouselItem): item is GroupedActivity => "dates" in item && "ids" in item;

  const buildCarouselItems = (): CarouselItem[] => {
    const nonActivity: AvailabilityEntry[] = [];
    const activityMap = new Map<string, { entries: AvailabilityEntry[] }>();

    for (const entry of entries) {
      if (entry.entry_type === "activity") {
        const name = getActivityName(entry);
        if (!activityMap.has(name)) {
          activityMap.set(name, { entries: [] });
        }
        activityMap.get(name)!.entries.push(entry);
      } else {
        nonActivity.push(entry);
      }
    }

    const grouped: GroupedActivity[] = [];
    activityMap.forEach((val, name) => {
      grouped.push({
        id: val.entries[0].id,
        entry_type: "activity",
        activityName: name,
        dates: val.entries.map((e) => e.date),
        ids: val.entries.map((e) => e.id),
      });
    });

    return [...nonActivity, ...grouped];
  };

  const carouselItems = buildCarouselItems();
  const totalCards = carouselItems.length + (isOwner ? 1 : 0);

  // Get grouped entries for the currently selected entry
  const getGroupedEntriesForSelected = (): AvailabilityEntry[] | undefined => {
    if (!selectedEntry || selectedEntry.entry_type !== "activity") return undefined;
    const name = getActivityName(selectedEntry);
    return activityGroupMap.get(name);
  };

  const handleAddActivityDate = (activityNameParam: string) => {
    setPrefillActivityName(activityNameParam);
    setShowAdd(true);
  };

  return (
    <div style={{ padding: "0 0 20px 0" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-fraunces font-normal text-[16px] mt-6 mb-3" style={{ color: "hsl(var(--color-text-primary))" }}>
          Ses vi?
        </h2>
        {isOwner && (
          <button
            onClick={() => setShowAdd(true)}
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}
          >
            <Plus className="w-3 h-3" style={{ color: "hsl(var(--color-text-primary))" }} />
          </button>
        )}
      </div>

      <AddHangoutFreeText
        open={showAdd}
        onOpenChange={(v) => {
          setShowAdd(v);
          if (!v) setPrefillActivityName(undefined);
        }}
        onCreated={fetchEntries}
      />

      {entries.length === 0 && !isOwner ? (
        <motion.div
          className="flex flex-col items-center py-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <motion.div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
            style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
           >
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: "hsl(var(--color-border-lavender))", opacity: 0.5 }} />
          </motion.div>
          <p className="text-[12px] text-center" style={{ color: "hsl(var(--color-text-muted))" }}>
            Inga förslag just nu
          </p>
        </motion.div>
      ) : entries.length === 0 && isOwner ? (
        <motion.div
          className="flex flex-col items-center py-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative mb-4" style={{ width: 100, height: 50 }}>
            {[
              { left: 4, top: 0, bg: "#EDE8F4", delay: 0.15 },
              { left: 32, top: 4, bg: "#EAF2E8", delay: 0.25 },
              { left: 54, top: 0, bg: "#FCF0F3", delay: 0.35 },
            ].map((c, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{ left: c.left, top: c.top, width: 36, height: 36, backgroundColor: c.bg, zIndex: i }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: c.delay, type: "spring", stiffness: 260, damping: 20 }}
              />
            ))}
          </div>
          <motion.p
            className="text-center font-medium"
            style={{ fontSize: 13, color: "hsl(var(--color-text-primary))" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Vad vill du hitta på?
          </motion.p>
          <motion.p
            className="text-center mt-1"
            style={{ fontSize: 12, color: "hsl(var(--color-text-secondary))", maxWidth: 200 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Dela ett datum eller en idé med din krets
          </motion.p>
          <motion.button
            onClick={() => setShowAdd(true)}
            className="mt-3 text-white font-medium"
            style={{
              backgroundColor: "hsl(var(--color-text-primary))",
              borderRadius: 8,
              padding: "8px 20px",
              fontSize: 13,
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            whileTap={{ scale: 0.95 }}
          >
            Kom igång
          </motion.button>
        </motion.div>
      ) : (
        <>
          {/* Carousel */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-2.5 overflow-x-scroll pb-2 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {carouselItems.map((item) => {
              if (isGrouped(item)) {
                const totalFriends = item.ids.reduce((sum, id) => sum + (confirmedCounts.get(id) || 0), 0);
                return (
                  <button
                    key={`grouped-${item.activityName}`}
                    onClick={() => {
                      const first = entries.find((e) => e.id === item.id);
                      if (first) handleCardClick(first);
                    }}
                    className="flex-shrink-0 flex flex-col text-left"
                    style={{
                      width: 160,
                      minHeight: 100,
                      borderRadius: 8,
                      padding: 16,
                      backgroundColor: "hsl(var(--color-surface-card))",
                      border: "none",
                    }}
                  >
                    <div className="flex flex-wrap gap-1 mb-1">
                      {item.dates.map((d, i) => {
                        const dateObj = new Date(d + "T00:00:00");
                        const label = format(dateObj, "EEE d MMM", { locale: sv }).replace(".", "");
                        return (
                          <span
                            key={i}
                            className="text-[10px]"
                            style={{ color: "hsl(var(--color-text-secondary))" }}
                          >
                            {label}{i < item.dates.length - 1 ? "," : ""}
                          </span>
                        );
                      })}
                    </div>
                    <p className="text-[11px] mb-1.5" style={{ color: "hsl(var(--color-text-faint))" }}>
                      sugen på · {item.activityName}
                    </p>
                    {totalFriends > 0 && (
                      <span className="text-[10px] mt-auto" style={{ color: "hsl(var(--color-text-secondary))" }}>
                        {totalFriends} intresserade
                      </span>
                    )}
                  </button>
                );
              }

              const dateObj = new Date(item.date + "T00:00:00");
              const dateDisplay = format(dateObj, "EEE d MMMM", { locale: sv }).replace(".", "");
              const intentLabel = getTypeLabel(item.entry_type);
              const activityNameLabel =
                item.activities.length > 0
                  ? item.activities.map((a) => ACTIVITY_MAP[a] || a).join(", ")
                  : null;
              const rawDescription = item.custom_note || "";
              const isFromGroup = rawDescription.includes("— via ");

              // Deduplicate: if custom_note already contains the activity text (or vice versa), skip one
              const textsAreSimilar =
                activityNameLabel && rawDescription &&
                (rawDescription.toLowerCase().includes(activityNameLabel.toLowerCase()) ||
                 activityNameLabel.toLowerCase().includes(rawDescription.toLowerCase()));
              const description = textsAreSimilar ? rawDescription : rawDescription;
              const showActivityInLabel = !textsAreSimilar;
              const isSelected = selectedEntry?.id === item.id && sheetOpen;

              return (
                <button
                  key={item.id}
                  onClick={() => handleCardClick(item)}
                  className="flex-shrink-0 flex flex-col text-left transition-all"
                  style={{
                    width: 160,
                    minHeight: 100,
                    borderRadius: 8,
                    padding: 16,
                    backgroundColor: "hsl(var(--color-surface-card))",
                    border: isSelected ? "1.5px solid #3C2A4D" : "none",
                  }}
                >
                  <p
                    className="text-[12px] mb-0.5"
                    style={{ color: "hsl(var(--color-text-secondary))", fontWeight: 400 }}
                  >
                    {dateDisplay}
                  </p>
                  <p className="text-[11px] mb-1.5" style={{ color: "hsl(var(--color-text-faint))" }}>
                    {intentLabel}
                    {activityNameLabel && ` · ${activityNameLabel}`}
                  </p>
                  {description && (
                    <p
                      className="text-[13px] leading-[1.45]"
                      style={{
                        color: "hsl(var(--color-text-primary))",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {description}
                    </p>
                  )}
                  {isFromGroup && (
                    <div className="flex items-center gap-1 mt-auto pt-1">
                      <Users className="w-3 h-3" style={{ color: "hsl(var(--color-text-muted))" }} />
                      <span className="text-[10px]" style={{ color: "hsl(var(--color-text-muted))" }}>
                        {description.split("— via ")[1] || "Sällskap"}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {totalCards > 1 && (
            <div className="flex justify-center gap-1 mt-2">
              {Array.from({ length: totalCards }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: i === currentIndex ? 12 : 5,
                    height: 5,
                    backgroundColor: i === currentIndex ? "#3C2A4D" : "#EDE8F4",
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      <HangoutDetailSheet
        entry={selectedEntry}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        isOwner={isOwner}
        onDeleted={fetchEntries}
        onEdited={() => {
          setSheetOpen(false);
        }}
        groupedEntries={getGroupedEntriesForSelected()}
        onRefresh={fetchEntries}
        onAddActivityDate={handleAddActivityDate}
      />
    </div>
  );
};

export default HangoutAvailability;
