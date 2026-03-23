import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { X, Send, Trash2, Plus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
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
  profile?: { display_name: string | null; avatar_url: string | null };
}

interface TaggedFriend {
  id: string;
  tagged_user_id: string;
  tagged_by: string;
  status?: string;
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
  groupedEntries?: AvailabilityEntry[];
  onRefresh?: () => void;
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
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState<{ display_name: string | null } | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const { subscribe: subscribePush, subscribed: pushSubscribed, permission: pushPermission, isSupported: pushSupported } = usePushNotifications();

  const fetchDetails = useCallback(async () => {
    if (!entry) return;

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
      setShowCommentInput(false);
    }
  }, [open, entry, fetchDetails]);

  if (!entry) return null;

  const dateObj = new Date(entry.date + "T00:00:00");
  const dateDisplay = format(dateObj, "EEEE d MMMM", { locale: sv });
  const shortWeekday = format(dateObj, "EEE", { locale: sv }).replace(".", "");
  const day = format(dateObj, "d");
  const shortMonth = format(dateObj, "M");

  const intentLabel = entry.entry_type === "confirmed" ? "Häng med" : entry.entry_type === "activity" ? "Sugen på" : "Jag vill ses";
  const activityName = entry.activities.length > 0 ? entry.activities.map(a => ACTIVITY_MAP[a] || a).join(", ") : null;
  const description = entry.custom_note || "";
  const ownerName = ownerProfile?.display_name || "Någon";

  const activityEntries = entry.entry_type === "activity" && groupedEntries && groupedEntries.length > 0
    ? groupedEntries
    : entry.entry_type === "activity" ? [entry] : [];
  const activityGroupName = activityName || entry.custom_note || "";

  // Handlers
  const handleAddComment = async () => {
    if (!commentText.trim() || !user) return;
    setSending(true);
    await supabase.from("hangout_comments").insert({ availability_id: entry.id, user_id: user.id, content: commentText.trim() });

    if (entry.user_id !== user.id) {
      const { data: myProfile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
      const name = myProfile?.display_name || "Någon";
      await sendNotification({
        recipientUserId: entry.user_id,
        fromUserId: user.id,
        type: "hangout_comment",
        referenceId: entry.id,
        message: `${name} kommenterade på "${description || activityGroupName || "häng"}"`,
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

  const handleRSVP = async (status: "yes" | "maybe") => {
    if (!user) return;
    const existing = taggedFriends.find(t => t.tagged_user_id === user.id);
    if (!existing && status === "yes") {
      await supabase.from("hangout_tagged_friends").insert({ availability_id: entry.id, tagged_user_id: user.id, tagged_by: user.id });
    }

    if (entry.user_id !== user.id) {
      const { data: myProfile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
      const name = myProfile?.display_name || "Någon";
      const label = activityName || description || "häng";
      const message = status === "yes"
        ? `${name} vill hänga med på ${label}!`
        : `${name} kanske hänger med på ${label}`;

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

    toast({ title: status === "yes" ? "Du är med! 💛" : "Kanske – vi ser!" });
    await fetchDetails();
  };

  const handleDelete = async () => {
    await supabase.from("hangout_availability").delete().eq("id", entry.id);
    onOpenChange(false);
    onDeleted?.();
  };

  const handleRemoveSingleDate = async (entryId: string) => {
    await supabase.from("hangout_availability").delete().eq("id", entryId);
    toast({ title: "Datum borttaget" });
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

  const handleCreateGroup = async () => {
    if (!user || creatingGroup) return;
    setCreatingGroup(true);
    try {
      const groupName = `${activityName || description || "Häng"} ${shortWeekday} ${day}/${shortMonth}`;

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

      // Add all tagged friends + owner to group
      const memberInserts = taggedFriends
        .filter(tf => tf.tagged_user_id !== user.id)
        .map(tf => ({ group_id: group.id, user_id: tf.tagged_user_id, role: "member" }));

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
  const totalResponses = taggedFriends.length;
  const canCreateGroup = totalResponses >= 2;

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          className="mx-auto max-w-lg border-0 max-h-[85vh]"
          style={{ backgroundColor: "#F7F3EF", borderRadius: "20px 20px 0 0" }}
        >
          {/* Close button */}
          <div className="flex justify-end px-4 pt-1">
            <button onClick={() => onOpenChange(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors">
              <X className="w-4 h-4" style={{ color: "#7A6A85" }} />
            </button>
          </div>

          <div className="px-5 pb-8 space-y-5 overflow-y-auto">
            {/* ── HEADER ── */}
            <div className="space-y-1.5">
              {/* Date */}
              <p className="font-fraunces text-[18px] font-normal capitalize" style={{ color: "#3C2A4D" }}>
                {dateDisplay}
              </p>

              {/* Intent */}
              <p className="text-[12px]" style={{ color: "#B0A0B5", fontWeight: 400 }}>
                {intentLabel}
                {activityName && ` · ${activityName}`}
              </p>

              {/* Description */}
              {description && (
                <p className="text-[14px] leading-[1.5] pt-1" style={{ color: "#3C2A4D", fontWeight: 400 }}>
                  {description}
                </p>
              )}

              {/* Owner name (if viewing someone else's) */}
              {!isOwner && (
                <p className="text-[12px] pt-0.5" style={{ color: "#7A6A85" }}>
                  {ownerName}
                </p>
              )}
            </div>

            {/* ── ACTIVITY GROUP: date chips ── */}
            {entry.entry_type === "activity" && activityEntries.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {activityEntries.map(ae => {
                  const d = new Date(ae.date + "T00:00:00");
                  const label = format(d, "EEE d/M", { locale: sv }).replace(".", "");
                  return (
                    <span
                      key={ae.id}
                      className="inline-flex items-center gap-1 text-[11px]"
                      style={{ backgroundColor: "#EDE8F4", borderRadius: 6, padding: "4px 10px", color: "#3C2A4D" }}
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
                {isOwner && onAddActivityDate && (
                  <button
                    onClick={() => { onOpenChange(false); onAddActivityDate(activityGroupName); }}
                    className="inline-flex items-center gap-1 text-[11px]"
                    style={{ backgroundColor: "#EDE8F4", borderRadius: 6, padding: "4px 10px", color: "#7A6A85" }}
                  >
                    <Plus className="w-3 h-3" /> Lägg till
                  </button>
                )}
              </div>
            )}

            {/* ── ACTIONS (non-owner) ── */}
            {!isOwner && (
              <div className="space-y-2.5">
                {/* Primary CTA */}
                <button
                  onClick={() => handleRSVP("yes")}
                  disabled={isSelfTagged}
                  className="w-full py-2.5 text-[14px] font-medium text-white disabled:opacity-60 transition-colors"
                  style={{ backgroundColor: "#3C2A4D", borderRadius: 99 }}
                >
                  {isSelfTagged ? "Du är med! 💛" : "Jag kan"}
                </button>

                {/* Secondary actions row */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRSVP("maybe")}
                    className="flex-1 py-2 text-[13px] font-medium transition-colors"
                    style={{ color: "#7A6A85", backgroundColor: "#FFFFFF", border: "1px solid #EDE8F4", borderRadius: 99 }}
                  >
                    Kanske
                  </button>
                  <button
                    onClick={() => setShowCommentInput(true)}
                    className="flex-1 py-2 text-[13px] font-medium transition-colors"
                    style={{ color: "#7A6A85", backgroundColor: "#FFFFFF", border: "1px solid #EDE8F4", borderRadius: 99 }}
                  >
                    Skriv något
                  </button>
                </div>
              </div>
            )}

            {/* ── COMMENT INPUT (inline) ── */}
            {(showCommentInput || isOwner || comments.length > 0) && (
              <div className="space-y-2">
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
                          <span className="text-[11px] font-medium" style={{ color: "#3C2A4D" }}>
                            {c.user_id === user?.id ? "Du" : (c.profile?.display_name || "Någon")}
                          </span>
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
                    placeholder={`Skriv något till ${isOwner ? "alla" : ownerName}...`}
                    className="h-9 text-[13px] flex-1 bg-white border-border/30 rounded-full px-4"
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleAddComment()}
                    autoFocus={showCommentInput}
                  />
                  <button
                    disabled={sending || !commentText.trim()}
                    onClick={handleAddComment}
                    className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
                    style={{ backgroundColor: "#3C2A4D" }}
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            )}

            {/* ── RESPONSES ── */}
            {totalResponses > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: "#B0A0B5" }}>
                  Svar
                </p>
                {taggedFriends.map(tf => (
                  <div key={tf.id} className="flex items-center gap-2 py-0.5">
                    <Avatar className="w-5 h-5">
                      <AvatarFallback style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }} className="text-[8px] font-medium">
                        {tf.profile?.display_name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[12px] flex-1" style={{ color: "#7A6A85" }}>
                      {tf.profile?.display_name || "Okänd"} kan
                    </span>
                    {isOwner && (
                      <button onClick={async () => {
                        await supabase.from("hangout_tagged_friends").delete().eq("id", tf.id);
                        setTaggedFriends(prev => prev.filter(t => t.id !== tf.id));
                      }} className="text-muted-foreground/30 hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── CREATE GROUP SUGGESTION ── */}
            {canCreateGroup && (
              <div className="space-y-2 pt-1">
                <p className="text-[12px] text-center" style={{ color: "#7A6A85" }}>
                  Ni verkar bli några – vill ni ta det vidare?
                </p>
                <button
                  onClick={handleCreateGroup}
                  disabled={creatingGroup}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium transition-colors disabled:opacity-60"
                  style={{ color: "#3C2A4D", backgroundColor: "#FFFFFF", border: "1px solid #EDE8F4", borderRadius: 99 }}
                >
                  <Users className="w-3.5 h-3.5" />
                  Starta sällskap att chatta i
                </button>
              </div>
            )}

            {/* ── OWNER ACTIONS ── */}
            {isOwner && (
              <div className="pt-2">
                <button
                  onClick={() => entry.entry_type === "activity" && activityEntries.length > 1 ? setDeleteAllConfirm(true) : setDeleteConfirm(true)}
                  className="text-[12px] mx-auto block"
                  style={{ color: "#B0A0B5" }}
                >
                  Ta bort
                </button>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <ConfirmSheet
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="Ta bort datum"
        description="Vill du ta bort detta datum?"
        confirmLabel="Ta bort"
        confirmStyle={{ backgroundColor: "#A32D2D" }}
        onConfirm={handleDelete}
      />

      <ConfirmSheet
        open={deleteAllConfirm}
        onOpenChange={setDeleteAllConfirm}
        title="Ta bort aktivitet"
        description={`Vill du ta bort ${activityGroupName} och alla datum?`}
        confirmLabel="Ta bort alla"
        confirmStyle={{ backgroundColor: "#A32D2D" }}
        onConfirm={handleDeleteAllActivityDates}
      />
    </>
  );
};

export default HangoutDetailSheet;
