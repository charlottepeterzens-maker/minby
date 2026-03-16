import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import {
  Plus, MoreHorizontal, MessageCircle, UserPlus, Send, Trash2, X
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmSheet from "@/components/ConfirmSheet";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, type TranslationKey } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import AddHangoutSheet from "@/components/profile/AddHangoutSheet";

interface AvailabilityEntry {
  id: string;
  date: string;
  activities: string[];
  custom_note: string | null;
  entry_type: string;
}

interface Comment {
  id: string;
  availability_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null };
}

interface TaggedFriend {
  id: string;
  availability_id: string;
  tagged_user_id: string;
  tagged_by: string;
  profile?: { display_name: string | null; avatar_url: string | null };
}

const ACTIVITY_OPTIONS: { key: TranslationKey; label: string }[] = [
  { key: "activityNature", label: "Natur" },
  { key: "activityFoodOut", label: "Äta ute" },
  { key: "activityRelax", label: "Hänga" },
  { key: "activityShopping", label: "Shopping" },
  { key: "activitySports", label: "Sport" },
  { key: "activityCoffee", label: "Fika" },
  { key: "activityMovies", label: "Bio" },
  { key: "activityGames", label: "Spel" },
];

interface Props {
  userId: string;
  isOwner: boolean;
}

const HangoutAvailability = ({ userId, isOwner }: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [entries, setEntries] = useState<AvailabilityEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editActivities, setEditActivities] = useState<string[]>([]);
  const [editNote, setEditNote] = useState("");
  const [confirmedCounts, setConfirmedCounts] = useState<Map<string, number>>(new Map());

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const [taggedFriends, setTaggedFriends] = useState<TaggedFriend[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [friendResults, setFriendResults] = useState<{ user_id: string; display_name: string | null; avatar_url: string | null }[]>([]);
  const [showTagInput, setShowTagInput] = useState(false);

  const fetchEntries = useCallback(async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data } = await supabase
      .from("hangout_availability")
      .select("*")
      .eq("user_id", userId)
      .gte("date", today)
      .order("date", { ascending: true });
    if (data) setEntries(data as AvailabilityEntry[]);
  }, [userId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  useEffect(() => {
    if (!expandedId) return;
    const fetchDetails = async () => {
      const [commentsRes, tagsRes] = await Promise.all([
        supabase.from("hangout_comments").select("*").eq("availability_id", expandedId).order("created_at", { ascending: true }),
        supabase.from("hangout_tagged_friends").select("*").eq("availability_id", expandedId),
      ]);
      if (commentsRes.data) {
        const userIds = [...new Set(commentsRes.data.map((c: any) => c.user_id))];
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        setComments(commentsRes.data.map((c: any) => ({ ...c, profile: profileMap.get(c.user_id) })));
      }
      if (tagsRes.data) {
        const tagUserIds = [...new Set(tagsRes.data.map((t: any) => t.tagged_user_id))];
        if (tagUserIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", tagUserIds);
          const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
          setTaggedFriends(tagsRes.data.map((t: any) => ({ ...t, profile: profileMap.get(t.tagged_user_id) })));
        } else { setTaggedFriends([]); }
      }
    };
    fetchDetails();
  }, [expandedId]);

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("hangout_availability").delete().eq("id", id);
    if (error) {
      toast({ title: t("error"), description: t("couldNotRemoveAvailability"), variant: "destructive" });
    } else {
      toast({ title: t("availabilityRemoved") });
      if (expandedId === id) setExpandedId(null);
      await fetchEntries();
    }
  };

  const startEditEntry = (entry: AvailabilityEntry) => {
    setEditingEntryId(entry.id);
    setEditActivities([...entry.activities]);
    setEditNote(entry.custom_note || "");
  };

  const handleSaveEdit = async () => {
    if (!editingEntryId || !user) return;
    await supabase.from("hangout_availability").update({ activities: editActivities, custom_note: editNote.trim() || null }).eq("id", editingEntryId);
    setEditingEntryId(null);
    await fetchEntries();
    toast({ title: "Uppdaterat" });
  };

  const toggleEditActivity = (activity: string) => {
    setEditActivities((prev) => prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]);
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !user || !expandedId) return;
    setSendingComment(true);
    const { error } = await supabase.from("hangout_comments").insert({ availability_id: expandedId, user_id: user.id, content: commentText.trim() });
    if (!error) {
      setCommentText("");
      const { data } = await supabase.from("hangout_comments").select("*").eq("availability_id", expandedId).order("created_at", { ascending: true });
      if (data) {
        const userIds = [...new Set(data.map((c: any) => c.user_id))];
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        setComments(data.map((c: any) => ({ ...c, profile: profileMap.get(c.user_id) })));
      }
    }
    setSendingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from("hangout_comments").delete().eq("id", commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const searchFriends = async (query: string) => {
    setFriendSearch(query);
    if (query.length < 2) { setFriendResults([]); return; }
    const { data } = await supabase.from("profiles").select("user_id, display_name, avatar_url").ilike("display_name", `%${query}%`).limit(5);
    if (data) {
      const alreadyTagged = new Set(taggedFriends.map((t) => t.tagged_user_id));
      setFriendResults(data.filter((p: any) => !alreadyTagged.has(p.user_id) && p.user_id !== user?.id));
    }
  };

  const handleTagFriend = async (friendUserId: string) => {
    if (!user || !expandedId) return;
    const { error } = await supabase.from("hangout_tagged_friends").insert({ availability_id: expandedId, tagged_user_id: friendUserId, tagged_by: user.id });
    if (!error) {
      setFriendSearch(""); setFriendResults([]); setShowTagInput(false);
      const { data } = await supabase.from("hangout_tagged_friends").select("*").eq("availability_id", expandedId);
      if (data) {
        const tagUserIds = data.map((t: any) => t.tagged_user_id);
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", tagUserIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        setTaggedFriends(data.map((t: any) => ({ ...t, profile: profileMap.get(t.tagged_user_id) })));
      }
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    await supabase.from("hangout_tagged_friends").delete().eq("id", tagId);
    setTaggedFriends((prev) => prev.filter((t) => t.id !== tagId));
  };

  const getActivityLabel = (activity: string) => {
    const opt = ACTIVITY_OPTIONS.find((o) => o.key === activity);
    return opt ? opt.label : activity;
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => prev === id ? null : id);
    setCommentText(""); setShowTagInput(false); setFriendSearch(""); setFriendResults([]);
  };

  // Date column helper
  const DateColumn = ({ dateStr }: { dateStr: string }) => {
    const dateObj = new Date(dateStr + "T00:00:00");
    const weekday = format(dateObj, "EEE", { locale: sv }).replace(".", "");
    const day = format(dateObj, "d");
    const month = format(dateObj, "MMM", { locale: sv }).replace(".", "");
    return (
      <div className="shrink-0 flex flex-col items-center justify-center w-10">
        <span className="text-[10px] font-medium leading-none uppercase text-foreground">{weekday}</span>
        <span className="text-[22px] leading-none font-medium text-foreground mt-0.5">{day}</span>
        <span className="text-[10px] font-medium leading-none mt-0.5 uppercase" style={{ color: '#C9B8D8' }}>{month}</span>
      </div>
    );
  };

  // --- TYPE 1: Ledig ---
  const renderLedigRow = (entry: AvailabilityEntry) => (
    <button onClick={() => toggleExpand(entry.id)} className="w-full flex items-center py-3 text-left">
      <DateColumn dateStr={entry.date} />
      <div className="shrink-0 mx-3 self-stretch w-px" style={{ backgroundColor: '#EDE8F4' }} />
      <div className="flex-1 min-w-0 pr-8">
        <p className="text-[13px] leading-snug text-foreground">
          {entry.custom_note || (entry.activities.length > 0 ? entry.activities.map(a => getActivityLabel(a)).join(", ") : "Ledig")}
        </p>
      </div>
    </button>
  );

  // --- TYPE 2: Plan ---
  const renderPlanRow = (entry: AvailabilityEntry) => {
    const activityName = entry.custom_note || (entry.activities.length > 0 ? getActivityLabel(entry.activities[0]) : "Plan");
    const entryFriends = taggedFriends.filter(t => t.availability_id === entry.id);
    const friendCount = entryFriends.length;

    return (
      <button onClick={() => toggleExpand(entry.id)} className="w-full flex items-center py-3 text-left">
        <DateColumn dateStr={entry.date} />
        <div className="shrink-0 mx-3 self-stretch w-px" style={{ backgroundColor: '#EDE8F4' }} />
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-[13px] font-medium leading-snug text-foreground">{activityName}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex -space-x-1">
              {entryFriends.slice(0, 3).map((tf) => (
                <div key={tf.id} className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-medium border border-card" style={{ backgroundColor: '#EDE8F4', color: '#3C2A4D' }}>
                  {tf.profile?.display_name?.charAt(0).toUpperCase() || "?"}
                </div>
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground truncate">
              {entryFriends.length > 0 ? `Du + ${entryFriends[0]?.profile?.display_name || "?"} · kom med!` : "Kom med!"}
            </span>
          </div>
        </div>
        {friendCount > 0 && (
          <span className="shrink-0 text-[11px] font-medium" style={{ color: '#1F4A1A' }}>{friendCount} med</span>
        )}
      </button>
    );
  };

  // --- TYPE 3: Aktivitet ---
  const renderActivityRow = (entry: AvailabilityEntry) => {
    const activityName = entry.activities.length > 0 ? getActivityLabel(entry.activities[0]) : (entry.custom_note || "Aktivitet");
    const dateObj = new Date(entry.date + "T00:00:00");
    const dateChip = `${format(dateObj, "EEE", { locale: sv }).replace(".", "")} ${format(dateObj, "d/M")}`;

    return (
      <button onClick={() => toggleExpand(entry.id)} className="w-full flex items-start py-3 text-left">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <div className="shrink-0 flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: '#EDE8F4' }}>
            <span className="text-[9px] font-medium" style={{ color: '#3C2A4D' }}>{activityName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium leading-snug text-foreground">{activityName}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-[10px]" style={{ backgroundColor: '#EDE8F4', color: '#3C2A4D' }}>{dateChip}</span>
            </div>
          </div>
        </div>
        <span className="shrink-0 text-[11px] text-muted-foreground mt-0.5">
          {taggedFriends.filter(t => t.availability_id === entry.id).length} svar
        </span>
      </button>
    );
  };

  // Edit form
  const renderEditForm = (entry: AvailabilityEntry) => {
    const dateObj = new Date(entry.date + "T00:00:00");
    const dateTitle = format(dateObj, "EEEE d MMMM", { locale: sv });
    return (
      <div className="bg-muted/50 rounded-[16px] border-[0.5px] border-border p-3 space-y-3">
        <p className="text-[13px] font-medium text-foreground">{dateTitle}</p>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_OPTIONS.map((opt) => (
            <button key={opt.key} onClick={() => toggleEditActivity(opt.key)}
              className={cn("font-medium transition-all rounded-[20px] text-[13px] px-3.5 py-1.5 border-[0.5px] border-border",
                editActivities.includes(opt.key) ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
              )}>{opt.label}</button>
          ))}
        </div>
        <textarea value={editNote} onChange={(e) => setEditNote(e.target.value.slice(0, 150))} placeholder="Berätta lite mer..."
          className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" maxLength={150} rows={2} />
        <div className="flex gap-2">
          <button onClick={() => setEditingEntryId(null)} className="flex-1 py-2 text-[13px] font-medium rounded-[10px] border-[0.5px] border-border text-foreground">Avbryt</button>
          <button onClick={handleSaveEdit} className="flex-1 py-2 text-[13px] font-medium rounded-[10px] bg-primary text-primary-foreground">Spara</button>
        </div>
      </div>
    );
  };

  const renderEntryRow = (entry: AvailabilityEntry) => {
    if (editingEntryId === entry.id && isOwner) return renderEditForm(entry);
    const type = entry.entry_type;
    return (
      <div className="relative">
        {type === "confirmed" ? renderPlanRow(entry) : type === "activity" ? renderActivityRow(entry) : renderLedigRow(entry)}
        {isOwner && editingEntryId !== entry.id && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="absolute top-1/2 -translate-y-1/2 right-0 z-10 w-5 h-5 flex items-center justify-center rounded-full hover:bg-muted transition-colors" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[120px]">
              <DropdownMenuItem onClick={() => startEditEntry(entry)}>Redigera</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteConfirmId(entry.id)} className="text-destructive focus:text-destructive">Ta bort</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  const renderExpandedDetail = () => {
    if (!expandedId) return null;
    const entry = entries.find((e) => e.id === expandedId);
    if (!entry) return null;
    return (
      <motion.div key={expandedId} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden">
        <div className="bg-muted/40 rounded-md p-3 space-y-3 mb-1">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <UserPlus className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">Vänner</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {taggedFriends.map((tf) => (
                <span key={tf.id} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground inline-flex items-center gap-1">
                  {tf.profile?.display_name || "?"}
                  {(user?.id === tf.tagged_by || isOwner) && <button onClick={() => handleRemoveTag(tf.id)} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>}
                </span>
              ))}
              {user && (showTagInput ? (
                <div className="relative">
                  <Input value={friendSearch} onChange={(e) => searchFriends(e.target.value)} placeholder="Sök vänner..." className="text-xs h-6 w-36" autoFocus onBlur={() => setTimeout(() => { setShowTagInput(false); setFriendResults([]); }, 200)} />
                  {friendResults.length > 0 && (
                    <div className="absolute top-7 left-0 z-20 bg-popover border border-border rounded-md shadow-elevated w-40 py-1">
                      {friendResults.map((fr) => <button key={fr.user_id} onMouseDown={() => handleTagFriend(fr.user_id)} className="w-full text-left px-2 py-1 text-xs hover:bg-accent transition-colors truncate">{fr.display_name || "?"}</button>)}
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => setShowTagInput(true)} className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors inline-flex items-center gap-1"><Plus className="w-2.5 h-2.5" /> Lägg till</button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <MessageCircle className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">Kommentarer</span>
            </div>
            {comments.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 group">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: '#EDE8F4' }}>
                      {c.profile?.avatar_url ? <img src={c.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : <span className="text-[8px] font-bold" style={{ color: '#3C2A4D' }}>{c.profile?.display_name?.charAt(0).toUpperCase() || "?"}</span>}
                    </div>
                    <div className="flex-1 min-w-0"><p className="text-[10px]"><span className="font-semibold text-foreground">{c.profile?.display_name || "?"}</span> <span className="text-muted-foreground">{c.content}</span></p></div>
                    {user?.id === c.user_id && <button onClick={() => handleDeleteComment(c.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5"><Trash2 className="w-2.5 h-2.5" /></button>}
                  </div>
                ))}
              </div>
            )}
            {user && (
              <div className="flex gap-1.5">
                <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Skriv en kommentar..." className="text-xs h-7 flex-1" maxLength={200} onKeyDown={(e) => e.key === "Enter" && handleAddComment()} />
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" disabled={!commentText.trim() || sendingComment} onClick={handleAddComment}><Send className="w-3 h-3" /></Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="bg-card border-[0.5px] rounded-[16px] p-4" style={{ borderColor: '#EDE8F4' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base font-medium text-foreground">
          {t("hangoutAvailability")}
        </h3>
        {isOwner && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Add sheet */}
      <AddHangoutSheet open={showAdd} onOpenChange={setShowAdd} onCreated={fetchEntries} />

      {/* Flat entry list */}
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">{t("noAvailability")}</p>
      ) : (
        <div>
          {entries.map((entry, i) => (
            <div key={entry.id}>
              {i > 0 && <div className="w-full h-px" style={{ backgroundColor: '#EDE8F4' }} />}
              {renderEntryRow(entry)}
              <AnimatePresence>
                {expandedId === entry.id && renderExpandedDetail()}
              </AnimatePresence>
            </div>
          ))}
          {isOwner && (
            <>
              <div className="w-full h-px" style={{ backgroundColor: '#EDE8F4' }} />
              <button onClick={() => setShowAdd(true)} className="w-full flex items-center justify-center gap-2 py-3 text-muted-foreground hover:text-foreground transition-colors">
                <Plus className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Lägg till</span>
              </button>
            </>
          )}
        </div>
      )}

      <ConfirmSheet
        open={!!deleteConfirmId}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
        title="Ta bort datum"
        description="Vill du ta bort detta datum?"
        confirmLabel="Ta bort"
        confirmStyle={{ backgroundColor: "#A32D2D" }}
        onConfirm={() => { if (deleteConfirmId) handleRemove(deleteConfirmId); setDeleteConfirmId(null); }}
      />
    </div>
  );
};

export default HangoutAvailability;
