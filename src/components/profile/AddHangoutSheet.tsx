import { useState } from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { sv } from "date-fns/locale";
import { CalendarIcon, X, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { sendNotification } from "@/utils/notifications";
import { format as fmtDate } from "date-fns";

type EntryType = "available" | "confirmed" | "activity";
type Visibility = "all" | "selected" | "private";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const TYPE_OPTIONS: { value: EntryType; title: string; desc: string; hint: string }[] = [
  { value: "available", title: "Jag är ledig", desc: "Välj datum, berätta vad du vill göra", hint: "Berätta när du kan ses – din krets ser det och kan föreslå något." },
  { value: "confirmed", title: "Häng med", desc: "Du och någon ska göra något – bjud in fler", hint: "Du har redan bestämt något – bjud in fler att hänga med." },
  { value: "activity", title: "Jag är sugen på", desc: "Välj aktivitet, föreslå flera möjliga datum", hint: "Föreslå en aktivitet och se vem som är sugen." },
];

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "all", label: "Hela din krets" },
  { value: "selected", label: "Utvalda" },
  { value: "private", label: "Bara oss" },
];

const formatDateChip = (d: Date) => {
  const weekday = format(d, "EEE", { locale: sv }).replace(".", "");
  return `${weekday} ${format(d, "d MMM", { locale: sv })}`;
};

const AddHangoutSheet = ({ open, onOpenChange, onCreated }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"type" | "form">("type");
  const [entryType, setEntryType] = useState<EntryType>("available");

  // Shared
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("all");
  const [saving, setSaving] = useState(false);

  // Plan specific
  const [planName, setPlanName] = useState("");
  const [friends, setFriends] = useState<{ user_id: string; display_name: string }[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [friendResults, setFriendResults] = useState<{ user_id: string; display_name: string | null }[]>([]);

  // Activity specific
  const [activityName, setActivityName] = useState("");
  const [activityDates, setActivityDates] = useState<Date[]>([]);

  const reset = () => {
    setStep("type");
    setEntryType("available");
    setSelectedDate(undefined);
    setNote("");
    setVisibility("all");
    setPlanName("");
    setFriends([]);
    setFriendSearch("");
    setFriendResults([]);
    setActivityName("");
    setActivityDates([]);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const selectType = (type: EntryType) => {
    setEntryType(type);
    setStep("form");
  };

  const searchFriends = async (query: string) => {
    setFriendSearch(query);
    if (query.length < 2) { setFriendResults([]); return; }
    const { data } = await supabase.from("profiles").select("user_id, display_name").ilike("display_name", `%${query}%`).limit(5);
    if (data) {
      const added = new Set(friends.map(f => f.user_id));
      setFriendResults(data.filter((p: any) => !added.has(p.user_id) && p.user_id !== user?.id));
    }
  };

  const addFriend = (f: { user_id: string; display_name: string | null }) => {
    setFriends(prev => [...prev, { user_id: f.user_id, display_name: f.display_name || "?" }]);
    setFriendSearch("");
    setFriendResults([]);
  };

  const removeFriend = (userId: string) => {
    setFriends(prev => prev.filter(f => f.user_id !== userId));
  };

  const addActivityDate = (date: Date | undefined) => {
    if (!date || activityDates.length >= 5) return;
    if (activityDates.some(d => format(d, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"))) return;
    setActivityDates(prev => [...prev, date].sort((a, b) => a.getTime() - b.getTime()));
  };

  const removeActivityDate = (idx: number) => {
    setActivityDates(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);

    try {
      if (entryType === "available") {
        if (!selectedDate) return;
        const { error } = await supabase.from("hangout_availability").insert({
          user_id: user.id,
          date: format(selectedDate, "yyyy-MM-dd"),
          activities: [],
          custom_note: note.trim() || null,
          entry_type: "available",
          visibility,
        });
        if (error) throw error;
      } else if (entryType === "confirmed") {
        if (!selectedDate) return;
        const { data: entry, error } = await supabase.from("hangout_availability").insert({
          user_id: user.id,
          date: format(selectedDate, "yyyy-MM-dd"),
          activities: planName.trim() ? [planName.trim()] : [],
          custom_note: planName.trim() || null,
          entry_type: "confirmed",
          visibility,
        }).select("id").single();
        if (error) throw error;
        if (entry && friends.length > 0) {
          await Promise.all(friends.map(f =>
            supabase.from("hangout_tagged_friends").insert({
              availability_id: entry.id,
              tagged_user_id: f.user_id,
              tagged_by: user.id,
            })
          ));
        }
      } else if (entryType === "activity") {
        if (activityDates.length === 0) return;
        const inserts = activityDates.map(d => ({
          user_id: user.id,
          date: format(d, "yyyy-MM-dd"),
          activities: activityName.trim() ? [activityName.trim()] : [],
          custom_note: note.trim() || null,
          entry_type: "activity",
          visibility,
        }));
        const { error } = await supabase.from("hangout_availability").insert(inserts);
        if (error) throw error;
      }

      // Trigger 4: Send hangout notification to ALL friends, respecting mute
      try {
        const { data: allFriends } = await supabase
          .from("friend_access_tiers")
          .select("friend_user_id")
          .eq("owner_id", user.id);

        if (allFriends && allFriends.length > 0) {
          const { data: myProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", user.id)
            .single();
          const name = myProfile?.display_name || "Någon";

          // Get muted_users for each friend to check if they muted us
          const friendIds = allFriends.map(f => f.friend_user_id);
          const { data: friendProfiles } = await supabase
            .from("profiles")
            .select("user_id, muted_users")
            .in("user_id", friendIds);

          const mutedByFriend = new Set<string>();
          if (friendProfiles) {
            for (const fp of friendProfiles) {
              const muted = (fp.muted_users as string[]) || [];
              if (muted.includes(user.id)) {
                mutedByFriend.add(fp.user_id);
              }
            }
          }

          await Promise.all(
            allFriends
              .filter(f => !mutedByFriend.has(f.friend_user_id))
              .map(f =>
                sendNotification({
                  recipientUserId: f.friend_user_id,
                  fromUserId: user.id,
                  type: "hangout_new",
                  referenceId: user.id,
                  message: `${name} vill ses – de är sugen på att träffas. Är du med?`,
                })
              )
          );
        }
      } catch {
        // Best effort
      }

      toast({ title: "Sparat" });
      handleOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast({ title: "Fel", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = () => {
    if (entryType === "available") return !!selectedDate;
    if (entryType === "confirmed") return !!selectedDate;
    if (entryType === "activity") return activityDates.length > 0;
    return false;
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[20px] px-5 pb-8 pt-3 max-h-[85vh] overflow-y-auto border-0"
        style={{ backgroundColor: '#F7F3EF' }}
      >
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#C9B8D8' }} />
        </div>
        <SheetTitle className="sr-only">Lägg till</SheetTitle>

        {step === "type" ? (
          <div className="space-y-3">
            <h3 className="text-[15px] font-medium text-center mb-4" style={{ color: '#3C2A4D' }}>
              Vad vill du dela?
            </h3>
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => selectType(opt.value)}
                className="w-full text-left p-4 rounded-lg bg-white transition-all"
                style={{
                  boxShadow: '0 1px 4px 0 rgba(0,0,0,0.05)',
                }}
              >
                <p className="text-[14px] font-medium" style={{ color: '#3C2A4D' }}>{opt.title}</p>
                <p className="text-[12px] mt-0.5" style={{ color: '#655675' }}>{opt.desc}</p>
                <p className="text-[11px] mt-1" style={{ color: '#655675', opacity: 0.8 }}>{opt.hint}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Selected type indicator */}
            <div
              className="w-full text-left p-3 rounded-lg bg-white"
              style={{ boxShadow: '0 0 0 2px #3C2A4D' }}
            >
              <p className="text-[14px] font-medium" style={{ color: '#3C2A4D' }}>
                {TYPE_OPTIONS.find(o => o.value === entryType)?.title}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: '#655675' }}>
                {TYPE_OPTIONS.find(o => o.value === entryType)?.desc}
              </p>
            </div>

            {/* === LEDIG FLOW === */}
            {entryType === "available" && (
              <>
                {/* Date picker */}
                <div>
                  <label className="text-[12px] font-medium mb-1.5 block" style={{ color: '#655675' }}>Datum</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-white border-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.06)]", !selectedDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? formatDateChip(selectedDate) : "Välj datum"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={(date) => isBefore(date, startOfDay(new Date()))} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
                {/* Note */}
                <div>
                  <label className="text-[12px] font-medium mb-1.5 block" style={{ color: '#655675' }}>Fritext</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 150))}
                    placeholder="Berätta lite mer..."
                    className="w-full text-[13px] rounded-lg bg-white px-3 py-2.5 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    style={{ border: '1px solid #EDE8F4' }}
                    maxLength={150}
                    rows={2}
                  />
                </div>
              </>
            )}

            {/* === PLAN FLOW === */}
            {entryType === "confirmed" && (
              <>
                <div>
                  <label className="text-[12px] font-medium mb-1.5 block" style={{ color: '#655675' }}>Datum</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-white", !selectedDate && "text-muted-foreground")} style={{ borderColor: '#EDE8F4' }}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? formatDateChip(selectedDate) : "Välj datum"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={(date) => isBefore(date, startOfDay(new Date()))} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-[12px] font-medium mb-1.5 block" style={{ color: '#655675' }}>Aktivitet</label>
                  <Input
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Vad ska ni göra?"
                    className="bg-white text-[13px]"
                    style={{ borderColor: '#EDE8F4' }}
                    maxLength={100}
                  />
                </div>
                {/* Friends already in */}
                <div>
                  <label className="text-[12px] font-medium mb-1.5 block" style={{ color: '#655675' }}>Redan med</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {friends.map((f) => (
                      <span
                        key={f.user_id}
                        className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-full bg-white"
                        style={{ border: '1px solid #EDE8F4', color: '#3C2A4D' }}
                      >
                        {f.display_name}
                        <button onClick={() => removeFriend(f.user_id)} className="hover:opacity-70">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <Input
                      value={friendSearch}
                      onChange={(e) => searchFriends(e.target.value)}
                      placeholder="Sök och lägg till personer..."
                      className="bg-white text-[13px]"
                      style={{ borderColor: '#EDE8F4' }}
                    />
                    {friendResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 bg-white rounded-lg shadow-lg mt-1 py-1" style={{ border: '1px solid #EDE8F4' }}>
                        {friendResults.map((fr) => (
                          <button
                            key={fr.user_id}
                            onClick={() => addFriend(fr)}
                            className="w-full text-left px-3 py-2 text-[13px] hover:bg-muted/50 transition-colors"
                            style={{ color: '#3C2A4D' }}
                          >
                            {fr.display_name || "?"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* === ACTIVITY FLOW === */}
            {entryType === "activity" && (
              <>
                <div>
                  <label className="text-[12px] font-medium mb-1.5 block" style={{ color: '#655675' }}>Aktivitet</label>
                  <Input
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                    placeholder="Vad vill du göra?"
                    className="bg-white text-[13px]"
                    style={{ borderColor: '#EDE8F4' }}
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium mb-1.5 block" style={{ color: '#655675' }}>Fritext</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 150))}
                    placeholder="Berätta lite mer..."
                    className="w-full text-[13px] rounded-lg bg-white px-3 py-2.5 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    style={{ border: '1px solid #EDE8F4' }}
                    maxLength={150}
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium mb-1.5 block" style={{ color: '#655675' }}>
                    Datum ({activityDates.length}/5)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {activityDates.map((d, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-lg bg-white"
                        style={{ border: '1px solid #EDE8F4', color: '#3C2A4D' }}
                      >
                        {formatDateChip(d)}
                        <button onClick={() => removeActivityDate(i)} className="hover:opacity-70">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  {activityDates.length < 5 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-white text-[12px]" style={{ borderColor: '#EDE8F4' }}>
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          Lägg till datum
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={undefined}
                          onSelect={(d) => { if (d) addActivityDate(d); }}
                          disabled={(date) => isBefore(date, startOfDay(new Date()))}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </>
            )}

            {/* Visibility */}
            <div>
              <label className="text-[12px] font-medium mb-1.5 block" style={{ color: '#655675' }}>Synlighet</label>
              <div className="flex gap-1.5">
                {VISIBILITY_OPTIONS.map((opt) => {
                  // For plan type, show different label for private
                  const label = entryType === "confirmed" && opt.value === "private"
                    ? "Bara oss som är med"
                    : opt.label;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setVisibility(opt.value)}
                      className={cn(
                        "flex-1 py-2 text-[11px] font-medium rounded-lg transition-all",
                        visibility === opt.value
                          ? "text-white"
                          : "bg-white text-foreground"
                      )}
                      style={{
                        border: visibility === opt.value ? 'none' : '1px solid #EDE8F4',
                        backgroundColor: visibility === opt.value ? '#3C2A4D' : undefined,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit() || saving}
              className="w-full py-3 text-[14px] font-medium rounded-lg text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: '#3C2A4D' }}
            >
              {saving ? "Sparar..." : "Dela"}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AddHangoutSheet;
