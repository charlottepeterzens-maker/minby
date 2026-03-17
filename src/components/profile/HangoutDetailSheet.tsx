import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { X, Send, Trash2, Plus, Users, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ConfirmSheet from "@/components/ConfirmSheet";
import { toast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { sendNotification } from "@/utils/notifications";

interface AvailabilityEntry {
  id: string;
  date: string;
  activities: string[];
  custom_note: string | null;
  entry_type: string;
  user_id: string;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { display_name: string | null };
}

interface TaggedFriend {
  id: string;
  tagged_user_id: string;
  tagged_by: string;
  profile?: { display_name: string | null; avatar_url: string | null };
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
  entry: AvailabilityEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwner: boolean;
  onDeleted?: () => void;
  onEdited?: () => void;
  /** All entries in the same activity group (for activity type) */
  groupedEntries?: AvailabilityEntry[];
  /** Called after single date removal to refresh parent */
  onRefresh?: () => void;
  /** Open AddHangoutSheet with prefilled activity name */
  onAddActivityDate?: (activityName: string) => void;
}

const HangoutDetailSheet = ({
  entry, open, onOpenChange, isOwner, onDeleted, onEdited,
  groupedEntries, onRefresh, onAddActivityDate,
}: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [taggedFriends, setTaggedFriends] = useState<TaggedFriend[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [friendResults, setFriendResults] = useState<any[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState<{ display_name: string | null } | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const { subscribe: subscribePush, subscribed: pushSubscribed, permission: pushPermission, isSupported: pushSupported } = usePushNotifications();

  const fetchDetails = useCallback(async () => {
    if (!entry) return;

    // For activity groups, fetch tags/comments for ALL entries in the group
    const entryIds = entry.entry_type === "activity" && groupedEntries && groupedEntries.length > 0
      ? groupedEntries.map(e => e.id)
      : [entry.id];

    const [commentsRes, tagsRes] = await Promise.all([
      supabase.from("hangout_comments").select("*").in("availability_id", entryIds).order("created_at", { ascending: true }),
      supabase.from("hangout_tagged_friends").select("*").in("availability_id", entryIds),
    ]);

    if (commentsRes.data) {
      const uids = [...new Set(commentsRes.data.map((c: any) => c.user_id))];
      if (uids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", uids);
        const pm = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        setComments(commentsRes.data.map((c: any) => ({ ...c, profile: pm.get(c.user_id) })));
      } else {
        setComments(commentsRes.data.map((c: any) => ({ ...c, profile: undefined })));
      }
    }

    if (tagsRes.data) {
      const tids = [...new Set(tagsRes.data.map((t: any) => t.tagged_user_id))];
      if (tids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", tids);
        const pm = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        // Deduplicate tagged friends by user id
        const seen = new Set<string>();
        const deduped = tagsRes.data.filter((t: any) => {
          if (seen.has(t.tagged_user_id)) return false;
          seen.add(t.tagged_user_id);
          return true;
        });
        setTaggedFriends(deduped.map((t: any) => ({ ...t, profile: pm.get(t.tagged_user_id) })));
      } else {
        setTaggedFriends([]);
      }
    }

    if (!isOwner && entry.user_id) {
      const { data } = await supabase.from("profiles").select("display_name").eq("user_id", entry.user_id).single();
      if (data) setOwnerProfile(data);
    }
  }, [entry, isOwner, groupedEntries]);

  useEffect(() => {
    if (open && entry) {
      fetchDetails();
      setCommentText("");
      setShowInvite(false);
    }
  }, [open, entry, fetchDetails]);

  if (!entry) return null;

  const dateObj = new Date(entry.date + "T00:00:00");
  const weekday = format(dateObj, "EEEE", { locale: sv });
  const shortWeekday = format(dateObj, "EEE", { locale: sv }).replace(".", "");
  const day = format(dateObj, "d");
  const month = format(dateObj, "MMMM", { locale: sv });
  const shortMonth = format(dateObj, "M");
  const typeLabel = entry.entry_type === "confirmed" ? "häng med" : entry.entry_type === "activity" ? "sugen på" : "vill ses";
  const activityName = entry.activities.length > 0 ? entry.activities.map(a => ACTIVITY_MAP[a] || a).join(", ") : entry.custom_note || null;

  // Activity group data
  const activityEntries = entry.entry_type === "activity" && groupedEntries && groupedEntries.length > 0
    ? groupedEntries
    : entry.entry_type === "activity" ? [entry] : [];
  const activityGroupName = activityName || "";

  const handleAddComment = async () => {
    if (!commentText.trim() || !user) return;
    setSending(true);
    await supabase.from("hangout_comments").insert({ availability_id: entry.id, user_id: user.id, content: commentText.trim() });

    if (entry.user_id !== user.id) {
      const { data: myProfile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
      const name = myProfile?.display_name || "Någon";
      const actLabel = activityName || entry.custom_note || "din dejt";
      await sendNotification({
        recipientUserId: entry.user_id,
        fromUserId: user.id,
        type: "hangout_comment",
        referenceId: entry.id,
        message: `${name} kommenterade din dejt ${actLabel}`,
      });
    }

    setCommentText("");
    await fetchDetails();
    setSending(false);
  };

  const handleDeleteComment = async (id: string) => {
    await supabase.from("hangout_comments").delete().eq("id", id);
    setComments(prev => prev.filter(c => c.id !== id));
  };

  const searchFriends = async (q: string) => {
    setFriendSearch(q);
    if (q.length < 2) { setFriendResults([]); return; }
    const { data } = await supabase.from("profiles").select("user_id, display_name, avatar_url").ilike("display_name", `%${q}%`).limit(5);
    if (data) {
      const already = new Set(taggedFriends.map(t => t.tagged_user_id));
      setFriendResults(data.filter((p: any) => !already.has(p.user_id) && p.user_id !== user?.id));
    }
  };

  const handleTagFriend = async (friendId: string) => {
    if (!user) return;
    await supabase.from("hangout_tagged_friends").insert({ availability_id: entry.id, tagged_user_id: friendId, tagged_by: user.id });
    setFriendSearch("");
    setFriendResults([]);
    setShowInvite(false);
    await fetchDetails();
  };

  const handleRemoveTag = async (tagId: string) => {
    await supabase.from("hangout_tagged_friends").delete().eq("id", tagId);
    setTaggedFriends(prev => prev.filter(t => t.id !== tagId));
  };

  const handleDelete = async () => {
    await supabase.from("hangout_availability").delete().eq("id", entry.id);
    onOpenChange(false);
    onDeleted?.();
  };

  const handleRemoveSingleDate = async (entryId: string) => {
    await supabase.from("hangout_availability").delete().eq("id", entryId);
    toast({ title: "Datum borttaget" });
    // If it was the last date in the group, close the sheet
    if (activityEntries.length <= 1) {
      onOpenChange(false);
    }
    onRefresh?.();
    onDeleted?.();
  };

  const handleDeleteAllActivityDates = async () => {
    if (activityEntries.length === 0) return;
    const ids = activityEntries.map(e => e.id);
    await supabase.from("hangout_availability").delete().in("id", ids);
    onOpenChange(false);
    onDeleted?.();
  };

  const handleRSVP = async (status: "yes" | "maybe") => {
    if (!user) return;
    const existing = taggedFriends.find(t => t.tagged_user_id === user.id);
    if (!existing && status === "yes") {
      await supabase.from("hangout_tagged_friends").insert({ availability_id: entry.id, tagged_user_id: user.id, tagged_by: user.id });
    }

    if (entry.user_id !== user.id) {
      const { data: myProfile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
      const name = myProfile?.display_name || "Någon";
      const actLabel = activityName || entry.custom_note || "häng";
      const message = status === "yes"
        ? `${name} vill hänga med på ${actLabel}!`
        : `${name} kanske hänger med på ${actLabel}`;

      await sendNotification({
        recipientUserId: entry.user_id,
        fromUserId: user.id,
        type: status === "yes" ? "hangout_yes" : "hangout_maybe",
        referenceId: entry.id,
        message,
      });
    }

    if (pushSupported && pushPermission === "default" && !pushSubscribed) {
      subscribePush();
    }

    await fetchDetails();
  };

  const handleCreateGroup = async () => {
    if (!user || creatingGroup) return;
    setCreatingGroup(true);
    try {
      const groupName = `${activityName || "Häng"} ${shortWeekday} ${day}/${shortMonth}`;

      const { data: group, error: groupError } = await supabase
        .from("friend_groups")
        .insert({ name: groupName, owner_id: user.id, emoji: "🎉" })
        .select("id")
        .single();

      if (groupError || !group) {
        toast({ title: "Kunde inte skapa grupp", variant: "destructive" });
        setCreatingGroup(false);
        return;
      }

      const memberInserts = taggedFriends
        .filter(tf => tf.tagged_user_id !== user.id)
        .map(tf => ({
          group_id: group.id,
          user_id: tf.tagged_user_id,
          role: "member",
        }));

      if (memberInserts.length > 0) {
        await supabase.from("group_memberships").insert(memberInserts);
      }

      onOpenChange(false);
      navigate(`/groups/${group.id}`);
    } catch {
      toast({ title: "Något gick fel", variant: "destructive" });
    }
    setCreatingGroup(false);
  };

  const isSelfTagged = taggedFriends.some(t => t.tagged_user_id === user?.id);
  const hasYesResponses = taggedFriends.length > 0;

  // ── Shared UI blocks ──

  const renderDateBlock = () => (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] uppercase tracking-wider" style={{ color: "#B0A8B5" }}>{weekday}</span>
      <span className="text-[40px] font-medium leading-none" style={{ color: "#3C2A4D" }}>{day}</span>
      <span className="text-[10px] uppercase font-medium" style={{ color: "#C9B8D8" }}>{month}</span>
      <span className="text-[9px] uppercase tracking-wider mt-1" style={{ color: "#B0A8B5" }}>{typeLabel}</span>
      {!isOwner && ownerProfile && (
        <span className="text-[11px] mt-0.5" style={{ color: "#7A6A85" }}>{ownerProfile.display_name}</span>
      )}
    </div>
  );

  const renderNoteCard = () => (
    (activityName || entry.custom_note) ? (
      <div className="bg-card rounded-[12px] p-3 space-y-1" style={{ border: "0.5px solid #EDE8F4" }}>
        {activityName && <p className="text-[13px] font-medium text-foreground">{activityName}</p>}
        {entry.custom_note && entry.custom_note !== activityName && (
          <p className="text-[12px]" style={{ color: "#7A6A85" }}>{entry.custom_note}</p>
        )}
      </div>
    ) : null
  );

  const renderComments = () => (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#B0A8B5" }}>Kommentarer</p>
      {comments.length > 0 && (
        <div className="space-y-2">
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-2 group">
              <Avatar className="w-5 h-5 mt-0.5">
                <AvatarFallback style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }} className="text-[8px]">
                  {(c.profile?.display_name || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-medium text-foreground">{c.user_id === user?.id ? "Du" : (c.profile?.display_name || "Någon")}</span>
                <p className="text-[12px]" style={{ color: "#7A6A85" }}>{c.content}</p>
              </div>
              {(c.user_id === user?.id || isOwner) && (
                <button onClick={() => handleDeleteComment(c.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1.5 items-center">
        <Input
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          placeholder="Skriv en kommentar..."
          className="h-8 text-[12px] flex-1 bg-card border-border/30"
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleAddComment()}
        />
        <button
          disabled={sending || !commentText.trim()}
          onClick={handleAddComment}
          className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40 transition-colors"
          style={{ backgroundColor: "#3C2A4D" }}
        >
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );

  const renderInviteRow = () => (
    showInvite ? (
      <div className="space-y-1.5">
        <Input
          value={friendSearch}
          onChange={e => searchFriends(e.target.value)}
          placeholder="Sök vän..."
          className="h-8 text-[12px] bg-card border-border/30"
          autoFocus
        />
        {friendResults.map(f => (
          <button key={f.user_id} onClick={() => handleTagFriend(f.user_id)} className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
            <Avatar className="w-5 h-5">
              <AvatarFallback style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }} className="text-[8px]">
                {f.display_name?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-[12px] text-foreground">{f.display_name}</span>
          </button>
        ))}
      </div>
    ) : (
      <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 py-1">
        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#EDE8F4" }}>
          <Plus className="w-3 h-3" style={{ color: "#3C2A4D" }} />
        </div>
        <span className="text-[12px]" style={{ color: "#7A6A85" }}>Bjud in fler vänner</span>
      </button>
    )
  );

  const renderTaggedFriendsList = () => (
    taggedFriends.length > 0 ? (
      <div className="space-y-1.5">
        {taggedFriends.map(tf => (
          <div key={tf.id} className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }} className="text-[9px] font-medium">
                {tf.profile?.display_name?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-[12px] text-foreground flex-1">{tf.profile?.display_name || "Okänd"}</span>
            <Badge className="text-[9px] px-1.5 py-0 h-4 border-0" style={{ backgroundColor: "#EAF2E8", color: "#1F4A1A" }}>Ja</Badge>
            {isOwner && (
              <button onClick={() => handleRemoveTag(tf.id)} className="text-muted-foreground/40 hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    ) : null
  );

  const renderCreateGroupRow = () => (
    hasYesResponses && isOwner ? (
      <button
        onClick={handleCreateGroup}
        disabled={creatingGroup}
        className="flex items-center gap-2.5 w-full p-2.5 transition-colors hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: "#EDE8F4", borderRadius: 9 }}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: "#3C2A4D" }}>
          <Users className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[12px] font-medium text-foreground">Skapa en grupp</p>
          <p className="text-[10px] truncate" style={{ color: "#7A6A85" }}>
            För {activityName || "häng"} {shortWeekday} {day}/{shortMonth}
          </p>
        </div>
      </button>
    ) : null
  );

  // ── Type-specific content ──

  const renderActivityDetail = () => (
    <div className="space-y-4">
      {/* Activity name as heading */}
      <p className="text-[14px] font-medium text-center" style={{ color: "#3C2A4D" }}>
        {activityGroupName}
      </p>

      {/* Date chips */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {activityEntries.map(ae => {
          const d = new Date(ae.date + "T00:00:00");
          const label = format(d, "EEE d/M", { locale: sv }).replace(".", "");
          return (
            <span
              key={ae.id}
              className="inline-flex items-center gap-1 text-[11px]"
              style={{ backgroundColor: "#B5CCBF", borderRadius: 6, padding: "3px 8px", color: "#1F4A1A" }}
            >
              {label}
              {isOwner && (
                <button onClick={() => handleRemoveSingleDate(ae.id)} className="hover:opacity-70 ml-0.5">
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </span>
          );
        })}
      </div>

      {/* Add date button */}
      {isOwner && onAddActivityDate && (
        <button
          onClick={() => { onOpenChange(false); onAddActivityDate(activityGroupName); }}
          className="flex items-center gap-1.5 mx-auto py-1"
        >
          <Plus className="w-3.5 h-3.5" style={{ color: "#7A6A85" }} />
          <span className="text-[12px]" style={{ color: "#7A6A85" }}>Lägg till datum</span>
        </button>
      )}

      {/* Tagged friends count */}
      {taggedFriends.length > 0 && (
        <p className="text-[10px] text-center" style={{ color: "#7A6A85" }}>
          {taggedFriends.length} kan
        </p>
      )}

      {/* Svar section (owner) */}
      {isOwner && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#B0A8B5" }}>Svar</p>
          {renderTaggedFriendsList()}
          {renderInviteRow()}
        </div>
      )}

      {/* Friend RSVP view */}
      {!isOwner && (
        <div className="space-y-2">
          {taggedFriends.length > 0 && (
            <>
              <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#B0A8B5" }}>Redan med</p>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {taggedFriends.slice(0, 5).map(tf => (
                    <Avatar key={tf.id} className="w-7 h-7 border-2 border-card">
                      <AvatarFallback style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }} className="text-[9px] font-medium">
                        {tf.profile?.display_name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-[11px]" style={{ color: "#7A6A85" }}>
                  {taggedFriends.map(t => t.profile?.display_name || "Okänd").join(", ")}
                </span>
              </div>
            </>
          )}
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => handleRSVP("yes")}
              disabled={isSelfTagged}
              className="flex-1 py-2 text-[13px] font-medium rounded-[10px] transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#EAF2E8", color: "#1F4A1A" }}
            >
              {isSelfTagged ? "Du är med!" : "Jag hänger med!"}
            </button>
            <button
              className="px-4 py-2 text-[13px] font-medium rounded-[10px] transition-colors"
              style={{ backgroundColor: "#FFFFFF", color: "#7A6A85", border: "0.5px solid #EDE8F4" }}
            >
              Kanske
            </button>
          </div>
        </div>
      )}

      {/* Custom note */}
      {entry.custom_note && entry.custom_note !== activityGroupName && (
        <div className="bg-card rounded-[12px] p-3" style={{ border: "0.5px solid #EDE8F4" }}>
          <p className="text-[12px]" style={{ color: "#7A6A85" }}>{entry.custom_note}</p>
        </div>
      )}

      {renderComments()}

      {/* Owner actions */}
      {isOwner && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => { onOpenChange(false); onEdited?.(); }}
            className="flex-1 py-2.5 text-[13px] font-medium rounded-[10px] text-white"
            style={{ backgroundColor: "#3C2A4D" }}
          >
            Redigera
          </button>
          <button
            onClick={() => setDeleteAllConfirm(true)}
            className="flex-1 py-2.5 text-[13px] font-medium rounded-[10px] text-white"
            style={{ backgroundColor: "#993556" }}
          >
            Ta bort alla datum
          </button>
        </div>
      )}
    </div>
  );

  const renderConfirmedDetail = () => (
    <div className="space-y-4">
      {renderDateBlock()}
      {renderNoteCard()}

      {/* Svar section */}
      {isOwner ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#B0A8B5" }}>Svar</p>
          {renderTaggedFriendsList()}
          {renderInviteRow()}
          {renderCreateGroupRow()}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#B0A8B5" }}>Redan med</p>
          {taggedFriends.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {taggedFriends.slice(0, 5).map(tf => (
                  <Avatar key={tf.id} className="w-7 h-7 border-2 border-card">
                    <AvatarFallback style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }} className="text-[9px] font-medium">
                      {tf.profile?.display_name?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-[11px]" style={{ color: "#7A6A85" }}>
                {taggedFriends.map(t => t.profile?.display_name || "Okänd").join(", ")}
              </span>
            </div>
          )}
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => handleRSVP("yes")}
              disabled={isSelfTagged}
              className="flex-1 py-2 text-[13px] font-medium rounded-[10px] transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#EAF2E8", color: "#1F4A1A" }}
            >
              {isSelfTagged ? "Du är med!" : "Jag hänger med!"}
            </button>
            <button
              className="px-4 py-2 text-[13px] font-medium rounded-[10px] transition-colors"
              style={{ backgroundColor: "#FFFFFF", color: "#7A6A85", border: "0.5px solid #EDE8F4" }}
            >
              Kanske
            </button>
          </div>
        </div>
      )}

      {renderComments()}

      {isOwner && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => { onOpenChange(false); onEdited?.(); }}
            className="flex-1 py-2.5 text-[13px] font-medium rounded-[10px] text-white"
            style={{ backgroundColor: "#3C2A4D" }}
          >
            Redigera
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex-1 py-2.5 text-[13px] font-medium rounded-[10px] text-white"
            style={{ backgroundColor: "#993556" }}
          >
            Ta bort
          </button>
        </div>
      )}
    </div>
  );

  const renderAvailableDetail = () => (
    <div className="space-y-4">
      {renderDateBlock()}
      {renderNoteCard()}

      {/* Svar section */}
      {isOwner ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#B0A8B5" }}>Svar</p>
          {renderTaggedFriendsList()}
          {renderInviteRow()}
        </div>
      ) : (
        <div className="space-y-2">
          {taggedFriends.length > 0 && (
            <>
              <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#B0A8B5" }}>Redan med</p>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {taggedFriends.slice(0, 5).map(tf => (
                    <Avatar key={tf.id} className="w-7 h-7 border-2 border-card">
                      <AvatarFallback style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }} className="text-[9px] font-medium">
                        {tf.profile?.display_name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-[11px]" style={{ color: "#7A6A85" }}>
                  {taggedFriends.map(t => t.profile?.display_name || "Okänd").join(", ")}
                </span>
              </div>
            </>
          )}
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => handleRSVP("yes")}
              disabled={isSelfTagged}
              className="flex-1 py-2 text-[13px] font-medium rounded-[10px] transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#EAF2E8", color: "#1F4A1A" }}
            >
              {isSelfTagged ? "Du är med!" : "Jag hänger med!"}
            </button>
            <button
              className="px-4 py-2 text-[13px] font-medium rounded-[10px] transition-colors"
              style={{ backgroundColor: "#FFFFFF", color: "#7A6A85", border: "0.5px solid #EDE8F4" }}
            >
              Kanske
            </button>
          </div>
        </div>
      )}

      {renderComments()}

      {isOwner && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => { onOpenChange(false); onEdited?.(); }}
            className="flex-1 py-2.5 text-[13px] font-medium rounded-[10px] text-white"
            style={{ backgroundColor: "#3C2A4D" }}
          >
            Redigera
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex-1 py-2.5 text-[13px] font-medium rounded-[10px] text-white"
            style={{ backgroundColor: "#993556" }}
          >
            Ta bort
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          className="mx-auto max-w-lg border-0 max-h-[85vh]"
          style={{ backgroundColor: "#F7F3EF", borderRadius: "20px 20px 0 0" }}
        >
          {/* Handle + Close */}
          <div className="flex justify-end px-4 pt-2">
            <button onClick={() => onOpenChange(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors">
              <X className="w-4 h-4" style={{ color: "#7A6A85" }} />
            </button>
          </div>

          <div className="px-5 pb-6 space-y-4 overflow-y-auto">
            {entry.entry_type === "activity" ? renderActivityDetail()
              : entry.entry_type === "confirmed" ? renderConfirmedDetail()
              : renderAvailableDetail()}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Single entry delete confirm */}
      <ConfirmSheet
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="Ta bort datum"
        description="Vill du ta bort detta datum?"
        confirmLabel="Ta bort"
        confirmStyle={{ backgroundColor: "#993556" }}
        onConfirm={handleDelete}
      />

      {/* Activity group delete all confirm */}
      <ConfirmSheet
        open={deleteAllConfirm}
        onOpenChange={setDeleteAllConfirm}
        title="Ta bort aktivitet"
        description={`Vill du ta bort ${activityGroupName} och alla tillhörande datum?`}
        confirmLabel="Ta bort alla"
        confirmStyle={{ backgroundColor: "#993556" }}
        onConfirm={handleDeleteAllActivityDates}
      />
    </>
  );
};

export default HangoutDetailSheet;
