import { useState, useEffect, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import FeedAvatar from "@/components/feed/FeedAvatar";
import HangoutDetailSheet from "@/components/profile/HangoutDetailSheet";

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
    isMatch?: boolean;
  };
  profile: {
    display_name: string | null;
    avatar_url?: string | null;
    initials: string;
  };
  isOwn?: boolean;
  onProfileClick: () => void;
  onJoin?: () => void;
  onMaybe?: () => void;
}

function formatDatePrimary(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.getTime() === today.getTime()) return "Idag";
  if (d.getTime() === tomorrow.getTime()) return "Imorgon";

  const weekday = format(d, "EEEE", { locale: sv });
  const day = format(d, "d", { locale: sv });
  const month = format(d, "MMMM", { locale: sv });
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day} ${month}`;
}

function formatDateChip(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${format(d, "d", { locale: sv })} ${format(d, "MMM", { locale: sv }).replace(".", "")}`;
}

const TYPE_COLORS: Record<string, string> = {
  open: "#F5F0E8",
  available: "#F5F0E8",
  confirmed: "#EDE8F4",
  activity: "#E8F2EC",
};

const TYPE_LABEL: Record<string, string> = {
  open: "ledig",
  available: "ledig",
  confirmed: "häng med",
  activity: "sugen på",
};

function getTypeLabel(entryType: string): string {
  return TYPE_LABEL[entryType] || "ledig";
}

function getTypeBg(entryType: string): string {
  return TYPE_COLORS[entryType] || "#F5F0E8";
}

/** Unified card — hierarchy: Date → Activity → Sender → Type */
const UnifiedHangoutCard = ({
  hangout,
  profile,
  isOwn,
  onProfileClick,
}: FeedHangoutCardProps) => {
  const [detailOpen, setDetailOpen] = useState(false);
  const hangoutId = hangout.id || "";
  const entryType = hangout.entry_type || "available";

  const entry = hangoutId
    ? {
        id: hangoutId,
        date: hangout.date || "",
        activities: hangout.activities,
        custom_note: hangout.custom_note,
        entry_type: entryType,
        user_id: "",
      }
    : null;

  // Avoid duplication: if custom_note already contains the activity text, only show note
  const activityText = hangout.activities.length > 0 ? hangout.activities[0] : null;
  const noteText = hangout.custom_note || null;

  const textsAreSimilar =
    noteText && activityText &&
    (noteText.toLowerCase().includes(activityText.toLowerCase()) ||
     activityText.toLowerCase().includes(noteText.toLowerCase()));

  const mainText = noteText || activityText;
  const secondaryText = textsAreSimilar ? null : (noteText ? activityText : null);

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: "hsl(var(--color-surface-card))" }}
    >
      {/* 1. DATE — largest, most prominent */}
      {hangout.date && (
        <p
          className="font-fraunces text-[17px] font-medium leading-tight"
          style={{ color: "hsl(var(--color-text-primary))" }}
        >
          {formatDatePrimary(hangout.date)}
        </p>
      )}

      {/* 2. ACTIVITY / main text */}
      {mainText && (
        <p
          className="text-[14px] leading-relaxed mt-1.5 line-clamp-2"
          style={{ color: "hsl(var(--color-text-primary))", lineHeight: 1.5 }}
        >
          {mainText}
        </p>
      )}

      {/* Match indicator */}
      {hangout.isMatch && !isOwn && (
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 mt-2.5 w-fit"
          style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}
        >
          <Sparkles className="w-3 h-3" style={{ color: "#7A5AA6" }} />
          <span className="text-[11px] font-medium" style={{ color: "#7A5AA6" }}>
            Du är också ledig!
          </span>
        </div>
      )}

      {/* 3. SENDER — smaller, below content */}
      <div className="flex items-center gap-2 mt-3">
        <FeedAvatar
          avatarUrl={(profile as any).avatar_url || null}
          displayName={profile.display_name}
          initials={profile.initials}
          onClick={onProfileClick}
          size="w-6 h-6"
        />
        <button
          onClick={onProfileClick}
          className="text-[12px] font-medium hover:underline leading-tight"
          style={{ color: "hsl(var(--color-text-secondary))" }}
        >
          {profile.display_name || "Någon"}
        </button>
        {/* 4. TYPE — least prominent */}
        <span
          className="text-[11px] leading-tight"
          style={{ color: "hsl(var(--color-text-faint))" }}
        >
          · {getTypeLabel(entryType)}
        </span>
      </div>

      {/* CTA buttons */}
      {!isOwn && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setDetailOpen(true)}
            className="text-[13px] font-medium py-2 px-5 rounded-full transition-colors"
            style={{ backgroundColor: "hsl(var(--color-text-primary))", color: "#FFFFFF" }}
          >
            Jag kan
          </button>
          <button
            onClick={() => setDetailOpen(true)}
            className="text-[13px] font-medium py-2 px-5 rounded-full transition-colors"
            style={{
              backgroundColor: "transparent",
              color: "hsl(var(--color-text-primary))",
            }}
          >
            Kanske
          </button>
        </div>
      )}

      {entry && (
        <HangoutDetailSheet
          entry={entry}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          isOwner={!!isOwn}
        />
      )}
    </div>
  );
};

/** Grouped activity card with date chips */
const GroupedActivityCard = ({
  hangout,
  profile,
  isOwn,
  onProfileClick,
}: FeedHangoutCardProps) => {
  const { user } = useAuth();
  const activityName =
    hangout.activities.length > 0
      ? hangout.activities[0]
      : hangout.custom_note || "Aktivitet";
  const dates = hangout.dates || (hangout.date ? [hangout.date] : []);
  const hangoutIds = hangout.ids || (hangout.id ? [hangout.id] : []);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const fetchRsvps = useCallback(async () => {
    if (hangoutIds.length === 0) return;
    const { data } = await supabase
      .from("hangout_tagged_friends")
      .select("availability_id, tagged_user_id")
      .in("availability_id", hangoutIds);

    if (data) {
      const counts: Record<string, number> = {};
      let myDate: string | null = null;
      data.forEach((r: any) => {
        const idx = hangoutIds.indexOf(r.availability_id);
        if (idx >= 0 && dates[idx]) {
          const d = dates[idx];
          counts[d] = (counts[d] || 0) + 1;
          if (r.tagged_user_id === user?.id) myDate = d;
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
    const dateIdx = dates.indexOf(dateStr);
    const hangoutId = hangoutIds[dateIdx];
    if (!hangoutId) {
      setSaving(false);
      return;
    }

    if (selectedDate === dateStr) {
      await supabase
        .from("hangout_tagged_friends")
        .delete()
        .eq("availability_id", hangoutId)
        .eq("tagged_user_id", user.id);
      setSelectedDate(null);
      toast("Val borttaget");
    } else {
      if (selectedDate) {
        const oldIdx = dates.indexOf(selectedDate);
        const oldId = hangoutIds[oldIdx];
        if (oldId)
          await supabase
            .from("hangout_tagged_friends")
            .delete()
            .eq("availability_id", oldId)
            .eq("tagged_user_id", user.id);
      }
      await supabase.from("hangout_tagged_friends").insert({
        availability_id: hangoutId,
        tagged_user_id: user.id,
        tagged_by: user.id,
      });
      setSelectedDate(dateStr);
      toast.success("Du är på!");
    }
    setSaving(false);
    fetchRsvps();
  };

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: "hsl(var(--color-surface-card))" }}
    >
      {/* 1. ACTIVITY — primary for grouped cards */}
      <p
        className="font-fraunces text-[17px] font-medium leading-tight"
        style={{ color: "hsl(var(--color-text-primary))" }}
      >
        {activityName}
      </p>

      {/* 2. DATE CHIPS */}
      <div className="flex gap-1.5 flex-wrap mt-2.5">
        {dates.map((dateStr) => {
          const isSelected = selectedDate === dateStr;
          const count = rsvpCounts[dateStr] || 0;
          return (
            <button
              key={dateStr}
              onClick={() => handleDateClick(dateStr)}
              disabled={isOwn || saving}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all shrink-0"
              style={{
                backgroundColor: isSelected ? "hsl(var(--color-text-primary))" : "hsl(var(--color-surface-raised))",
              }}
            >
              <span
                className="text-[12px] font-medium"
                style={{ color: isSelected ? "#FFFFFF" : "hsl(var(--color-text-primary))" }}
              >
                {formatDateChip(dateStr)}
              </span>
              {count > 0 && (
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isSelected
                      ? "rgba(255,255,255,0.2)"
                      : "hsl(var(--color-border-subtle))",
                    color: isSelected ? "#FFFFFF" : "hsl(var(--color-text-secondary))",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom note */}
      {hangout.custom_note && (
        <p
          className="text-[13px] mt-2.5 line-clamp-2"
          style={{ color: "hsl(var(--color-text-secondary))", lineHeight: 1.5 }}
        >
          {hangout.custom_note}
        </p>
      )}

      {/* 3. SENDER */}
      <div className="flex items-center gap-2 mt-3">
        <FeedAvatar
          avatarUrl={(profile as any).avatar_url || null}
          displayName={profile.display_name}
          initials={profile.initials}
          onClick={onProfileClick}
          size="w-6 h-6"
        />
        <button
          onClick={onProfileClick}
          className="text-[12px] font-medium hover:underline leading-tight"
          style={{ color: "hsl(var(--color-text-secondary))" }}
        >
          {profile.display_name || "Någon"}
        </button>
        {/* 4. TYPE */}
        <span
          className="text-[11px] leading-tight"
          style={{ color: "hsl(var(--color-text-faint))" }}
        >
          · Sugen på
        </span>
      </div>
    </div>
  );
};

const FeedHangoutCard = (props: FeedHangoutCardProps) => {
  const entryType = props.hangout.entry_type || "available";
  if (
    entryType === "activity" &&
    props.hangout.dates &&
    props.hangout.dates.length > 0
  ) {
    return <GroupedActivityCard {...props} />;
  }
  return <UnifiedHangoutCard {...props} />;
};

export default FeedHangoutCard;
