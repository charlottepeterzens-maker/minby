import { useState, useEffect, useCallback } from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { sv } from "date-fns/locale";
import {
  CalendarIcon, Plus, X, Pencil, MoreHorizontal,
  MessageCircle, UserPlus, Send, Trash2,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmSheet from "@/components/ConfirmSheet";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, type TranslationKey } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface AvailabilityEntry {
  id: string;
  date: string;
  activities: string[];
  custom_note: string | null;
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

// No longer needed - removed CARD_COLORS

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editActivities, setEditActivities] = useState<string[]>([]);
  const [editNote, setEditNote] = useState("");

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // Tagged friends state
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

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Fetch comments and tagged friends when expanded
  useEffect(() => {
    if (!expandedId) return;
    const fetchDetails = async () => {
      const [commentsRes, tagsRes] = await Promise.all([
        supabase
          .from("hangout_comments")
          .select("*")
          .eq("availability_id", expandedId)
          .order("created_at", { ascending: true }),
        supabase
          .from("hangout_tagged_friends")
          .select("*")
          .eq("availability_id", expandedId),
      ]);

      if (commentsRes.data) {
        // Fetch profiles for comments
        const userIds = [...new Set(commentsRes.data.map((c: any) => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        setComments(
          commentsRes.data.map((c: any) => ({ ...c, profile: profileMap.get(c.user_id) }))
        );
      }

      if (tagsRes.data) {
        const tagUserIds = [...new Set(tagsRes.data.map((t: any) => t.tagged_user_id))];
        if (tagUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", tagUserIds);
          const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
          setTaggedFriends(
            tagsRes.data.map((t: any) => ({ ...t, profile: profileMap.get(t.tagged_user_id) }))
          );
        } else {
          setTaggedFriends([]);
        }
      }
    };
    fetchDetails();
  }, [expandedId]);

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    );
  };

  const handleSave = async () => {
    if (!selectedDate || !user) return;
    setSaving(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { error } = await supabase.from("hangout_availability").upsert(
      { user_id: user.id, date: dateStr, activities: selectedActivities, custom_note: customNote.trim() || null },
      { onConflict: "user_id,date" }
    );
    if (error) {
      toast({ title: t("error"), description: t("couldNotSaveAvailability"), variant: "destructive" });
    } else {
      toast({ title: t("availabilitySaved") });
      setShowAdd(false);
      setSelectedDate(undefined);
      setSelectedActivities([]);
      setCustomNote("");
      await fetchEntries();
    }
    setSaving(false);
  };

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
    await supabase.from("hangout_availability").update({
      activities: editActivities,
      custom_note: editNote.trim() || null,
    }).eq("id", editingEntryId);
    setEditingEntryId(null);
    await fetchEntries();
    toast({ title: "Uppdaterat" });
  };

  const toggleEditActivity = (activity: string) => {
    setEditActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    );
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !user || !expandedId) return;
    setSendingComment(true);
    const { error } = await supabase.from("hangout_comments").insert({
      availability_id: expandedId,
      user_id: user.id,
      content: commentText.trim(),
    });
    if (!error) {
      setCommentText("");
      // Refetch comments
      const { data } = await supabase
        .from("hangout_comments")
        .select("*")
        .eq("availability_id", expandedId)
        .order("created_at", { ascending: true });
      if (data) {
        const userIds = [...new Set(data.map((c: any) => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);
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
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .ilike("display_name", `%${query}%`)
      .limit(5);
    if (data) {
      const alreadyTagged = new Set(taggedFriends.map((t) => t.tagged_user_id));
      setFriendResults(data.filter((p: any) => !alreadyTagged.has(p.user_id) && p.user_id !== user?.id));
    }
  };

  const handleTagFriend = async (friendUserId: string) => {
    if (!user || !expandedId) return;
    const { error } = await supabase.from("hangout_tagged_friends").insert({
      availability_id: expandedId,
      tagged_user_id: friendUserId,
      tagged_by: user.id,
    });
    if (!error) {
      setFriendSearch("");
      setFriendResults([]);
      setShowTagInput(false);
      // Refetch tags
      const { data } = await supabase
        .from("hangout_tagged_friends")
        .select("*")
        .eq("availability_id", expandedId);
      if (data) {
        const tagUserIds = data.map((t: any) => t.tagged_user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", tagUserIds);
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
    setExpandedId((prev) => (prev === id ? null : id));
    setCommentText("");
    setShowTagInput(false);
    setFriendSearch("");
    setFriendResults([]);
  };

  return (
    <div className="bg-card border border-border/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          {t("hangoutAvailability")}
        </h3>
        {isOwner && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && isOwner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: sv }) : t("selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => isBefore(date, startOfDay(new Date()))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">{t("activities")}</p>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => toggleActivity(opt.key)}
                      style={{
                        borderRadius: 20,
                        fontSize: 13,
                        padding: "6px 14px",
                        border: "0.5px solid #EDE8F4",
                        backgroundColor: selectedActivities.includes(opt.key) ? "#3C2A4D" : "#FFFFFF",
                        color: selectedActivities.includes(opt.key) ? "#FFFFFF" : "#3C2A4D",
                      }}
                      className="font-medium transition-all"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value.slice(0, 150))}
                placeholder="Berätta lite mer... t.ex. var, vad du är sugen på eller annat."
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                maxLength={150}
                rows={2}
              />
              <p className="text-[10px] text-muted-foreground text-right">{customNote.length}/150</p>

              <Button
                size="sm"
                className="w-full text-white"
                style={{ backgroundColor: "#3C2A4D" }}
                disabled={!selectedDate || saving}
                onClick={handleSave}
              >
                {t("save")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entries as compact rows */}
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">{t("noAvailability")}</p>
      ) : (
        <div>
          <div className="space-y-2">
            {entries.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const dateObj = new Date(entry.date + "T00:00:00");
              const monthLabel = format(dateObj, "MMM", { locale: sv }).toUpperCase();
              const dayLabel = format(dateObj, "d");
              const dateTitle = format(dateObj, "EEEE d MMMM", { locale: sv });

              return (
                <div key={entry.id} className="relative">
                  {/* Edit inline form */}
                  {editingEntryId === entry.id && isOwner ? (
                    <div className="bg-muted/50 rounded-[16px] border-[0.5px] border-border p-3 space-y-3">
                      <p className="text-[13px] font-medium text-foreground">{dateTitle}</p>
                      <div className="flex flex-wrap gap-2">
                        {ACTIVITY_OPTIONS.map((opt) => (
                          <button
                            key={opt.key}
                            onClick={() => toggleEditActivity(opt.key)}
                            style={{
                              borderRadius: 20,
                              fontSize: 13,
                              padding: "6px 14px",
                              border: "0.5px solid #EDE8F4",
                              backgroundColor: editActivities.includes(opt.key) ? "#3C2A4D" : "#FFFFFF",
                              color: editActivities.includes(opt.key) ? "#FFFFFF" : "#3C2A4D",
                            }}
                            className="font-medium transition-all"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value.slice(0, 150))}
                        placeholder="Berätta lite mer..."
                        className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        maxLength={150}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setEditingEntryId(null)} className="flex-1 py-2 text-[13px] font-medium rounded-[10px]" style={{ border: "0.5px solid #EDE8F4", color: "#3C2A4D" }}>Avbryt</button>
                        <button onClick={handleSaveEdit} className="flex-1 py-2 text-[13px] font-medium rounded-[10px] text-white" style={{ backgroundColor: "#3C2A4D" }}>Spara</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => toggleExpand(entry.id)}
                      className={cn(
                        "w-full flex items-center gap-3 bg-card rounded-[16px] border-[0.5px] border-border p-2.5 text-left transition-all",
                        isExpanded && "ring-1 ring-primary/20"
                      )}
                    >
                      {/* Date icon */}
                      <div
                        className="shrink-0 flex flex-col items-center justify-center relative"
                        style={{ width: 38, height: 38, backgroundColor: "#3C2A4D", borderRadius: 12 }}
                      >
                        <span className="text-[9px] font-medium leading-none" style={{ color: "#C9B8D8" }}>{monthLabel}</span>
                        <span className="text-[15px] leading-none mt-0.5" style={{ color: "#F7F3EF", fontWeight: 500 }}>{dayLabel}</span>
                        {entry.date === new Date().toISOString().split("T")[0] && (
                          <span className="absolute -bottom-0.5 w-[6px] h-[6px] rounded-full" style={{ backgroundColor: "#C9B8D8" }} />
                        )}
                      </div>

                      {/* Middle */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground leading-tight truncate pr-5">{dateTitle}</p>
                        {entry.activities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entry.activities.slice(0, 3).map((a) => (
                              <span key={a} className="text-[10px] font-medium px-2 py-0.5 rounded-[20px]" style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }}>{getActivityLabel(a)}</span>
                            ))}
                            {entry.activities.length > 3 && <span className="text-[10px] text-muted-foreground">+{entry.activities.length - 3}</span>}
                          </div>
                        )}
                        {entry.custom_note && <p className="text-[11px] text-muted-foreground mt-1 truncate">{entry.custom_note}</p>}
                      </div>

                      {/* Right: Ja! button */}
                      {!isOwner && (
                        <span className="shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-[8px]" style={{ backgroundColor: "hsl(145 20% 94%)", color: "hsl(150 40% 20%)" }}>Ja!</span>
                      )}
                    </button>
                  )}

                  {/* ... menu for owner */}
                  {isOwner && editingEntryId !== entry.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="absolute top-2.5 right-2.5 z-10 w-5 h-5 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
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
            })}

            {/* Add date row */}
            {isOwner && (
              <button
                onClick={() => setShowAdd(!showAdd)}
                className="w-full flex items-center justify-center gap-2 rounded-[16px] border-[0.5px] border-dashed border-border p-3 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Lägg till</span>
              </button>
            )}
          </div>

          {/* Expanded detail */}
          <AnimatePresence>
            {expandedId && (() => {
              const entry = entries.find((e) => e.id === expandedId);
              if (!entry) return null;
              return (
                <motion.div
                  key={expandedId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden mt-3"
                >
                  <div className="bg-muted/40 rounded-md p-3 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-display text-sm font-bold text-foreground">
                          {format(new Date(entry.date + "T00:00:00"), "EEEE d MMMM", { locale: sv })}
                        </p>
                        {entry.custom_note && (
                          <p className="text-xs text-muted-foreground italic mt-0.5">"{entry.custom_note}"</p>
                        )}
                      </div>
                      {isOwner && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setSelectedDate(new Date(entry.date + "T00:00:00"));
                              setSelectedActivities([...entry.activities]);
                              setCustomNote(entry.custom_note || "");
                              setShowAdd(true);
                            }}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemove(entry.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Activities */}
                    {entry.activities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {entry.activities.map((a) => (
                          <span
                            key={a}
                            className="text-[10px] px-2 py-0.5 rounded"
                            style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }}
                          >
                            {getActivityLabel(a)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Tagged friends */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <UserPlus className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {t("friends") || "Friends"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {taggedFriends.map((tf) => (
                          <span
                            key={tf.id}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground inline-flex items-center gap-1"
                          >
                            {tf.profile?.display_name || "?"}
                            {(user?.id === tf.tagged_by || isOwner) && (
                              <button onClick={() => handleRemoveTag(tf.id)} className="hover:text-destructive">
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </span>
                        ))}
                        {user && (
                          showTagInput ? (
                            <div className="relative">
                              <Input
                                value={friendSearch}
                                onChange={(e) => searchFriends(e.target.value)}
                                placeholder={t("searchFriends") || "Search friends..."}
                                className="text-xs h-6 w-36"
                                autoFocus
                                onBlur={() => setTimeout(() => { setShowTagInput(false); setFriendResults([]); }, 200)}
                              />
                              {friendResults.length > 0 && (
                                <div className="absolute top-7 left-0 z-20 bg-popover border border-border rounded-md shadow-elevated w-40 py-1">
                                  {friendResults.map((fr) => (
                                    <button
                                      key={fr.user_id}
                                      onMouseDown={() => handleTagFriend(fr.user_id)}
                                      className="w-full text-left px-2 py-1 text-xs hover:bg-accent transition-colors truncate"
                                    >
                                      {fr.display_name || "?"}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowTagInput(true)}
                              className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors inline-flex items-center gap-1"
                            >
                              <Plus className="w-2.5 h-2.5" /> {t("addAvailability") ? "Add" : "Add"}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Comments */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <MessageCircle className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {t("comments") || "Comments"}
                        </span>
                      </div>
                      {comments.length > 0 && (
                        <div className="space-y-1.5 mb-2">
                          {comments.map((c) => (
                            <div key={c.id} className="flex items-start gap-2 group">
                              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                {c.profile?.avatar_url ? (
                                  <img src={c.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  <span className="text-[8px] font-bold text-primary">
                                    {c.profile?.display_name?.charAt(0).toUpperCase() || "?"}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px]">
                                  <span className="font-semibold text-foreground">{c.profile?.display_name || "?"}</span>{" "}
                                  <span className="text-muted-foreground">{c.content}</span>
                                </p>
                              </div>
                              {user?.id === c.user_id && (
                                <button
                                  onClick={() => handleDeleteComment(c.id)}
                                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {user && (
                        <div className="flex gap-1.5">
                          <Input
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder={t("addComment") || "Add a comment..."}
                            className="text-xs h-7 flex-1"
                            maxLength={200}
                            onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            disabled={!commentText.trim() || sendingComment}
                            onClick={handleAddComment}
                          >
                            <Send className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
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
