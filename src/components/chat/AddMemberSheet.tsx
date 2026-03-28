import { useState, useEffect } from "react";
import { Check, UserPlus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { sendNotification } from "@/utils/notifications";

interface Friend {
  user_id: string;
  display_name: string;
  initial: string;
}

interface AddMemberSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  existingMemberIds: string[];
  onMembersAdded: () => void;
}

const AddMemberSheet = ({
  open,
  onOpenChange,
  groupId,
  groupName,
  existingMemberIds,
  onMembersAdded,
}: AddMemberSheetProps) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    const fetch = async () => {
      const { data: requests } = await supabase
        .from("friend_requests")
        .select("from_user_id, to_user_id")
        .eq("status", "accepted")
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

      if (!requests?.length) return;

      const friendIds = requests
        .map((r) => (r.from_user_id === user.id ? r.to_user_id : r.from_user_id))
        .filter((id) => !existingMemberIds.includes(id));

      if (!friendIds.length) {
        setFriends([]);
        return;
      }

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
    fetch();
    setSelected([]);
  }, [open, user, existingMemberIds]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));

  const handleAdd = async () => {
    if (!selected.length || !user) return;
    setLoading(true);

    const { error } = await supabase.from("group_memberships").insert(
      selected.map((uid) => ({ group_id: groupId, user_id: uid, role: "member" }))
    );

    if (error) {
      toast.error("Kunde inte lägga till medlemmar");
      setLoading(false);
      return;
    }

    // Notify new members
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();
    const myName = myProfile?.display_name || "Någon";

    await Promise.all(
      selected.map((uid) =>
        sendNotification({
          recipientUserId: uid,
          fromUserId: user.id,
          type: "group_invite",
          referenceId: groupId,
          message: `${myName} la till dig i ${groupName}`,
        })
      )
    );

    toast.success(`${selected.length} person${selected.length > 1 ? "er" : ""} tillagd${selected.length > 1 ? "a" : ""}!`);
    onMembersAdded();
    onOpenChange(false);
    setLoading(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[20px]"
        style={{ backgroundColor: "hsl(var(--color-surface))", padding: "24px 16px" }}
      >
        <SheetHeader>
          <SheetTitle className="font-display text-base font-medium text-left" style={{ color: "hsl(var(--color-text-primary))" }}>
            Lägg till i {groupName}
          </SheetTitle>
        </SheetHeader>

        {friends.length === 0 ? (
          <p className="text-[13px] text-center py-8" style={{ color: "hsl(var(--color-text-secondary))" }}>
            Alla dina vänner är redan med i gruppen.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto mt-3">
            {friends.map((f) => {
              const isSelected = selected.includes(f.user_id);
              return (
                <button
                  key={f.user_id}
                  type="button"
                  onClick={() => toggle(f.user_id)}
                  className="w-full flex items-center gap-3 rounded-[10px] p-2.5 text-left transition-colors"
                  style={{
                    backgroundColor: isSelected ? "#EAF2E8" : "#FFFFFF",
                    border: `1px solid ${isSelected ? "#B5CCBF" : "transparent"}`,
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium"
                    style={{ backgroundColor: "#C9B8D8", color: "hsl(var(--color-text-primary))" }}
                  >
                    {f.initial}
                  </div>
                  <span className="flex-1 text-[13px] font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
                    {f.display_name}
                  </span>
                  {isSelected && <Check className="w-4 h-4" style={{ color: "hsl(var(--color-accent-sage-text))" }} />}
                </button>
              );
            })}
          </div>
        )}

        {friends.length > 0 && (
          <button
            onClick={handleAdd}
            disabled={!selected.length || loading}
            className="w-full mt-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: "hsl(var(--color-text-primary))", borderRadius: 10 }}
          >
            {loading ? "Lägger till..." : `Lägg till (${selected.length})`}
          </button>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AddMemberSheet;
