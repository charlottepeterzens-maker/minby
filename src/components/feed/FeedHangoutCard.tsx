import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FeedHangoutCardProps {
  hangout: {
    id?: string;
    ids?: string[];
    date?: string;
    dates?: string[];
    activities: string[];
    custom_note: string | null;
    created_at: string;
    entry_type?: string;
  };
  profile: {
    display_name: string | null;
    initials: string;
  };
  isOwn?: boolean;
  onProfileClick: () => void;
  onJoin?: () => void;
  onMaybe?: () => void;
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "nu";
  if (diffMins < 60) return `${diffMins} min sedan`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} tim sedan`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} d sedan`;
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

const DateColumn = ({ dateStr, light }: { dateStr: string; light?: boolean }) => {
  const dateObj = new Date(dateStr + "T00:00:00");
  const weekday = format(dateObj, "EEE", { locale: sv }).replace(".", "");
  const day = format(dateObj, "d");
  const month = format(dateObj, "MMM", { locale: sv }).replace(".", "");
  return (
    <div className="shrink-0 flex flex-col items-center justify-center w-10">
      <span className="text-[10px] font-medium leading-none uppercase" style={{ color: light ? "#E8D5DA" : "#3C2A4D" }}>
        {weekday}
      </span>
      <span className="text-[22px] leading-none font-medium mt-0.5" style={{ color: light ? "#FFFFFF" : "#3C2A4D" }}>
        {day}
      </span>
      <span className="text-[10px] font-medium leading-none mt-0.5 uppercase" style={{ color: "#C9B8D8" }}>
        {month}
      </span>
    </div>
  );
};

const CategoryPill = ({ label, variant }: { label: string; variant: "light" | "dark" }) => {
  if (variant === "dark") {
    return (
      <span
        className="text-[11px] font-medium px-2.5 py-0.5 rounded-[20px]"
        style={{ backgroundColor: "#3C2A4D", color: "#C9B8D8" }}
      >
        {label}
      </span>
    );
  }
  return (
    <span
      className="text-[11px] font-medium px-2.5 py-0.5 rounded-[20px]"
      style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }}
    >
      {label}
    </span>
  );
};

// --- LEDIG CARD ---
const LedigCard = ({ hangout, profile, isOwn, onProfileClick, onJoin, onMaybe }: FeedHangoutCardProps) => {
  const timeAgo = getTimeAgo(hangout.created_at);
  return (
    <div className="bg-card rounded-[14px] border overflow-hidden" style={{ borderColor: "#EDE8F4" }}>
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={onProfileClick} className="shrink-0">
              <Avatar className="w-9 h-9">
                <AvatarFallback
                  style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }}
                  className="text-xs font-medium"
                >
                  {profile.initials}
                </AvatarFallback>
              </Avatar>
            </button>
            <div>
              <button
                onClick={onProfileClick}
                className="text-sm font-medium text-foreground hover:underline block leading-tight"
              >
                {profile.display_name || "Någon"}
              </button>
              <p className="text-[11px] text-muted-foreground leading-tight">vill ses · {timeAgo}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <CategoryPill label="vill ses" variant="light" />
          </div>
        </div>
      </div>

      <div className="mx-4 mb-3 rounded-[10px] p-3.5" style={{ backgroundColor: "#F7F3EF" }}>
        <div className="flex items-center">
          {hangout.date && <DateColumn dateStr={hangout.date} />}
          <div className="shrink-0 mx-3 self-stretch w-px" style={{ backgroundColor: "#EDE8F4" }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] leading-snug" style={{ color: "#3C2A4D" }}>
              {hangout.custom_note || "Vill ses"}
            </p>
          </div>
        </div>
      </div>

      {!isOwn && (
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={onJoin}
            className="flex-1 text-[13px] font-medium py-2 rounded-[10px] transition-colors"
            style={{ backgroundColor: "#EAF2E8", color: "#1F4A1A" }}
          >
            Ja, jag är med!
          </button>
          <button
            onClick={onMaybe}
            className="flex-1 text-[13px] font-medium py-2 rounded-[10px] bg-card text-muted-foreground border transition-colors hover:bg-muted"
            style={{ borderColor: "#EDE8F4" }}
          >
            Kanske
          </button>
        </div>
      )}
    </div>
  );
};

// --- PLAN CARD ---
const PlanCard = ({ hangout, profile, isOwn, onProfileClick, onJoin, onMaybe }: FeedHangoutCardProps) => {
  const timeAgo = getTimeAgo(hangout.created_at);
  const activityName = hangout.custom_note || (hangout.activities.length > 0 ? hangout.activities[0] : "Plan");

  return (
    <div className="bg-card rounded-[14px] border overflow-hidden" style={{ borderColor: "#EDE8F4" }}>
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={onProfileClick} className="shrink-0">
              <Avatar className="w-9 h-9">
                <AvatarFallback
                  style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }}
                  className="text-xs font-medium"
                >
                  {profile.initials}
                </AvatarFallback>
              </Avatar>
            </button>
            <div>
              <button
                onClick={onProfileClick}
                className="text-sm font-medium text-foreground hover:underline block leading-tight"
              >
                {profile.display_name || "Någon"}
              </button>
              <p className="text-[11px] text-muted-foreground leading-tight">häng med · {timeAgo}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <CategoryPill label="häng med" variant="dark" />
          </div>
        </div>
      </div>

      <div className="mx-4 mb-3 rounded-[10px] p-3.5" style={{ backgroundColor: "#3C2A4D" }}>
        <div className="flex items-center">
          {hangout.date && <DateColumn dateStr={hangout.date} light />}
          <div className="shrink-0 mx-3 self-stretch w-px" style={{ backgroundColor: "#C9B8D8", opacity: 0.3 }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium leading-snug text-white">{activityName}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex -space-x-1.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium border-[1.5px]"
                  style={{ backgroundColor: "#C9B8D8", color: "#3C2A4D", borderColor: "#3C2A4D" }}
                >
                  {profile.initials.charAt(0)}
                </div>
              </div>
              <span style={{ color: "#C9B8D8", fontSize: "10px" }}>
                {profile.display_name || "Någon"} ·{" "}
                <span style={{ color: "#7A6A85", fontSize: "10px" }}>häng med!</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {!isOwn && (
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={onJoin}
            className="flex-1 text-[13px] font-medium py-2 rounded-[10px] transition-colors"
            style={{ backgroundColor: "#EAF2E8", color: "#1F4A1A" }}
          >
            Jag hänger med!
          </button>
          <button
            onClick={onMaybe}
            className="flex-1 text-[13px] font-medium py-2 rounded-[10px] bg-card text-muted-foreground border transition-colors hover:bg-muted"
            style={{ borderColor: "#EDE8F4" }}
          >
            Kanske
          </button>
        </div>
      )}
    </div>
  );
};

// --- GROUPED ACTIVITY CARD (sugen på) ---
const GroupedActivityCard = ({ hangout, profile, isOwn, onProfileClick }: FeedHangoutCardProps) => {
  const { user } = useAuth();
  const timeAgo = getTimeAgo(hangout.created_at);
  const activityName = hangout.activities.length > 0 ? hangout.activities[0] : hangout.custom_note || "Aktivitet";
  const dates = hangout.dates || (hangout.date ? [hangout.date] : []);
  const hangoutIds = hangout.ids || (hangout.id ? [hangout.id] : []);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  // Fetch existing RSVPs for these hangout IDs
  const fetchRsvps = useCallback(async () => {
    if (hangoutIds.length === 0) return;

    // Check user's own RSVP (via hangout_tagged_friends or similar)
    // For now, we track via hangout_comments as a lightweight signal
    // Actually let's use hangout_tagged_friends to see who's interested
    const { data } = await supabase
      .from("hangout_tagged_friends")
      .select("availability_id, tagged_user_id")
      .in("availability_id", hangoutIds);

    if (data) {
      const counts: Record<string, number> = {};
      let myDate: string | null = null;

      data.forEach((r: any) => {
        // Find which date this hangout_id corresponds to
        const idx = hangoutIds.indexOf(r.availability_id);
        if (idx >= 0 && dates[idx]) {
          const d = dates[idx];
          counts[d] = (counts[d] || 0) + 1;
          if (r.tagged_user_id === user?.id) {
            myDate = d;
          }
        }
      });

      setRsvpCounts(counts);
      if (myDate) setSelectedDate(myDate);
    }
  }, [hangoutIds, dates, user?.id]);

  useEffect(() => {
    fetchRsvps();
  }, [fetchRsvps]);

  const handleDateClick = async (dateStr: string) => {
    if (!user || isOwn || saving) return;

    setSaving(true);

    // Find the hangout_id for this date
    const dateIdx = dates.indexOf(dateStr);
    const hangoutId = hangoutIds[dateIdx];
    if (!hangoutId) {
      setSaving(false);
      return;
    }

    if (selectedDate === dateStr) {
      // Remove RSVP
      await supabase
        .from("hangout_tagged_friends")
        .delete()
        .eq("availability_id", hangoutId)
        .eq("tagged_user_id", user.id);
      setSelectedDate(null);
      toast("Val borttaget");
    } else {
      // Remove old RSVP if exists
      if (selectedDate) {
        const oldIdx = dates.indexOf(selectedDate);
        const oldId = hangoutIds[oldIdx];
        if (oldId) {
          await supabase
            .from("hangout_tagged_friends")
            .delete()
            .eq("availability_id", oldId)
            .eq("tagged_user_id", user.id);
        }
      }

      // Add new RSVP
      await supabase.from("hangout_tagged_friends").insert({
        availability_id: hangoutId,
        tagged_user_id: user.id,
        tagged_by: user.id,
      });
      setSelectedDate(dateStr);
      toast.success("Du är på 💛");
    }

    setSaving(false);
    fetchRsvps();
  };

  const formatChip = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return `${format(d, "d", { locale: sv })} ${format(d, "MMM", { locale: sv }).replace(".", "")}`;
  };

  // Find the most popular date
  const maxCount = Math.max(0, ...Object.values(rsvpCounts));

  return (
    <div className="bg-card rounded-[14px] border overflow-hidden" style={{ borderColor: "#EDE8F4" }}>
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={onProfileClick} className="shrink-0">
              <Avatar className="w-9 h-9">
                <AvatarFallback
                  style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }}
                  className="text-xs font-medium"
                >
                  {profile.initials}
                </AvatarFallback>
              </Avatar>
            </button>
            <div>
              <button
                onClick={onProfileClick}
                className="text-sm font-medium text-foreground hover:underline block leading-tight"
              >
                {profile.display_name || "Någon"}
              </button>
              <p className="text-[11px] text-muted-foreground leading-tight">sugen på · {timeAgo}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <CategoryPill label="sugen på" variant="light" />
          </div>
        </div>
      </div>

      {/* Activity name */}
      <div className="mx-4 mb-2">
        <p className="text-[14px] font-medium" style={{ color: "#3C2A4D" }}>
          Sugen på {activityName.toLowerCase()}
        </p>
      </div>

      {/* Date chips */}
      <div className="mx-4 mb-3 overflow-x-auto">
        <div className="flex gap-1.5">
          {dates.map((dateStr) => {
            const isSelected = selectedDate === dateStr;
            const count = rsvpCounts[dateStr] || 0;
            const isPopular = maxCount > 0 && count === maxCount && count > 1;

            return (
              <button
                key={dateStr}
                onClick={() => handleDateClick(dateStr)}
                disabled={isOwn || saving}
                className="flex items-center gap-1.5 rounded-[10px] px-3 py-2 transition-all shrink-0"
                style={{
                  backgroundColor: isSelected ? "#3C2A4D" : "#F7F3EF",
                  border: isPopular && !isSelected ? "1.5px solid #B5CCBF" : "1px solid transparent",
                }}
              >
                <span className="text-[12px] font-medium" style={{ color: isSelected ? "#FFFFFF" : "#3C2A4D" }}>
                  {formatChip(dateStr)}
                </span>
                {count > 0 && (
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : "#EDE8F4",
                      color: isSelected ? "#FFFFFF" : "#7A6A85",
                    }}
                  >
                    {count} st
                  </span>
                )}
                {!isOwn && !isSelected && (
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-[8px]"
                    style={{ backgroundColor: "#EAF2E8", color: "#1F4A1A" }}
                  >
                    Ja!
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Note */}
      {hangout.custom_note && (
        <>
          <div className="h-px mx-4" style={{ backgroundColor: "#EDE8F4" }} />
          <div className="px-4 py-2">
            <p className="text-[12px] text-muted-foreground">{hangout.custom_note}</p>
          </div>
        </>
      )}
    </div>
  );
};

// --- SINGLE ACTIVITY CARD (fallback for non-grouped) ---
const ActivityCard = ({ hangout, profile, isOwn, onProfileClick, onJoin }: FeedHangoutCardProps) => {
  const timeAgo = getTimeAgo(hangout.created_at);
  const activityName = hangout.activities.length > 0 ? hangout.activities[0] : hangout.custom_note || "Aktivitet";
  const dateStr = hangout.date || "";
  const dateObj = new Date(dateStr + "T00:00:00");
  const dateChip = dateStr
    ? `${format(dateObj, "EEE", { locale: sv }).replace(".", "")} ${format(dateObj, "d/M")}`
    : "";

  return (
    <div className="bg-card rounded-[14px] border overflow-hidden" style={{ borderColor: "#EDE8F4" }}>
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={onProfileClick} className="shrink-0">
              <Avatar className="w-9 h-9">
                <AvatarFallback
                  style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }}
                  className="text-xs font-medium"
                >
                  {profile.initials}
                </AvatarFallback>
              </Avatar>
            </button>
            <div>
              <button
                onClick={onProfileClick}
                className="text-sm font-medium text-foreground hover:underline block leading-tight"
              >
                {profile.display_name || "Någon"}
              </button>
              <p className="text-[11px] text-muted-foreground leading-tight">sugen på · {timeAgo}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <CategoryPill label="sugen på" variant="light" />
          </div>
        </div>
      </div>

      <div className="mx-4 mb-3">
        <p className="text-[14px] font-medium mb-2" style={{ color: "#3C2A4D" }}>
          {activityName}
        </p>
        {dateStr && (
          <div className="flex flex-wrap gap-1.5">
            <div
              className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5"
              style={{ backgroundColor: "#F7F3EF" }}
            >
              <span className="text-[12px] font-medium" style={{ color: "#3C2A4D" }}>
                {dateChip}
              </span>
              {!isOwn && (
                <button
                  onClick={onJoin}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-[8px] transition-colors"
                  style={{ backgroundColor: "#EAF2E8", color: "#1F4A1A" }}
                >
                  Ja!
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {hangout.custom_note && (
        <>
          <div className="h-px mx-4" style={{ backgroundColor: "#EDE8F4" }} />
          <div className="px-4 py-2">
            <p className="text-[12px] text-muted-foreground">{hangout.custom_note}</p>
          </div>
        </>
      )}
    </div>
  );
};

const FeedHangoutCard = (props: FeedHangoutCardProps) => {
  const entryType = props.hangout.entry_type || "available";

  if (entryType === "confirmed") return <PlanCard {...props} />;
  if (entryType === "activity") {
    // Use grouped card if multiple dates, otherwise single
    if (props.hangout.dates && props.hangout.dates.length > 0) {
      return <GroupedActivityCard {...props} />;
    }
    return <ActivityCard {...props} />;
  }
  return <LedigCard {...props} />;
};

export default FeedHangoutCard;
