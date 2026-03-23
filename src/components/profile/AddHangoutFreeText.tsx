import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Send, Loader2, Pencil, Check, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { sendNotification } from "@/utils/notifications";

interface ParsedHangout {
  intent: string;
  activity: string | null;
  date: string | null;
  date_display: string | null;
  description: string;
  entry_type: "available" | "confirmed" | "activity";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const AddHangoutFreeText = ({ open, onOpenChange, onCreated }: Props) => {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedHangout | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editIntent, setEditIntent] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editActivity, setEditActivity] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && !parsed) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, parsed]);

  const reset = () => {
    setText("");
    setParsed(null);
    setParsing(false);
    setSaving(false);
    setEditing(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleParse = async () => {
    if (!text.trim() || parsing) return;
    setParsing(true);

    try {
      const { data, error } = await supabase.functions.invoke("parse-hangout", {
        body: { text: text.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setParsed(data as ParsedHangout);
    } catch (err: any) {
      console.error("Parse error:", err);
      // Fallback: use text as-is
      setParsed({
        intent: "Jag vill göra något",
        activity: null,
        date: null,
        date_display: null,
        description: text.trim().slice(0, 100),
        entry_type: "available",
      });
    } finally {
      setParsing(false);
    }
  };

  const startEditing = () => {
    if (!parsed) return;
    setEditIntent(parsed.intent);
    setEditDescription(parsed.description);
    setEditDate(parsed.date_display || "");
    setEditActivity(parsed.activity || "");
    setEditing(true);
  };

  const applyEdits = () => {
    if (!parsed) return;
    setParsed({
      ...parsed,
      intent: editIntent.trim() || parsed.intent,
      description: editDescription.trim() || parsed.description,
      date_display: editDate.trim() || null,
      activity: editActivity.trim() || null,
    });
    setEditing(false);
  };

  const handleSave = async () => {
    if (!user || !parsed || saving) return;
    setSaving(true);

    try {
      const dateStr = parsed.date || format(new Date(), "yyyy-MM-dd");

      const { error } = await supabase.from("hangout_availability").insert({
        user_id: user.id,
        date: dateStr,
        activities: parsed.activity ? [parsed.activity] : [],
        custom_note: parsed.description,
        entry_type: parsed.entry_type,
        visibility: "all",
      });

      if (error) throw error;

      // Notify friends
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

          const friendIds = allFriends.map((f) => f.friend_user_id);
          const { data: friendProfiles } = await supabase
            .from("profiles")
            .select("user_id, muted_users")
            .in("user_id", friendIds);

          const mutedByFriend = new Set<string>();
          if (friendProfiles) {
            for (const fp of friendProfiles) {
              const muted = (fp.muted_users as string[]) || [];
              if (muted.includes(user.id)) mutedByFriend.add(fp.user_id);
            }
          }

          await Promise.all(
            allFriends
              .filter((f) => !mutedByFriend.has(f.friend_user_id))
              .map((f) =>
                sendNotification({
                  recipientUserId: f.friend_user_id,
                  fromUserId: user.id,
                  type: "hangout_new",
                  referenceId: user.id,
                  message: `${name} vill ses – ${parsed.description.slice(0, 50)}`,
                })
              )
          );
        }
      } catch {
        // Best effort
      }

      toast({ title: "Delat med din krets ✨" });
      handleOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast({ title: "Fel", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[20px] px-5 pb-8 pt-3 max-h-[85vh] overflow-y-auto border-0"
        style={{ backgroundColor: "#F7F3EF" }}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "#C9B8D8" }} />
        </div>
        <SheetTitle className="sr-only">Vad känner du för?</SheetTitle>

        {!parsed ? (
          /* === INPUT PHASE === */
          <div className="space-y-4">
            <h3
              className="text-[15px] font-medium text-center"
              style={{ color: "#3C2A4D" }}
            >
              Vad känner du för?
            </h3>

            <div className="relative">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 200))}
                placeholder="Skriv fritt... t.ex. 'Jag är ledig på fredag och vill fika med någon' eller 'Sugen på spa i helgen'"
                className="w-full text-[14px] rounded-[12px] bg-white px-4 py-3.5 placeholder:text-[#B0A0B5] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9B8D8] resize-none"
                style={{ border: "1px solid #EDE8F4", color: "#3C2A4D", lineHeight: 1.5 }}
                rows={3}
                maxLength={200}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleParse();
                  }
                }}
              />
              <span
                className="absolute bottom-2 left-4 text-[10px]"
                style={{ color: "#B0A0B5" }}
              >
                {text.length}/200
              </span>
            </div>

            <button
              onClick={handleParse}
              disabled={!text.trim() || parsing}
              className="w-full flex items-center justify-center gap-2 py-3 text-[14px] font-medium text-white disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: "#3C2A4D", borderRadius: 12 }}
            >
              {parsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Tolkar...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Dela med kretsen
                </>
              )}
            </button>
          </div>
        ) : editing ? (
          /* === EDIT PHASE === */
          <div className="space-y-3">
            <h3 className="text-[14px] font-medium" style={{ color: "#3C2A4D" }}>
              Redigera
            </h3>

            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: "#7A6A85" }}>
                Känsla
              </label>
              <input
                value={editIntent}
                onChange={(e) => setEditIntent(e.target.value)}
                className="w-full px-3 py-2.5 text-[13px] rounded-[10px] bg-white focus-visible:outline-none"
                style={{ border: "1px solid #EDE8F4", color: "#3C2A4D" }}
                maxLength={40}
              />
            </div>

            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: "#7A6A85" }}>
                Beskrivning
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2.5 text-[13px] rounded-[10px] bg-white focus-visible:outline-none resize-none"
                style={{ border: "1px solid #EDE8F4", color: "#3C2A4D" }}
                rows={2}
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: "#7A6A85" }}>
                Tid (valfritt)
              </label>
              <input
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                placeholder="t.ex. fredag, i helgen"
                className="w-full px-3 py-2.5 text-[13px] rounded-[10px] bg-white focus-visible:outline-none"
                style={{ border: "1px solid #EDE8F4", color: "#3C2A4D" }}
              />
            </div>

            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: "#7A6A85" }}>
                Aktivitet (valfritt)
              </label>
              <input
                value={editActivity}
                onChange={(e) => setEditActivity(e.target.value)}
                placeholder="t.ex. fika, spa"
                className="w-full px-3 py-2.5 text-[13px] rounded-[10px] bg-white focus-visible:outline-none"
                style={{ border: "1px solid #EDE8F4", color: "#3C2A4D" }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={applyEdits}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium text-white"
                style={{ backgroundColor: "#3C2A4D", borderRadius: 10 }}
              >
                <Check className="w-3.5 h-3.5" />
                Spara
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium"
                style={{ color: "#7A6A85", borderRadius: 10, border: "1px solid #EDE8F4" }}
              >
                <X className="w-3.5 h-3.5" />
                Avbryt
              </button>
            </div>
          </div>
        ) : (
          /* === PREVIEW PHASE === */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-medium" style={{ color: "#3C2A4D" }}>
                Så här blir det
              </h3>
              <button
                onClick={startEditing}
                className="flex items-center gap-1 text-[12px] font-medium"
                style={{ color: "#7A6A85" }}
              >
                <Pencil className="w-3 h-3" />
                Redigera
              </button>
            </div>

            {/* Preview card */}
            <div
              className="rounded-[8px] p-4"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #EDE8F4",
              }}
            >
              {parsed.date_display && (
                <p
                  className="text-[12px] mb-1"
                  style={{ color: "#7A6A85", fontFamily: "Lexend, sans-serif", fontWeight: 400 }}
                >
                  {parsed.date_display}
                </p>
              )}
              <p
                className="text-[11px] mb-1.5"
                style={{ color: "#B0A0B5" }}
              >
                {parsed.intent}
                {parsed.activity && ` · ${parsed.activity}`}
              </p>
              <p
                className="text-[14px] leading-[1.45]"
                style={{
                  color: "#3C2A4D",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {parsed.description}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 text-[14px] font-medium text-white disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: "#3C2A4D", borderRadius: 12 }}
              >
                {saving ? "Sparar..." : "Dela med kretsen"}
              </button>
            </div>

            <button
              onClick={() => { setParsed(null); setText(""); }}
              className="w-full text-center text-[12px] font-medium py-1"
              style={{ color: "#7A6A85" }}
            >
              ← Börja om
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AddHangoutFreeText;
