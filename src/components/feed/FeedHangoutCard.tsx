import { useState, useEffect, useCallback } from "react";
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const weekday = format(d, "EEE", { locale: sv }).replace(".", "");
  const day = format(d, "d", { locale: sv });
  const month = format(d, "MMMM", { locale: sv });
  return `${weekday} ${day} ${month}`;
}

/** Unified card for all hangout types */
const UnifiedHangoutCard = ({
  hangout,
  profile,
  isOwn,
  onProfileClick,
}: FeedHangoutCardProps) => {
  const timeAgo = getTimeAgo(hangout.created_at);
  const [detailOpen, setDetailOpen] = useState(false);
  const hangoutId = hangout.id || "";

  const entry = hangoutId
    ? {
        id: hangoutId,
        date: hangout.date || "",
        activities: hangout.activities,
        custom_note: hangout.custom_note,
        entry_type: hangout.entry_type || "available",
        user_id: "",
      }
    : null;

  const entryType = hangout.entry_type || "available";
  const subtitle =
    entryType === "confirmed"
      ? "häng med"
      : entryType === "activity"
        ? "sugen på"
        : "vill ses";

  const mainText =
    hangout.custom_note ||
    (hangout.activities.length > 0 ? hangout.activities[0] : "Vill ses");

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#EDE8F4" }}
    >
      {/* Header: avatar + name + subtitle */}
      <div className="flex items-center gap-2.5 mb-3">
        <FeedAvatar
          avatarUrl={(profile as any).avatar_url || null}
          displayName={profile.display_name}
          initials={profile.initials}
          onClick={onProfileClick}
        />
        <div>
          <button
            onClick={onProfileClick}
            className="text-sm font-medium hover:underline block leading-tight"
            style={{ color: "#3C2A4D" }}
          >
            {profile.display_name || "Någon"}
          </button>
          <p className="text-[11px] leading-tight" style={{ color: "#7A6A85" }}>
            {subtitle} · {timeAgo}
          </p>
        </div>
      </div>

      {/* Date (inline, not separate box) */}
      {hangout.date && (
        <p
          className="text-[12px] font-medium mb-1"
          style={{ color: "#7A6A85" }}
        >
          {formatDate(hangout.date)}
        </p>
      )}

      {/* Main text */}
      <p
        className="text-[14px] leading-relaxed line-clamp-2"
        style={{ color: "#3C2A4D", lineHeight: 1.5 }}
      >
        {mainText}
      </p>

      {/* CTA buttons */}
      {!isOwn && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setDetailOpen(true)}
            className="text-[13px] font-medium py-2 px-5 rounded-full transition-colors"
            style={{ backgroundColor: "#3C2A4D", color: "#FFFFFF" }}
          >
            Jag kan
          </button>
          <button
            onClick={() => setDetailOpen(true)}
            className="text-[13px] font-medium py-2 px-5 rounded-full transition-colors"
            style={{
              backgroundColor: "transparent",
              color: "#3C2A4D",
              border: "1px solid #EDE8F4",
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

/** Grouped activity card with date chips (kept but simplified) */
const GroupedActivityCard = ({
  hangout,
  profile,
  isOwn,
  onProfileClick,
}: FeedHangoutCardProps) => {
  const { user } = useAuth();
  const timeAgo = getTimeAgo(hangout.created_at);
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

  const formatChip = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return `${format(d, "d", { locale: sv })} ${format(d, "MMM", { locale: sv }).replace(".", "")}`;
  };

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#EDE8F4" }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <FeedAvatar
          avatarUrl={(profile as any).avatar_url || null}
          displayName={profile.display_name}
          initials={profile.initials}
          onClick={onProfileClick}
        />
        <div>
          <button
            onClick={onProfileClick}
            className="text-sm font-medium hover:underline block leading-tight"
            style={{ color: "#3C2A4D" }}
          >
            {profile.display_name || "Någon"}
          </button>
          <p className="text-[11px] leading-tight" style={{ color: "#7A6A85" }}>
            sugen på · {timeAgo}
          </p>
        </div>
      </div>

      <p
        className="text-[14px] font-medium mb-3"
        style={{ color: "#3C2A4D" }}
      >
        Sugen på {activityName.toLowerCase()}
      </p>

      <div className="flex gap-1.5 flex-wrap">
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
                backgroundColor: isSelected ? "#3C2A4D" : "#F7F3EF",
                border: "1px solid transparent",
              }}
            >
              <span
                className="text-[12px] font-medium"
                style={{ color: isSelected ? "#FFFFFF" : "#3C2A4D" }}
              >
                {formatChip(dateStr)}
              </span>
              {count > 0 && (
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isSelected
                      ? "rgba(255,255,255,0.2)"
                      : "#EDE8F4",
                    color: isSelected ? "#FFFFFF" : "#7A6A85",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {hangout.custom_note && (
        <p
          className="text-[12px] mt-3"
          style={{ color: "#7A6A85" }}
        >
          {hangout.custom_note}
        </p>
      )}
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
