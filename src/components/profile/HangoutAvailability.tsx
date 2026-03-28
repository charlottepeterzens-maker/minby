import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
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

const TYPE_COLORS: Record<string, { bg: string }> = {
  open: { bg: "#F5F0E8" },
  confirmed: { bg: "#EDE8F4" },
  activity: { bg: "#E8F2EC" },
};

const TYPE_LABEL: Record<string, string> = {
  open: "ledig",
  confirmed: "häng med",
  activity: "sugen på",
};

const getActivityLabel = (key: string) => ACTIVITY_MAP[key] || key;

const getActivityName = (entry: AvailabilityEntry) => {
  return entry.activities.length > 0 ? getActivityLabel(entry.activities[0]) : entry.custom_note || "";
};

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
  const [activityGroupMap, setActivityGroupMap] = useState<Map<string, AvailabilityEntry[]>>(new Map());
  const [prefillActivityName, setPrefillActivityName] = useState<string | undefined>();

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

      const groupMap = new Map<string, AvailabilityEntry[]>();
      for (const entry of typedData) {
        if (entry.entry_type === "activity") {
          const name = getActivityName(entry);
          if (!groupMap.has(name)) groupMap.set(name, []);
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

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

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

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cardWidth = 156; // 148 + 8 gap
    const idx = Math.round(el.scrollLeft / cardWidth);
    setCurrentIndex(idx);
  };

  // --- Build carousel items ---
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
    const actMap = new Map<string, AvailabilityEntry[]>();
    for (const entry of entries) {
      if (entry.entry_type === "activity") {
        const name = getActivityName(entry);
        if (!actMap.has(name)) actMap.set(name, []);
        actMap.get(name)!.push(entry);
      } else {
        nonActivity.push(entry);
      }
    }
    const grouped: GroupedActivity[] = [];
    actMap.forEach((val, name) => {
      grouped.push({
        id: val[0].id,
        entry_type: "activity",
        activityName: name,
        dates: val.map((e) => e.date),
        ids: val.map((e) => e.id),
      });
    });
    return [...nonActivity, ...grouped];
  };

  const carouselItems = buildCarouselItems();
  const totalCards = carouselItems.length + (isOwner ? 1 : 0);

  const getGroupedEntriesForSelected = (): AvailabilityEntry[] | undefined => {
    if (!selectedEntry || selectedEntry.entry_type !== "activity") return undefined;
    const name = getActivityName(selectedEntry);
    return activityGroupMap.get(name);
  };

  const handleAddActivityDate = (activityNameParam: string) => {
    setPrefillActivityName(activityNameParam);
    setShowAdd(true);
  };

  // --- Render helpers ---
  const renderDateCard = (item: AvailabilityEntry) => {
    const dateObj = new Date(item.date + "T00:00:00");
    const weekday = format(dateObj, "EEEE", { locale: sv });
    const dayNum = format(dateObj, "d");
    const month = format(dateObj, "MMMM", { locale: sv });
    const typeLabel = TYPE_LABEL[item.entry_type] || "ledig";
    const colors = TYPE_COLORS[item.entry_type] || TYPE_COLORS.open;

    const activityNameLabel = item.activities.length > 0
      ? item.activities.map((a) => ACTIVITY_MAP[a] || a).join(", ")
      : null;
    const rawDescription = item.custom_note || "";
    const textsAreSimilar = activityNameLabel && rawDescription &&
      (rawDescription.toLowerCase().includes(activityNameLabel.toLowerCase()) ||
       activityNameLabel.toLowerCase().includes(rawDescription.toLowerCase()));
    const description = rawDescription;
    const showActivity = !textsAreSimilar && !!activityNameLabel;

    return (
      <button
        key={item.id}
        onClick={() => handleCardClick(item)}
        className="flex-shrink-0 flex flex-col text-left"
        style={{
          width: 148,
          height: 160,
          borderRadius: 8,
          padding: 14,
          backgroundColor: colors.bg,
          border: "none",
          overflow: "hidden",
        }}
      >
        {/* Etikett */}
        <p style={{ fontSize: 11, letterSpacing: "0.04em", color: "#B0A8B5", marginBottom: 4 }}>
          {typeLabel}
        </p>

        {/* Veckodag */}
        <p style={{ fontSize: 11, fontWeight: 300, color: "#9A8FA3", marginBottom: 2 }}>
          {weekday}
        </p>

        {/* Datum: siffra + månad */}
        <div className="flex items-baseline gap-1.5" style={{ marginBottom: 6 }}>
          <span style={{ fontFamily: "Georgia, serif", fontSize: 28, color: "hsl(var(--color-text-primary))", lineHeight: 1 }}>
            {dayNum}
          </span>
          <span style={{ fontSize: 13, color: "hsl(var(--color-text-primary))" }}>
            {month}
          </span>
        </div>

        {/* Fritext */}
        {(description || showActivity) && (
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.45,
              color: "hsl(var(--color-text-primary))",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              marginTop: "auto",
            }}
          >
            {description || activityNameLabel}
          </p>
        )}
      </button>
    );
  };

  const renderActivityCard = (item: GroupedActivity) => {
    return (
      <button
        key={`grouped-${item.activityName}`}
        onClick={() => {
          const first = entries.find((e) => e.id === item.id);
          if (first) handleCardClick(first);
        }}
        className="flex-shrink-0 flex flex-col text-left"
        style={{
          width: 148,
          height: 160,
          borderRadius: 8,
          padding: 14,
          backgroundColor: TYPE_COLORS.activity.bg,
          border: "none",
          overflow: "hidden",
        }}
      >
        {/* Etikett */}
        <p style={{ fontSize: 11, letterSpacing: "0.04em", color: "#B0A8B5", marginBottom: 8 }}>
          sugen på
        </p>

        {/* Aktivitetstext */}
        <p
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 14,
            fontWeight: 500,
            color: "hsl(var(--color-text-primary))",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            marginBottom: "auto",
          }}
        >
          {item.activityName}
        </p>

        {/* Datum-förslag */}
        {item.dates.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 10, color: "#B0A8B5", marginBottom: 4 }}>
              förslag på datum
            </p>
            <div className="flex flex-wrap gap-1">
              {item.dates.map((d, i) => {
                const dateObj = new Date(d + "T00:00:00");
                const label = format(dateObj, "d/M", { locale: sv });
                return (
                  <span
                    key={i}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.6)",
                      borderRadius: 99,
                      padding: "2px 8px",
                      fontSize: 10,
                      color: "hsl(var(--color-text-primary))",
                    }}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </button>
    );
  };

  const renderAddButton = () => (
    <button
      key="add-btn"
      onClick={() => setShowAdd(true)}
      className="flex-shrink-0 flex items-center justify-center"
      style={{
        width: 56,
        height: 160,
        borderRadius: 8,
        border: "1px dashed #C9B8D8",
        backgroundColor: "transparent",
      }}
      aria-label="Lägg till hangout"
    >
      <Plus className="w-5 h-5" style={{ color: "#C9B8D8" }} />
    </button>
  );

  return (
    <div style={{ padding: "0 0 20px 0" }}>
      <h2
        className="font-fraunces font-normal text-[16px] mt-6 mb-3"
        style={{ color: "hsl(var(--color-text-primary))" }}
      >
        Ses vi?
      </h2>

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
              { left: 4, top: 0, bg: "#F5F0E8", delay: 0.15 },
              { left: 32, top: 4, bg: "#E8F2EC", delay: 0.25 },
              { left: 54, top: 0, bg: "#EDE8F4", delay: 0.35 },
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
            className="flex gap-2 overflow-x-scroll pb-2 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {carouselItems.map((item) =>
              isGrouped(item) ? renderActivityCard(item) : renderDateCard(item)
            )}
            {isOwner && renderAddButton()}
          </div>

          {/* Pagination dots */}
          {totalCards > 1 && (
            <div className="flex justify-center gap-1 mt-2">
              {Array.from({ length: totalCards }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: i === currentIndex ? 16 : 6,
                    height: 6,
                    backgroundColor: i === currentIndex ? "#3C2A4D" : "#C9B8D8",
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
        onEdited={() => setSheetOpen(false)}
        groupedEntries={getGroupedEntriesForSelected()}
        onRefresh={fetchEntries}
        onAddActivityDate={handleAddActivityDate}
      />
    </div>
  );
};

export default HangoutAvailability;
