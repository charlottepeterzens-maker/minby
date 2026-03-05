import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface OverlapEntry {
  date: string;
  users: { user_id: string; display_name: string; activities: string[] }[];
  commonActivities: string[];
}

const GroupHangoutSuggestions = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [overlaps, setOverlaps] = useState<OverlapEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  const findOverlaps = useCallback(async () => {
    if (!user) return;

    // Get my friends
    const { data: tiers } = await supabase
      .from("friend_access_tiers")
      .select("friend_user_id")
      .eq("owner_id", user.id);

    if (!tiers?.length) { setLoading(false); return; }

    const friendIds = tiers.map((t: any) => t.friend_user_id);
    const allUserIds = [user.id, ...friendIds];

    const today = format(new Date(), "yyyy-MM-dd");
    const { data: allAvail } = await supabase
      .from("hangout_availability")
      .select("user_id, date, activities")
      .in("user_id", allUserIds)
      .gte("date", today)
      .order("date", { ascending: true });

    if (!allAvail?.length) { setLoading(false); return; }

    // Get profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", allUserIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name || "?"]));

    // Group by date and find overlaps (2+ people including me)
    const dateMap: Record<string, { user_id: string; activities: string[] }[]> = {};
    allAvail.forEach((a: any) => {
      if (!dateMap[a.date]) dateMap[a.date] = [];
      dateMap[a.date].push({ user_id: a.user_id, activities: a.activities || [] });
    });

    const result: OverlapEntry[] = [];
    for (const [date, users] of Object.entries(dateMap)) {
      const hasMe = users.some((u) => u.user_id === user.id);
      if (hasMe && users.length >= 2) {
        // Find common activities
        const allActivities = users.map((u) => new Set(u.activities));
        const common = users[0].activities.filter((a) =>
          allActivities.every((s) => s.has(a))
        );
        result.push({
          date,
          users: users.map((u) => ({
            ...u,
            display_name: profileMap.get(u.user_id) || "?",
          })),
          commonActivities: common,
        });
      }
    }

    setOverlaps(result);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    findOverlaps();
  }, [findOverlaps]);

  if (loading || overlaps.length === 0) return null;

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">
            {t("hangoutSuggestions")}
          </h3>
          <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">
            {overlaps.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 mt-3">
              {overlaps.map((overlap) => {
                const dateObj = new Date(overlap.date + "T00:00:00");
                return (
                  <div
                    key={overlap.date}
                    className="bg-background rounded-md p-3 border border-border/50"
                  >
                    <p className="font-display text-sm font-bold text-foreground">
                      {format(dateObj, "EEE, MMM d")}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {overlap.users.map((u) => u.display_name).join(", ")}
                      </p>
                    </div>
                    {overlap.commonActivities.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {overlap.commonActivities.map((a) => (
                          <span
                            key={a}
                            className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary"
                          >
                            {t(a as any) || a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupHangoutSuggestions;
