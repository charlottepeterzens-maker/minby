import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import AddHangoutSheet from "@/components/profile/AddHangoutSheet";
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
}

const HangoutAvailability = ({ userId, isOwner }: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [entries, setEntries] = useState<AvailabilityEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AvailabilityEntry | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmedCounts, setConfirmedCounts] = useState<Map<string, number>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchEntries = useCallback(async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data } = await supabase
      .from("hangout_availability")
      .select("*")
      .eq("user_id", userId)
      .gte("date", today)
      .order("date", { ascending: true });
    if (data) {
      setEntries(data as AvailabilityEntry[]);
      const ids = data.map((e: any) => e.id);
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

  const handleCardClick = (entry: AvailabilityEntry) => {
    setSelectedEntry(entry);
    setSheetOpen(true);
  };

  // Scroll tracking for pagination dots
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cardWidth = 130; // approx card + gap
    const idx = Math.round(el.scrollLeft / cardWidth);
    setCurrentIndex(idx);
  };

  // totalCards moved below after grouping

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "confirmed": return { bg: "#EDE8F4", border: "#C9B8D8" };
      case "activity": return { bg: "#EAF2E8", border: "#B5CCBF" };
      default: return { bg: "#F7F3EF", border: "#EDE8F4" };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "confirmed": return "kom med";
      case "activity": return "sugen på";
      default: return "vill ses";
    }
  };

  const getActivityLabel = (key: string) => ACTIVITY_MAP[key] || key;

  // Group activity entries by activity name
  interface GroupedActivity {
    id: string;
    entry_type: "activity";
    activityName: string;
    dates: string[];
    ids: string[];
  }

  type CarouselItem = AvailabilityEntry | GroupedActivity;

  const isGrouped = (item: CarouselItem): item is GroupedActivity =>
    "dates" in item && "ids" in item;

  const buildCarouselItems = (): CarouselItem[] => {
    const nonActivity: AvailabilityEntry[] = [];
    const activityMap = new Map<string, { entries: AvailabilityEntry[] }>();

    for (const entry of entries) {
      if (entry.entry_type === "activity") {
        const name = entry.activities.length > 0
          ? getActivityLabel(entry.activities[0])
          : entry.custom_note || "";
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
        dates: val.entries.map(e => e.date),
        ids: val.entries.map(e => e.id),
      });
    });

    return [...nonActivity, ...grouped];
  };

  const carouselItems = buildCarouselItems();
  const totalCards = carouselItems.length + (isOwner ? 1 : 0);

  return (
    <div className="bg-card border-[0.5px] rounded-[16px] p-4" style={{ borderColor: "#EDE8F4" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base font-medium text-foreground">Hitta på något</h3>
      </div>

      <AddHangoutSheet open={showAdd} onOpenChange={setShowAdd} onCreated={fetchEntries} />

      {entries.length === 0 && !isOwner ? (
        <p className="text-sm text-muted-foreground text-center py-3">{t("noAvailability")}</p>
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
                // Grouped activity card
                const totalFriends = item.ids.reduce((sum, id) => sum + (confirmedCounts.get(id) || 0), 0);
                return (
                  <button
                    key={`grouped-${item.activityName}`}
                    onClick={() => {
                      // Open detail for the first entry in the group
                      const first = entries.find(e => e.id === item.id);
                      if (first) handleCardClick(first);
                    }}
                    className="flex-shrink-0 flex flex-col text-left relative overflow-hidden"
                    style={{
                      width: 130,
                      height: 110,
                      borderRadius: 12,
                      padding: 10,
                      backgroundColor: "#EAF2E8",
                      border: "0.5px solid #B5CCBF",
                    }}
                  >
                    <span className="text-[9px] lowercase tracking-wider" style={{ color: "#B0A8B5" }}>
                      sugen på
                    </span>
                    <span className="text-[13px] font-medium leading-tight mt-0.5" style={{ color: "#1F4A1A" }}>
                      {item.activityName}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.dates.map((d, i) => {
                        const dateObj = new Date(d + "T00:00:00");
                        const label = format(dateObj, "EEE d/M", { locale: sv }).replace(".", "");
                        return (
                          <span
                            key={i}
                            className="text-[9px] leading-none"
                            style={{
                              backgroundColor: "#B5CCBF",
                              borderRadius: 6,
                              padding: "2px 7px",
                              color: "#1F4A1A",
                            }}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                    {totalFriends > 0 && (
                      <span className="text-[9px] mt-auto self-end" style={{ color: "#7A6A85" }}>
                        {totalFriends} svar
                      </span>
                    )}
                    {/* Fade gradient */}
                    <div
                      className="absolute bottom-0 left-0 right-0 pointer-events-none"
                      style={{
                        height: 20,
                        background: "linear-gradient(to bottom, transparent, #EAF2E8)",
                        borderRadius: "0 0 12px 12px",
                      }}
                    />
                  </button>
                );
              }

              // Regular entry card
              const style = getTypeStyle(item.entry_type);
              const dateObj = new Date(item.date + "T00:00:00");
              const weekday = format(dateObj, "EEE", { locale: sv }).replace(".", "");
              const day = format(dateObj, "d");
              const month = format(dateObj, "MMM", { locale: sv }).replace(".", "");
              const activityName = item.activities.length > 0
                ? item.activities.map(a => ACTIVITY_MAP[a] || a).join(", ")
                : item.custom_note || "";
              const isSelected = selectedEntry?.id === item.id && sheetOpen;

              return (
                <button
                  key={item.id}
                  onClick={() => handleCardClick(item)}
                  className="flex-shrink-0 flex flex-col text-left transition-all relative overflow-hidden"
                  style={{
                    width: 130,
                    height: 110,
                    borderRadius: 12,
                    padding: 10,
                    backgroundColor: style.bg,
                    border: isSelected ? "2px solid #3C2A4D" : `1px solid ${style.border}`,
                  }}
                >
                  <span className="text-[9px] lowercase tracking-wider" style={{ color: "#B0A8B5" }}>
                    {getTypeLabel(item.entry_type)}
                  </span>
                  <span className="text-[9px] uppercase mt-1" style={{ color: "#7A6A85" }}>{weekday}</span>
                  <span className="text-[22px] font-medium leading-tight text-foreground">{day}</span>
                  <span className="text-[9px]" style={{ color: "#C9B8D8" }}>{month}</span>
                  {activityName && (
                    <p
                      className="text-[11px] leading-snug text-foreground mt-auto"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >{activityName}</p>
                  )}
                  {/* Fade gradient at bottom */}
                  <div
                    className="absolute bottom-0 left-0 right-0 pointer-events-none"
                    style={{
                      height: 20,
                      background: `linear-gradient(to bottom, transparent, ${style.bg})`,
                      borderRadius: "0 0 12px 12px",
                    }}
                  />
                </button>
              );
            })}

            {/* Add card */}
            {isOwner && (
              <button
                onClick={() => setShowAdd(true)}
                className="flex-shrink-0 flex flex-col items-center justify-center transition-colors hover:bg-muted/30"
                style={{
                  width: 130,
                  height: 110,
                  borderRadius: 12,
                  padding: 10,
                  border: "1.5px dashed #DDD5CC",
                  backgroundColor: "transparent",
                }}
              >
                <Plus className="w-5 h-5 mb-1" style={{ color: "#C9B8D8" }} />
                <span className="text-[11px]" style={{ color: "#7A6A85" }}>Lägg till</span>
              </button>
            )}
          </div>

          {/* Pagination dots */}
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
          // For now just close and could open edit mode
          setSheetOpen(false);
        }}
      />
    </div>
  );
};

export default HangoutAvailability;
