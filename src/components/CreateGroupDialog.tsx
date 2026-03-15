import { useState, useEffect, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CreateGroupDialogProps {
  onGroupCreated: () => void;
  trigger?: ReactNode;
}

interface Friend {
  user_id: string;
  display_name: string;
  initial: string;
}

const emojiPresets = [
  { emoji: "✈️", label: "Resa" },
  { emoji: "📚", label: "Bokklubb" },
  { emoji: "🎉", label: "Fest" },
  { emoji: "🏡", label: "Familj" },
  { emoji: "💬", label: "Övrigt" },
];

const CreateGroupDialog = ({ onGroupCreated, trigger }: CreateGroupDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("💬");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    const fetchFriends = async () => {
      // Get accepted friend requests in both directions
      const { data: requests } = await supabase
        .from("friend_requests")
        .select("from_user_id, to_user_id")
        .eq("status", "accepted")
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

      if (!requests?.length) return;

      const friendIds = requests.map((r) =>
        r.from_user_id === user.id ? r.to_user_id : r.from_user_id
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", friendIds);

      setFriends(
        (profiles || []).map((p) => ({
          user_id: p.user_id,
          display_name: p.display_name || "Anonym",
          initial: (p.display_name || "A").charAt(0).toUpperCase(),
        }))
      );
    };
    fetchFriends();
  }, [open, user]);

  const toggleFriend = (id: string) => {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!name || !user) return;
    setLoading(true);

    const { data: group, error } = await supabase
      .from("friend_groups")
      .insert({ name, emoji: selectedEmoji, owner_id: user.id })
      .select("id")
      .single();

    if (error || !group) {
      toast.error("Kunde inte skapa gruppen");
      setLoading(false);
      return;
    }

    // Add owner as member
    await supabase.from("group_memberships").insert({
      group_id: group.id,
      user_id: user.id,
      role: "owner",
    });

    // Add selected friends as members
    if (selectedFriends.length > 0) {
      await supabase.from("group_memberships").insert(
        selectedFriends.map((fId) => ({
          group_id: group.id,
          user_id: fId,
          role: "member",
        }))
      );
    }

    toast.success("Grupp skapad!");
    onGroupCreated();
    resetState();
    setLoading(false);
  };

  const resetState = () => {
    setName("");
    setSelectedEmoji("💬");
    setSelectedFriends([]);
    setStep(1);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> Ny grupp
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {step === 1 ? "Skapa grupp" : "Bjud in vänner"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="gname" className="text-sm text-muted-foreground">
                Gruppnamn
              </Label>
              <Input
                id="gname"
                placeholder="T.ex. Resegänget"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 bg-muted/50 border-border/50"
              />
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Välj emoji</Label>
              <div className="flex gap-2 mt-2">
                {emojiPresets.map((preset) => (
                  <button
                    key={preset.emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(preset.emoji)}
                    className="flex flex-col items-center gap-1 rounded-lg p-2 transition-colors"
                    style={{
                      backgroundColor:
                        selectedEmoji === preset.emoji ? "#E8D5DA" : "#F7F3EF",
                      border:
                        selectedEmoji === preset.emoji
                          ? "1px solid #C9B8D8"
                          : "1px solid transparent",
                    }}
                  >
                    <span className="text-lg">{preset.emoji}</span>
                    <span className="text-[10px]" style={{ color: "#7A6A85" }}>
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!name}
              className="w-full font-semibold"
            >
              Nästa
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {friends.length === 0 ? (
              <p className="text-[13px] text-center py-6" style={{ color: "#7A6A85" }}>
                Du har inga vänner att bjuda in ännu.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {friends.map((f) => {
                  const selected = selectedFriends.includes(f.user_id);
                  return (
                    <button
                      key={f.user_id}
                      type="button"
                      onClick={() => toggleFriend(f.user_id)}
                      className="w-full flex items-center gap-3 rounded-[10px] p-2.5 text-left transition-colors"
                      style={{
                        backgroundColor: selected ? "#EAF2E8" : "#FFFFFF",
                        border: `0.5px solid ${selected ? "#B5CCBF" : "#DDD5CC"}`,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium"
                        style={{ backgroundColor: "#C9B8D8", color: "#3C2A4D" }}
                      >
                        {f.initial}
                      </div>
                      <span className="flex-1 text-[13px] font-medium" style={{ color: "#3C2A4D" }}>
                        {f.display_name}
                      </span>
                      {selected && (
                        <Check className="w-4 h-4" style={{ color: "#1F4A1A" }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Tillbaka
              </Button>
              <Button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 font-semibold"
              >
                {selectedFriends.length > 0
                  ? `Skapa (${selectedFriends.length} valda)`
                  : "Skapa utan vänner"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
