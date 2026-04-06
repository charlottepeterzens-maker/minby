import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import FeedAvatar from "@/components/feed/FeedAvatar";
import HangoutDetailSheet from "@/components/profile/HangoutDetailSheet";
import { sendNotification } from "@/utils/notifications";

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
    user_id?: string;
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
  onRefresh?: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  open: "LEDIG",
  available: "LEDIG",
  confirmed: "HÄNG MED",
  activity: "SUGEN PÅ",
};

const TYPE_LABEL_COLOR: Record<string, string> = {
  open: "#6B5A3E",
  available: "#6B5A3E",
  confirmed: "#5C4A7A",
  activity: "#2A6645",
};

const TYPE_BG_COLOR: Record<string, string> = {
  open: "#F5F0E8",
  available: "#F5F0E8",
  confirmed: "#EDE8F4",
  activity: "#E8F2EC",
};

function formatFeedDate(dateStr: string): string {
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
  return `${weekday} ${day} ${month}`;
}

function formatDateChip(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${format(d, "d", { locale: sv })} ${format(d, "MMM", { locale: sv }).replace(".", "")}`;
}

/** Single hangout card in the feed */
const UnifiedHangoutCard = ({
  hangout,
  profile,
  isOwn,
  onProfileClick,
  onRefresh,
}: FeedHangoutCardProps) => {
  const { user } = useAuth();
  const [detailOpen, setDetailOpen] = useState(false);
  const [yesCount, setYesCount] = useState(0);
  const [maybeCount, setMaybeCount] = useState(0);
  const [myResponse, setMyResponse] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hangoutId = hangout.id || "";
  const entryType = hangout.entry_type || "available";

  const entry = hangoutId
    ? {
        id: hangoutId,
        date: hangout.date || "",
        activities: hangout.activities,
        custom_note: hangout.custom_note,
        entry_type: entryType,
        user_id: hangout.user_id || "",
      }
    : null;

  const fetchResponses = useCallback(async () => {
    if (!hangoutId) return;
    const { data } = await supabase
      .from("hangout_responses")
      .select("user_id, response")
      .eq("availability_id", hangoutId);
    if (data) {
      setYesCount(data.filter(r => r.response === "yes").length);
      setMaybeCount(data.filter(r => r.response === "maybe").length);
      const mine = data.find(r => r.user_id === user?.id);
      setMyResponse(mine?.response || null);
    }
  }, [hangoutId, user?.id]);

  useEffect(() => { fetchResponses(); }, [fetchResponses]);

  const handleQuickRSVP = async (status: "yes" | "maybe") => {
    if (!user || !hangoutId || saving) return;
    setSaving(true);
    if (myResponse === status) {
      await supabase.from("hangout_responses").delete().eq("availability_id", hangoutId).eq("user_id", user.id);
      setMyResponse(null);
      toast("Svar borttaget");
    } else {
      await supabase.from("hangout_responses").upsert(
        { availability_id: hangoutId, user_id: user.id, response: status },
        { onConflict: "availability_id,user_id" }
      );
      setMyResponse(status);
      toast.success(status === "yes" ? "Du är med!" : "Kanske – vi ser!");
      if (hangout.user_id && hangout.user_id !== user.id) {
        const { data: myProfile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
        const name = myProfile?.display_name || "Någon";
        const label = hangout.custom_note || (hangout.activities[0]) || "häng";
        await sendNotification({
          recipientUserId: hangout.user_id,
          fromUserId: user.id,
          type: status === "yes" ? "hangout_yes" : "hangout_maybe",
          referenceId: hangoutId,
          message: status === "yes" ? `${name} vill hänga med på ${label}!` : `${name} kanske hänger med på ${label}`,
        });
      }
    }
    setSaving(false);
    fetchResponses();
    onRefresh?.();
  };

  const activityText = hangout.activities.length > 0 ? hangout.activities[0] : null;
  const noteText = hangout.custom_note || null;
  const textsAreSimilar =
    noteText && activityText &&
    (noteText.toLowerCase().includes(activityText.toLowerCase()) ||
     activityText.toLowerCase().includes(noteText.toLowerCase()));
  const mainText = noteText || activityText;

  const typeLabel = TYPE_LABEL[entryType] || "LEDIG";
  const typeLabelColor = TYPE_LABEL_COLOR[entryType] || "#6B5A3E";

  return (
    <div
      className="rounded-lg"
      style={{
        backgroundColor: TYPE_BG_COLOR[entryType] || "#F5F0E8",
        borderRadius: 8,
        padding: 16,
        overflow: "hidden",
      }}
    >
      {/* 1. DATE — Georgia serif */}
      {hangout.date && (
        <p style={{
          fontFamily: "'Fraunces', serif",
          fontSize: 22,
          fontWeight: 500,
          color: "#3C2A4D",
          lineHeight: 1.2,
          marginBottom: 6,
        }}>
          {formatFeedDate(hangout.date)}
        </p>
      )}

      {/* 2. FRITEXT */}
      {mainText && (
        <p style={{
          fontSize: 15,
          lineHeight: 1.55,
          color: "#3C2A4D",
          marginBottom: 10,
        }}>
          {mainText}
        </p>
      )}

      {/* 3. META ROW: avatar + name + type pill + match pill */}
      <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
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
          style={{ color: "#7A6A85" }}
        >
          {profile.display_name || "Vän"}
        </button>
        <span style={{ color: "#C9B8D8", fontSize: 12 }}>·</span>
        <span style={{
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
          color: typeLabelColor,
        }}>
          {typeLabel}
        </span>
        {(yesCount > 0 || maybeCount > 0) && (
          <>
            <span style={{ color: "#C9B8D8", fontSize: 12 }}>·</span>
            <span style={{ fontSize: 11, color: "#7A6A85" }}>
              {yesCount > 0 ? `${yesCount} kan` : ""}{yesCount > 0 && maybeCount > 0 ? " · " : ""}{maybeCount > 0 ? `${maybeCount} kanske` : ""}
            </span>
          </>
        )}
        {hangout.isMatch && !isOwn && (
          <span style={{
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            color: "#5C4A7A",
            marginLeft: "auto",
          }}>
            ni matcher
          </span>
        )}
      </div>

      {/* 4. ACTIONS */}
      {!isOwn && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDetailOpen(true)}
            className="text-[13px] font-medium transition-colors"
            style={{ backgroundColor: "#3C2A4D", color: "#FFFFFF", borderRadius: 8, padding: "8px 16px" }}
          >
            Jag kan
          </button>
          <button
            onClick={() => setDetailOpen(true)}
            className="text-[13px] font-medium transition-colors"
            style={{
              backgroundColor: "rgba(255,255,255,0.6)",
              color: "#3C2A4D",
              borderRadius: 8,
              padding: "8px 16px",
            }}
          >
            Kanske
          </button>
          <button
            onClick={() => setDetailOpen(true)}
            className="text-[12px] font-medium"
            style={{ color: "#7A6A85", marginLeft: 4 }}
          >
            Kommentera
          </button>
        </div>
      )}

      {entry && (
        <HangoutDetailSheet
          entry={entry}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          isOwner={!!isOwn}
          onRefresh={onRefresh}
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
  onRefresh,
}: FeedHangoutCardProps) => {
  const { user } = useAuth();
  const [detailOpen, setDetailOpen] = useState(false);
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
      className="rounded-lg"
      style={{
        backgroundColor: "#E8F2EC",
        borderRadius: 8,
        padding: 16,
        overflow: "hidden",
      }}
    >
      {/* 1. ACTIVITY — Georgia serif */}
      <p
        style={{
          fontFamily: "'Fraunces', serif",
          fontSize: 22,
          fontWeight: 500,
          color: "#3C2A4D",
          lineHeight: 1.2,
          marginBottom: 8,
        }}
      >
        {activityName}
      </p>

      {/* 2. DATE CHIPS */}
      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 10, color: "#7A6A85", marginBottom: 4 }}>
          förslag på datum
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
                className="flex items-center gap-1 rounded-full transition-all shrink-0"
                style={{
                  backgroundColor: isSelected ? "#3C2A4D" : "#F0EAE2",
                  border: "none",
                  padding: "2px 9px",
                  fontSize: 11,
                }}
              >
                <span style={{ color: isSelected ? "#FFFFFF" : "#3C2A4D" }}>
                  {formatDateChip(dateStr)}
                </span>
                {count > 0 && (
                  <span
                    className="font-medium px-1 rounded-full"
                    style={{
                      fontSize: 9,
                      backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.06)",
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
      </div>

      {/* 3. META ROW */}
      <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
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
          style={{ color: "#7A6A85" }}
        >
          {profile.display_name || "Vän"}
        </button>
        <span style={{ color: "#C9B8D8", fontSize: 12 }}>·</span>
        <span style={{
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
          color: "#2A6645",
        }}>
          SUGEN PÅ
        </span>
      </div>

      {/* 4. ACTIONS */}
      {!isOwn && (
        <div className="flex items-center gap-2">
          <button
            className="text-[13px] font-medium transition-colors"
            style={{ backgroundColor: "#3C2A4D", color: "#FFFFFF", borderRadius: 8, padding: "8px 16px" }}
          >
            Jag kan
          </button>
          <button
            className="text-[13px] font-medium transition-colors"
            style={{
              backgroundColor: "rgba(255,255,255,0.6)",
              color: "#3C2A4D",
              borderRadius: 8,
              padding: "8px 16px",
            }}
          >
            Kanske
          </button>
          <button
            onClick={() => setDetailOpen(true)}
            className="text-[12px] font-medium"
            style={{ color: "#7A6A85", marginLeft: 4 }}
          >
            Kommentera
          </button>
        </div>
      )}

      {/* Detail sheet for grouped activity */}
      {hangoutIds.length > 0 && (() => {
        const primaryEntry = {
          id: hangoutIds[0],
          date: dates[0] || "",
          activities: hangout.activities,
          custom_note: hangout.custom_note,
          entry_type: hangout.entry_type || "activity",
          user_id: hangout.user_id || "",
        };
        const grouped = hangoutIds.map((hid, idx) => ({
          id: hid,
          date: dates[idx] || "",
          activities: hangout.activities,
          custom_note: hangout.custom_note,
          entry_type: hangout.entry_type || "activity",
          user_id: hangout.user_id || "",
        }));
        return (
          <HangoutDetailSheet
            entry={primaryEntry}
            open={detailOpen}
            onOpenChange={setDetailOpen}
            isOwner={!!isOwn}
            groupedEntries={grouped}
            onRefresh={onRefresh}
          />
        );
      })()}
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
