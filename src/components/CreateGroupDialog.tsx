import { useState, useEffect, type ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger } from
"@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { sendNotification } from "@/utils/notifications";

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
{ emoji: "💬", label: "Övrigt" }];


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
      const { data: requests } = await supabase.
      from("friend_requests").
      select("from_user_id, to_user_id").
      eq("status", "accepted").
      or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

      if (!requests?.length) return;

      const friendIds = requests.map((r) =>
      r.from_user_id === user.id ? r.to_user_id : r.from_user_id
      );

      const { data: profiles } = await supabase.
      from("profiles").
      select("user_id, display_name").
      in("user_id", friendIds);

      setFriends(
        (profiles || []).map((p) => ({
          user_id: p.user_id,
          display_name: p.display_name || "Anonym",
          initial: (p.display_name || "A").charAt(0).toUpperCase()
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

    const { data: group, error } = await supabase.
    from("friend_groups").
    insert({ name, emoji: selectedEmoji, owner_id: user.id }).
    select("id").
    single();

    if (error || !group) {
      toast.error("Kunde inte skapa gruppen");
      setLoading(false);
      return;
    }

    // Owner membership is auto-created by the handle_new_group trigger

    if (selectedFriends.length > 0) {
      await supabase.from("group_memberships").insert(
        selectedFriends.map((fId) => ({
          group_id: group.id,
          user_id: fId,
          role: "member"
        }))
      );
      // Send group_invite notifications
      if (selectedFriends.length > 0) {
        const { data: myProfile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
        const myName = myProfile?.display_name || "Någon";
        await Promise.all(selectedFriends.map(fId =>
          sendNotification({
            recipientUserId: fId,
            fromUserId: user.id,
            type: "group_invite",
            referenceId: group.id,
            message: `${myName} bjöd in dig till gruppen ${name}`,
          })
        ));
      }
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
    <Drawer open={open} onOpenChange={(v) => {setOpen(v);if (!v) resetState();}}>
      <DrawerTrigger asChild>
        {trigger ||
        <Button variant="ghost" size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> Ny grupp
          </Button>
        }
      </DrawerTrigger>
      <DrawerContent
        className="mx-auto max-w-lg border-0"
        style={{ backgroundColor: "hsl(var(--color-surface))", borderRadius: "20px 20px 0 0" }}>
        
        <DrawerHeader className="pb-0">
          <DrawerTitle className="font-display text-xl text-center" style={{ color: "hsl(var(--color-text-primary))" }}>
            {step === 1 ? "Skapa grupp" : "Bjud in vänner"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-5 pb-6">
          {step === 1 ?
          <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="gname" className="text-sm" style={{ color: "hsl(var(--color-text-secondary))" }}>
                  Gruppnamn
                </Label>
                <Input
                id="gname"
                placeholder="T.ex. Resegänget"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 border-border/50"
                style={{ backgroundColor: "hsl(var(--color-surface-card))" }} />
              
              </div>

              <div>
                <Label className="text-sm" style={{ color: "hsl(var(--color-text-secondary))" }}>Välj syfte</Label>
                <div className="flex gap-2 mt-2">
                  {emojiPresets.map((preset) =>
                <button
                  key={preset.emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(preset.emoji)}
                  className="flex flex-col items-center gap-1 rounded-lg p-2 transition-colors"
                  style={{
                    backgroundColor:
                    selectedEmoji === preset.emoji ? "#E8D5DA" : "#FFFFFF",
                    border:
                    selectedEmoji === preset.emoji ?
                    "1px solid #C9B8D8" :
                    "1px solid transparent"
                  }}>
                  
                      
                      <span className="text-[10px]" style={{ color: "hsl(var(--color-text-secondary))" }}>
                        {preset.label}
                      </span>
                    </button>
                )}
                </div>
              </div>

              <button
              onClick={() => setStep(2)}
              disabled={!name}
              className="w-full py-2.5 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
              style={{
                backgroundColor: "hsl(var(--color-text-primary))",
                borderRadius: 12
              }}>
              
                Nästa
              </button>
            </div> :

          <div className="space-y-4 pt-4">
              {friends.length === 0 ?
            <p className="text-[13px] text-center py-6" style={{ color: "hsl(var(--color-text-secondary))" }}>
                  Du har inga vänner att bjuda in ännu.
                </p> :

            <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {friends.map((f) => {
                const selected = selectedFriends.includes(f.user_id);
                return (
                  <button
                    key={f.user_id}
                    type="button"
                    onClick={() => toggleFriend(f.user_id)}
                    className="w-full flex items-center gap-3 rounded-xl p-2.5 text-left transition-colors"
                    style={{
                      backgroundColor: selected ? "#EAF2E8" : "#FFFFFF",
                      border: `1px solid ${selected ? "#B5CCBF" : "#EDE8F4"}`
                    }}>
                    
                        <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium"
                      style={{ backgroundColor: "hsl(var(--color-border-lavender))", color: "hsl(var(--color-text-primary))" }}>
                      
                          {f.initial}
                        </div>
                        <span className="flex-1 text-[13px] font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
                          {f.display_name}
                        </span>
                        {selected &&
                    <Check className="w-4 h-4" style={{ color: "hsl(var(--color-accent-sage-text))" }} />
                    }
                      </button>);

              })}
                </div>
            }

              <div className="flex gap-2">
                <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 text-sm font-medium rounded-xl"
                style={{
                  border: "1px solid #EDE8F4",
                  color: "hsl(var(--color-text-primary))",
                  backgroundColor: "hsl(var(--color-surface-card))"
                }}>
                
                  Tillbaka
                </button>
                <button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 py-2.5 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
                style={{
                  backgroundColor: "hsl(var(--color-text-primary))",
                  borderRadius: 12
                }}>
                
                  {selectedFriends.length > 0 ?
                `Skapa (${selectedFriends.length} valda)` :
                "Skapa utan vänner"}
                </button>
              </div>
            </div>
          }
        </div>
      </DrawerContent>
    </Drawer>);

};

export default CreateGroupDialog;