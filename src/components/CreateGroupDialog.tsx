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
  externalOpen?: boolean;
  onExternalOpenChange?: (v: boolean) => void;
  preselectedFriendIds?: string[];
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


const CreateGroupDialog = ({ onGroupCreated, trigger, externalOpen, onExternalOpenChange, preselectedFriendIds }: CreateGroupDialogProps) => {
  const { user } = useAuth();
  const isControlled = externalOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (isControlled && onExternalOpenChange) onExternalOpenChange(v);
    else setInternalOpen(v);
  };
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
      toast.error("Kunde inte starta sällskapet");
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

    toast.success("Sällskap startat!");
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
            <Plus className="w-4 h-4" /> Nytt sällskap
          </Button>
        }
      </DrawerTrigger>
      <DrawerContent
        className="mx-auto max-w-lg border-0"
        style={{ backgroundColor: "hsl(var(--color-surface))", borderRadius: "20px 20px 0 0" }}>
        
        <DrawerHeader className="pb-0">
          <DrawerTitle className="font-fraunces text-xl text-center font-normal" style={{ color: "hsl(var(--color-text-primary))" }}>
            {step === 1 ? "Starta sällskap" : "Bjud in från kretsen"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-5 pb-6">
          {step === 1 ?
          <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="gname" className="text-sm" style={{ color: "hsl(var(--color-text-secondary))" }}>
                  Namn på sällskapet
                </Label>
                <Input
                id="gname"
                placeholder="T.ex. Resegänget"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 border-0"
                style={{ backgroundColor: "hsl(var(--color-surface-card))" }} />
              </div>

              <button
              onClick={() => setStep(2)}
              disabled={!name}
              style={{
                width: "100%",
                padding: "10px 0",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                borderRadius: 8,
                cursor: name ? "pointer" : "default",
                background: name ? "#2E1F3E" : "#EDE8E0",
                color: name ? "#F0EAE2" : "#B0A8B5",
                opacity: !name ? 1 : undefined,
                transition: "all 0.2s ease",
                WebkitAppearance: "none" as any,
              }}>
                Nästa
              </button>
            </div> :

          <div className="space-y-4 pt-4">
              {friends.length === 0 ?
            <p className="text-[13px] text-center py-6" style={{ color: "hsl(var(--color-text-secondary))" }}>
                  Du har ingen i kretsen att bjuda in ännu.
                </p> :

            <div
              className="space-y-1.5 max-h-60 overflow-y-auto overscroll-contain touch-pan-y"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
                  {friends.map((f) => {
                const selected = selectedFriends.includes(f.user_id);
                return (
                  <button
                    key={f.user_id}
                    type="button"
                    onClick={() => toggleFriend(f.user_id)}
                    className="w-full flex items-center gap-3 rounded-lg p-2.5 text-left transition-colors"
                    style={{
                      backgroundColor: selected ? "#EAF2E8" : "#FFFFFF",
                      boxShadow: selected ? "0 0 0 1px #B5CCBF" : "0 1px 3px 0 rgba(0,0,0,0.05)"
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

              <div className="flex gap-2 pt-2">
                <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 text-sm font-medium rounded-lg"
                style={{
                  color: "hsl(var(--color-text-primary))",
                  backgroundColor: "hsl(var(--color-surface-card))",
                  border: "none",
                  borderRadius: 8,
                }}>
                  Tillbaka
                </button>
                <button
                onClick={handleCreate}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  fontSize: 13,
                  fontWeight: 500,
                  border: "none",
                  borderRadius: 8,
                  background: "#2E1F3E",
                  color: "#F0EAE2",
                  opacity: loading ? 0.5 : 1,
                  cursor: loading ? "default" : "pointer",
                  WebkitAppearance: "none" as any,
                }}>
                  {loading ? "Startar..." : selectedFriends.length > 0 ?
                `Starta (${selectedFriends.length} valda)` :
                "Starta utan krets"}
                </button>
              </div>
            </div>
          }
        </div>
      </DrawerContent>
    </Drawer>);

};

export default CreateGroupDialog;