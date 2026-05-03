import { useState, useEffect, useCallback } from "react";
import { monthShort, weekdayLong, weekdayShort, formatDayMonth } from "@/utils/months";
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

function formatFeedDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.getTime() === today.getTime()) return "Idag";
  if (d.getTime() === tomorrow.getTime()) return "Imorgon";

  return `${weekdayLong(d)} ${d.getDate()} ${monthShort(d)}`;
}

function formatDateChip(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${monthShort(d)}`;
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
  return formatDayMonth(date);
}

const cardStyle = {
  padding: "13px 14px",
  overflow: "hidden" as const,
};

const divider = (
  <div style={{ height: 1, backgroundColor: "hsl(var(--color-border-subtle))", margin: "12px 0" }} />
);

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
        const label = hangout.custom_note || hangout.activities[0] || "häng";
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

  const mainText = hangout.custom_note || (hangout.activities.length > 0 ? hangout.activities[0] : null);
  const hasResponses = yesCount > 0 || maybeCount > 0;

  return (
    <div style={cardStyle}>
      {/* Header — avatar + name + time */}
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
            style={{ color: "hsl(var(--color-text-primary))" }}
          >
            {isOwn ? "Du" : profile.display_name || "Vän"}
          </button>
          <p className="text-[11px] leading-tight" style={{ color: "hsl(var(--color-text-secondary))" }}>
            {getTimeAgo(hangout.created_at)}
          </p>
        </div>
        {hangout.isMatch && !isOwn && (
          <span className="ml-auto text-[11px]" style={{ color: "hsl(var(--color-text-secondary))" }}>
            ni matcher
          </span>
        )}
      </div>

      {/* Content — date + activity */}
      {hangout.date && (
        <p style={{ fontSize: 18, fontWeight: 500, color: "hsl(var(--color-text-primary))", lineHeight: 1.25, marginBottom: 4 }}>
          {formatFeedDate(hangout.date)}
        </p>
      )}
      {mainText && (
        <p style={{ fontSize: 14, color: "hsl(var(--color-text-secondary))", lineHeight: 1.5 }}>
          {mainText}
        </p>
      )}

      {/* Response count */}
      {hasResponses && (
        <p className="mt-2 text-[11px]" style={{ color: "hsl(var(--color-text-secondary))" }}>
          {[yesCount > 0 && `${yesCount} kan`, maybeCount > 0 && `${maybeCount} kanske`].filter(Boolean).join(" · ")}
        </p>
      )}

      {/* Actions */}
      {!isOwn && (
        <>
          {divider}
          <div className="flex items-center gap-4">
            {myResponse ? (
              <button
                onClick={() => handleQuickRSVP(myResponse as "yes" | "maybe")}
                disabled={saving}
                className="text-[13px] font-medium disabled:opacity-50"
                style={{ color: "hsl(var(--color-text-secondary))" }}
              >
                Ångra svar
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleQuickRSVP("yes")}
                  disabled={saving}
                  className="text-[13px] font-medium rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: "#561828", color: "#fff", padding: "7px 16px" }}
                >
                  Jag kan
                </button>
                <button
                  onClick={() => handleQuickRSVP("maybe")}
                  disabled={saving}
                  className="text-[13px] font-medium disabled:opacity-50"
                  style={{ color: "hsl(var(--color-text-secondary))", background: "none", border: "none" }}
                >
                  Kanske
                </button>
              </>
            )}
          </div>
        </>
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
  const [totalYes, setTotalYes] = useState(0);
  const [totalMaybe, setTotalMaybe] = useState(0);
  const [myResponse, setMyResponse] = useState<string | null>(null);

  const fetchRsvps = useCallback(async () => {
    if (hangoutIds.length === 0) return;
    const { data } = await supabase
      .from("hangout_responses")
      .select("availability_id, user_id, response")
      .in("availability_id", hangoutIds);

    if (data) {
      const counts: Record<string, number> = {};
      let yes = 0, maybe = 0;
      let myResp: string | null = null;
      data.forEach((r: any) => {
        const idx = hangoutIds.indexOf(r.availability_id);
        if (idx >= 0 && dates[idx]) {
          const d = dates[idx];
          counts[d] = (counts[d] || 0) + 1;
        }
        if (r.response === "yes") yes++;
        else if (r.response === "maybe") maybe++;
        if (r.user_id === user?.id) {
          myResp = r.response;
          const idx2 = hangoutIds.indexOf(r.availability_id);
          if (idx2 >= 0 && dates[idx2]) setSelectedDate(dates[idx2]);
        }
      });
      setRsvpCounts(counts);
      setTotalYes(yes);
      setTotalMaybe(maybe);
      setMyResponse(myResp);
    }
  }, [hangoutIds, dates, user?.id]);

  useEffect(() => { fetchRsvps(); }, [fetchRsvps]);

  const handleDateClick = async (dateStr: string) => {
    if (!user || isOwn || saving) return;
    setSaving(true);
    const dateIdx = dates.indexOf(dateStr);
    const hangoutId = hangoutIds[dateIdx];
    if (!hangoutId) { setSaving(false); return; }

    if (selectedDate === dateStr && myResponse) {
      await supabase.from("hangout_responses").delete().eq("availability_id", hangoutId).eq("user_id", user.id);
      setSelectedDate(null);
      setMyResponse(null);
      toast("Val borttaget");
    } else {
      if (selectedDate && myResponse) {
        const oldIdx = dates.indexOf(selectedDate);
        const oldId = hangoutIds[oldIdx];
        if (oldId) await supabase.from("hangout_responses").delete().eq("availability_id", oldId).eq("user_id", user.id);
      }
      await supabase.from("hangout_responses").upsert(
        { availability_id: hangoutId, user_id: user.id, response: "yes" },
        { onConflict: "availability_id,user_id" }
      );
      setSelectedDate(dateStr);
      setMyResponse("yes");
      toast.success("Du är på!");
    }
    setSaving(false);
    fetchRsvps();
  };

  const hasResponses = totalYes > 0 || totalMaybe > 0;

  return (
    <div style={cardStyle}>
      {/* Header — avatar + name + time */}
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
            style={{ color: "hsl(var(--color-text-primary))" }}
          >
            {isOwn ? "Du" : profile.display_name || "Vän"}
          </button>
          <p className="text-[11px] leading-tight" style={{ color: "hsl(var(--color-text-secondary))" }}>
            {getTimeAgo(hangout.created_at)}
          </p>
        </div>
      </div>

      {/* Activity name */}
      <p style={{ fontSize: 18, fontWeight: 500, color: "hsl(var(--color-text-primary))", lineHeight: 1.25, marginBottom: 10 }}>
        {activityName}
      </p>

      {/* Date chips */}
      <div className="flex gap-1.5 flex-wrap mb-2">
        {dates.map((dateStr) => {
          const isSelected = selectedDate === dateStr;
          const count = rsvpCounts[dateStr] || 0;
          return (
            <button
              key={dateStr}
              onClick={() => handleDateClick(dateStr)}
              disabled={isOwn || saving}
              className="flex items-center gap-1.5 rounded-full transition-all shrink-0"
              style={{
                backgroundColor: isSelected ? "hsl(var(--color-text-primary))" : "hsl(var(--color-surface-raised))",
                border: "none",
                padding: "4px 12px",
                fontSize: 12,
                color: isSelected ? "#fff" : "hsl(var(--color-text-primary))",
              }}
            >
              {formatDateChip(dateStr)}
              {count > 0 && (
                <span style={{
                  fontSize: 11,
                  opacity: 0.7,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Response count */}
      {hasResponses && (
        <p className="mt-1 text-[11px]" style={{ color: "hsl(var(--color-text-secondary))" }}>
          {[totalYes > 0 && `${totalYes} kan`, totalMaybe > 0 && `${totalMaybe} kanske`].filter(Boolean).join(" · ")}
        </p>
      )}

      {/* Actions */}
      {!isOwn && (
        <>
          {divider}
          <div className="flex items-center gap-4">
            {myResponse ? (
              <button
                onClick={async () => {
                  if (!user || saving) return;
                  setSaving(true);
                  for (const hid of hangoutIds) {
                    await supabase.from("hangout_responses").delete().eq("availability_id", hid).eq("user_id", user.id);
                  }
                  setMyResponse(null);
                  setSelectedDate(null);
                  toast("Svar borttaget");
                  setSaving(false);
                  fetchRsvps();
                }}
                disabled={saving}
                className="text-[13px] font-medium disabled:opacity-50"
                style={{ color: "hsl(var(--color-text-secondary))", background: "none", border: "none" }}
              >
                Ångra svar
              </button>
            ) : (
              <>
                <button
                  onClick={() => setDetailOpen(true)}
                  className="text-[13px] font-medium rounded-lg"
                  style={{ backgroundColor: "#561828", color: "#fff", padding: "7px 16px" }}
                >
                  Jag kan
                </button>
                <button
                  onClick={() => setDetailOpen(true)}
                  className="text-[13px] font-medium"
                  style={{ color: "hsl(var(--color-text-secondary))", background: "none", border: "none" }}
                >
                  Kanske
                </button>
              </>
            )}
          </div>
        </>
      )}

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
  if (entryType === "activity" && props.hangout.dates && props.hangout.dates.length > 0) {
    return <GroupedActivityCard {...props} />;
  }
  return <UnifiedHangoutCard {...props} />;
};

export default FeedHangoutCard;
