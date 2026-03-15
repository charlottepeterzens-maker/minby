import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, Sparkles, CalendarIcon, X, Pencil, TreePine, UtensilsCrossed, Sofa, ShoppingBag, Dumbbell, Coffee, Film, Gamepad2 } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { sv } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, type TranslationKey } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ConfirmSheet from "@/components/ConfirmSheet";

interface ShareNewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ShareType = "life_update" | "meeting" | "free_dates";

interface Group { id: string; name: string; emoji: string; }
interface Section { id: string; name: string; emoji: string; section_type: string; }
interface AvailabilityEntry { id: string; date: string; activities: string[]; custom_note: string | null; }

const ACTIVITY_OPTIONS: { key: TranslationKey; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "activityNature", icon: TreePine },
  { key: "activityFoodOut", icon: UtensilsCrossed },
  { key: "activityRelax", icon: Sofa },
  { key: "activityShopping", icon: ShoppingBag },
  { key: "activitySports", icon: Dumbbell },
  { key: "activityCoffee", icon: Coffee },
  { key: "activityMovies", icon: Film },
  { key: "activityGames", icon: Gamepad2 },
];

const ShareNewSheet = ({ open, onOpenChange }: ShareNewSheetProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [shareType, setShareType] = useState<ShareType | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);

  // Free dates state
  const [availEntries, setAvailEntries] = useState<AvailabilityEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);

  const vibes = [
    { value: "chill", label: t("vibeChill") },
    { value: "adventure", label: t("vibeAdventure") },
    { value: "creative", label: t("vibeCreative") },
    { value: "selfcare", label: t("vibeSelfcare") },
  ];

  // Life update fields
  const [selectedSection, setSelectedSection] = useState("");
  const [content, setContent] = useState("");

  // Meeting fields
  const [selectedGroup, setSelectedGroup] = useState("");
  const [title, setTitle] = useState("");
  const [dateText, setDateText] = useState("");
  const [location, setLocation] = useState("");
  const [selectedVibe, setSelectedVibe] = useState("chill");
  const [selectedEmoji, setSelectedEmoji] = useState("—");

  const fetchData = useCallback(async () => {
    if (!user) return;

    const [{ data: memberships }, { data: sectionsData }] = await Promise.all([
      supabase.from("group_memberships").select("group_id").eq("user_id", user.id),
      supabase.from("life_sections").select("id, name, emoji, section_type").eq("user_id", user.id).order("sort_order"),
    ]);

    if (sectionsData) setSections(sectionsData);

    if (memberships?.length) {
      const { data: groupsData } = await supabase
        .from("friend_groups")
        .select("id, name, emoji")
        .in("id", memberships.map((m) => m.group_id));
      if (groupsData) setGroups(groupsData);
    }
  }, [user]);

  const fetchAvailability = useCallback(async () => {
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const { data } = await supabase
      .from("hangout_availability")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", today)
      .order("date", { ascending: true });
    if (data) setAvailEntries(data as AvailabilityEntry[]);
  }, [user]);

  useEffect(() => {
    if (open) {
      fetchData();
      setShareType(null);
    }
  }, [open, fetchData]);

  useEffect(() => {
    if (open && shareType === "free_dates") {
      fetchAvailability();
    }
  }, [open, shareType, fetchAvailability]);

  const resetForm = () => {
    setShareType(null);
    setSelectedSection("");
    setContent("");
    setSelectedGroup("");
    setTitle("");
    setDateText("");
    setLocation("");
    setSelectedVibe("chill");
    setSelectedEmoji("—");
    resetFreeDateForm();
  };

  const resetFreeDateForm = () => {
    setSelectedDate(undefined);
    setSelectedActivities([]);
    setCustomNote("");
    setEditingEntryId(null);
  };

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    );
  };

  const handleSaveAvailability = async () => {
    if (!selectedDate || !user) return;
    setLoading(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const { error } = await supabase.from("hangout_availability").upsert(
      {
        user_id: user.id,
        date: dateStr,
        activities: selectedActivities,
        custom_note: customNote.trim() || null,
      },
      { onConflict: "user_id,date" }
    );

    if (error) {
      toast.error(t("couldNotSaveAvailability"));
    } else {
      toast.success(t("availabilitySaved"));
      resetFreeDateForm();
      await fetchAvailability();
    }
    setLoading(false);
  };

  const handleRemoveAvailability = async (id: string) => {
    const { error } = await supabase.from("hangout_availability").delete().eq("id", id);
    if (error) {
      toast.error(t("couldNotRemoveAvailability"));
    } else {
      toast.success(t("availabilityRemoved"));
      await fetchAvailability();
    }
  };

  const handleEditEntry = (entry: AvailabilityEntry) => {
    setSelectedDate(new Date(entry.date + "T00:00:00"));
    setSelectedActivities([...entry.activities]);
    setCustomNote(entry.custom_note || "");
    setEditingEntryId(entry.id);
  };

  const handlePostLifeUpdate = async () => {
    if (!user || !selectedSection || !content) return;
    setLoading(true);
    const { error } = await supabase.from("life_posts").insert({
      user_id: user.id,
      section_id: selectedSection,
      content,
    });
    if (error) {
      toast.error(t("couldntPost"));
    } else {
      toast.success(t("updateShared"));
      resetForm();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleCreateMeeting = async () => {
    if (!user || !selectedGroup || !title || !dateText) return;
    setLoading(true);
    const { error } = await supabase.from("plans").insert({
      group_id: selectedGroup,
      created_by: user.id,
      title,
      emoji: selectedEmoji,
      date_text: dateText,
      location: location || null,
      vibe: selectedVibe,
    });
    if (error) {
      toast.error(t("couldntCreateSuggestion"));
    } else {
      toast.success(t("meetingSuggested"));
      resetForm();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const getActivityLabel = (activity: string) => {
    const opt = ACTIVITY_OPTIONS.find((o) => o.key === activity);
    return opt ? t(opt.key) : activity;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">{t("shareNew")}</SheetTitle>
        </SheetHeader>

        {!shareType ? (
          <div className="grid grid-cols-3 gap-3 py-6">
            <button
              onClick={() => setShareType("life_update")}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-muted/50 hover:bg-primary/5 transition-all"
            >
              <Sparkles className="w-7 h-7 text-primary" />
              <div className="text-center">
                <p className="font-display font-semibold text-foreground text-sm">{t("lifeUpdate")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t("shareWithCircles")}</p>
              </div>
            </button>
            <button
              onClick={() => setShareType("meeting")}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-muted/50 hover:bg-secondary/5 transition-all"
            >
              <CalendarDays className="w-7 h-7 text-secondary-foreground" />
              <div className="text-center">
                <p className="font-display font-semibold text-foreground text-sm">{t("suggestMeeting")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t("gatherFriends")}</p>
              </div>
            </button>
            <button
              onClick={() => setShareType("free_dates")}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-muted/50 hover:bg-accent/5 transition-all"
            >
              <CalendarIcon className="w-7 h-7 text-accent" />
              <div className="text-center">
                <p className="font-display font-semibold text-foreground text-sm">{t("freeDates")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t("shareWhenFree")}</p>
              </div>
            </button>
          </div>
        ) : shareType === "life_update" ? (
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">{t("section")}</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder={t("chooseSection")} />
                </SelectTrigger>
                <SelectContent>
                  {sections.filter(s => s.section_type === "posts").map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">{t("whatsNew")}</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("shareUpdatePlaceholder")}
                className="mt-1.5 rounded-xl bg-muted/50 min-h-[100px]"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShareType(null)} className="rounded-xl flex-1">{t("back")}</Button>
              <Button onClick={handlePostLifeUpdate} disabled={!selectedSection || !content || loading} className="rounded-xl flex-1">
                {t("share")}
              </Button>
            </div>
          </div>
        ) : shareType === "free_dates" ? (
          <div className="space-y-4 py-4">
            {/* Add / Edit form */}
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal rounded-xl",
                      !selectedDate && "text-muted-foreground"
                    )}
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
                  {ACTIVITY_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => toggleActivity(opt.key)}
                        className={cn(
                          "px-2.5 py-1 text-xs rounded-full transition-all inline-flex items-center gap-1.5",
                          selectedActivities.includes(opt.key)
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="w-3 h-3" /> {t(opt.key)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Input
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder={t("customNote")}
                className="text-sm rounded-xl"
                maxLength={100}
              />

              <Button
                size="sm"
                className="w-full rounded-xl"
                disabled={!selectedDate || loading}
                onClick={handleSaveAvailability}
              >
                {t("save")}
              </Button>
            </div>

            {/* Existing entries */}
            {availEntries.length > 0 && (
              <div className="space-y-2">
                {availEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-2 p-2.5 bg-muted/30 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(entry.date + "T00:00:00"), "EEE d MMM", { locale: sv })}
                      </p>
                      {entry.activities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.activities.map((a) => (
                            <span key={a} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                              {getActivityLabel(a)}
                            </span>
                          ))}
                        </div>
                      )}
                      {entry.custom_note && (
                        <p className="text-xs text-muted-foreground mt-1 italic">"{entry.custom_note}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEditEntry(entry)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteEntryId(entry.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2">
              <Button variant="outline" onClick={() => setShareType(null)} className="rounded-xl w-full">{t("back")}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">{t("group")}</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder={t("chooseGroup")} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">{t("whatsThePlan")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cinema night, brunch..." className="mt-1.5 rounded-xl bg-muted/50" />
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">{t("when")}</Label>
              <Input value={dateText} onChange={(e) => setDateText(e.target.value)} placeholder="Saturday, next week..." className="mt-1.5 rounded-xl bg-muted/50" />
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">{t("whereOptional")}</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="My place, the park..." className="mt-1.5 rounded-xl bg-muted/50" />
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">{t("vibe")}</Label>
              <div className="flex gap-2 flex-wrap">
                {vibes.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => setSelectedVibe(v.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedVibe === v.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShareType(null)} className="rounded-xl flex-1">{t("back")}</Button>
              <Button onClick={handleCreateMeeting} disabled={!selectedGroup || !title || !dateText || loading} className="rounded-xl flex-1">
                {t("suggest")}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
    <ConfirmSheet
      open={!!deleteEntryId}
      onOpenChange={(open) => { if (!open) setDeleteEntryId(null); }}
      title="Ta bort datum"
      description="Vill du ta bort detta datum?"
      confirmLabel="Ta bort"
      onConfirm={() => { if (deleteEntryId) handleRemoveAvailability(deleteEntryId); setDeleteEntryId(null); }}
    />
    </>
  );
};

export default ShareNewSheet;
