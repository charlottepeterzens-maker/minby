import { useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Heart, Calendar, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { resolveAvatarUrl } from "@/utils/avatarUrl";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import ConfirmSheet from "@/components/ConfirmSheet";

interface HangoutStatus {
  entry_type: string;
  date: string;
  activities: string[];
  custom_note: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  person: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    initial: string;
    tier: string;
    hangout_status: HangoutStatus | null;
    last_activity: string | null;
  };
  onUpdate: () => void;
  mutedUsers: string[];
  onToggleMute: (userId: string) => void;
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "okänt";
  const now = new Date();
  const then = new Date(dateStr);
  const days = Math.floor((now.getTime() - then.getTime()) / 86400000);
  if (days === 0) return "idag";
  if (days === 1) return "igår";
  if (days < 30) return `${days} d sedan`;
  return "länge sedan";
}

const KretspersonSheet = ({ open, onOpenChange, person, onUpdate, mutedUsers, onToggleMute }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [removeConfirm, setRemoveConfirm] = useState(false);

  const isClose = person.tier === "close";
  const isMuted = mutedUsers.includes(person.user_id);
  const tierText = isClose ? "närmaste krets" : "din krets";

  const handleToggleClose = async () => {
    if (!user) return;
    const newTier = isClose ? "outer" : "close";
    const { error } = await supabase
      .from("friend_access_tiers")
      .update({ tier: newTier as any })
      .eq("owner_id", user.id)
      .eq("friend_user_id", person.user_id);

    if (error) {
      toast.error("Kunde inte uppdatera");
    } else {
      toast.success(isClose ? "Borttagen från närmaste krets" : "Tillagd i närmaste krets");
      onUpdate();
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    await Promise.all([
      supabase.from("friend_access_tiers").delete().eq("owner_id", user.id).eq("friend_user_id", person.user_id),
      supabase.from("friend_access_tiers").delete().eq("owner_id", person.user_id).eq("friend_user_id", user.id),
    ]);
    await supabase
      .from("friend_requests")
      .delete()
      .or(
        `and(from_user_id.eq.${user.id},to_user_id.eq.${person.user_id}),and(from_user_id.eq.${person.user_id},to_user_id.eq.${user.id})`,
      )
      .eq("status", "accepted");
    toast.success("Borttagen från din krets");
    onUpdate();
    onOpenChange(false);
  };

  const hangout = person.hangout_status;
  let hangoutText = "";
  let hangoutDate = "";
  if (hangout) {
    const dateObj = new Date(hangout.date + "T00:00:00");
    hangoutDate = format(dateObj, "EEEE d MMMM", { locale: sv });
    if (hangout.custom_note) {
      hangoutText = hangout.custom_note;
    } else if (hangout.activities.length > 0) {
      hangoutText = hangout.activities.join(", ");
    } else {
      hangoutText = hangout.entry_type === "confirmed" ? "häng med" : "ledig";
    }
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="rounded-t-[20px] max-h-[85vh] border-0" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
          <div className="px-5 pb-6 pt-3">
            {/* Handle bar */}
            <div className="flex justify-center mb-5">
              <div style={{ width: 36, height: 4, backgroundColor: "#EDE8E0", borderRadius: 99 }} />
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-[52px] h-[52px] rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}
              >
                {resolveAvatarUrl(person.avatar_url) ? (
                  <img src={resolveAvatarUrl(person.avatar_url)!} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-lg font-display font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
                    {person.initial}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-[15px] font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
                    {person.display_name}
                  </span>
                  {isClose && <Heart className="w-2.5 h-2.5" style={{ color: "#C9B8D8" }} fill="#C9B8D8" />}
                </div>
                <span className="text-[12px]" style={{ color: "hsl(var(--color-text-muted))" }}>
                  {tierText} · senast aktiv {relativeTime(person.last_activity)}
                </span>
              </div>
            </div>

            {/* Hangout section */}
            {hangout ? (
              <div
                className="mb-4 p-3 flex items-start gap-2.5"
                style={{ backgroundColor: "#EAF2E8", borderRadius: 8 }}
              >
                <Calendar className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#1F4A2E" }} />
                <div>
                  <p className="text-[13px]" style={{ color: "#1F4A2E" }}>{hangoutText}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "#4A7A5E" }}>{hangoutDate}</p>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-[13px]" style={{ color: "#B0A8B5" }}>
                  {person.display_name} har inga planer – vill du föreslå något?
                </p>
                <button
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/profile/${person.user_id}`);
                  }}
                  className="text-[13px] font-medium mt-1"
                  style={{ color: "#3C2A4D" }}
                >
                  Föreslå något →
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  onOpenChange(false);
                  // Navigate to create group with this person pre-selected
                  navigate("/friends");
                }}
                className="flex-1 py-2.5 text-[13px] font-medium text-white"
                style={{ backgroundColor: "#3C2A4D", borderRadius: 99 }}
              >
                Starta sällskap med {person.display_name.split(" ")[0]}
              </button>
              <button
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/profile/${person.user_id}`);
                }}
                className="flex-1 py-2.5 text-[13px] font-medium"
                style={{ border: "1px solid #EDE8E0", borderRadius: 99, color: "hsl(var(--color-text-primary))", backgroundColor: "transparent" }}
              >
                Föreslå en träff
              </button>
            </div>

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: "#F7F3EF", margin: "8px 0 12px" }} />

            {/* Manage relation */}
            <div className="space-y-1">
              <button
                onClick={handleToggleClose}
                className="w-full text-left py-2.5 px-1 text-[13px] flex items-center gap-2"
                style={{ color: "hsl(var(--color-text-primary))" }}
              >
                <Heart className="w-3.5 h-3.5" style={{ color: isClose ? "#C9B8D8" : "#6B5C78" }} fill={isClose ? "#C9B8D8" : "none"} />
                {isClose ? "Ta bort från närmaste krets" : "Lägg till i närmaste krets"}
              </button>
              <button
                onClick={() => onToggleMute(person.user_id)}
                className="w-full text-left py-2.5 px-1 text-[13px]"
                style={{ color: "hsl(var(--color-text-primary))" }}
              >
                {isMuted ? `Sluta muta ${person.display_name}` : `Muta ${person.display_name}`}
              </button>
              <button
                onClick={() => setRemoveConfirm(true)}
                className="w-full text-left py-2.5 px-1 text-[13px]"
                style={{ color: "#A32D2D" }}
              >
                Ta bort från kretsen
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <ConfirmSheet
        open={removeConfirm}
        onOpenChange={setRemoveConfirm}
        title="Ta bort från kretsen"
        description={`Vill du ta bort ${person.display_name} från din krets? Ni delar inte längre era vardagar.`}
        confirmLabel="Ta bort"
        confirmStyle={{ backgroundColor: "hsl(var(--color-accent-red))" }}
        onConfirm={() => {
          handleRemove();
          setRemoveConfirm(false);
        }}
      />
    </>
  );
};

export default KretspersonSheet;
