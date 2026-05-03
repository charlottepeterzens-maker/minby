import { useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Heart, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { resolveAvatarUrl } from "@/utils/avatarUrl";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import ConfirmSheet from "@/components/ConfirmSheet";
import AddHangoutSheet from "@/components/profile/AddHangoutSheet";
import CreateGroupDialog from "@/components/CreateGroupDialog";
import FeedHangoutCard from "@/components/feed/FeedHangoutCard";

interface HangoutStatus {
  id: string;
  entry_type: string;
  date: string;
  activities: string[];
  custom_note: string | null;
  user_id: string;
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
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [hangoutOpen, setHangoutOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  // Track the last person so we can keep rendering sheets after drawer closes
  const [lastPerson, setLastPerson] = useState(person);
  if (person && person.user_id !== lastPerson?.user_id) {
    setLastPerson(person);
  }
  const activePerson = person || lastPerson;

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
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, type: "spring", stiffness: 300, damping: 24 }}
              className="flex items-center gap-3 mb-4"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08, type: "spring", stiffness: 400, damping: 20 }}
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
              </motion.div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-[15px] font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
                    {person.display_name}
                  </span>
                  {isClose && <Heart className="w-2.5 h-2.5" style={{ color: "#D4E8F5" }} fill="#D4E8F5" />}
                </div>
                <span className="text-[12px]" style={{ color: "hsl(var(--color-text-muted))" }}>
                  {tierText} · senast aktiv {relativeTime(person.last_activity)}
                </span>
              </div>
            </motion.div>

            {/* Hangout section */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, type: "spring", stiffness: 300, damping: 24 }}
            >
              {hangout ? (
                <div className="mb-4">
                  <FeedHangoutCard
                    hangout={{
                      id: hangout.id,
                      date: hangout.date,
                      activities: hangout.activities,
                      custom_note: hangout.custom_note,
                      created_at: "",
                      entry_type: hangout.entry_type,
                      user_id: hangout.user_id,
                    }}
                    profile={{
                      display_name: person.display_name,
                      avatar_url: person.avatar_url,
                      initials: person.initial,
                    }}
                    isOwn={false}
                    onProfileClick={() => {}}
                    onRefresh={onUpdate}
                  />
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-[13px]" style={{ color: "hsl(var(--color-text-faint))" }}>
                    {person.display_name} har inga planer – vill du föreslå något?
                  </p>
                  <button
                    onClick={() => {
                      onOpenChange(false);
                      setTimeout(() => setHangoutOpen(true), 300);
                    }}
                    className="text-[13px] font-medium mt-1"
                    style={{ color: "#1C1917" }}
                  >
                    Föreslå något →
                  </button>
                </div>
              )}
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, type: "spring", stiffness: 300, damping: 24 }}
              className="flex gap-2 mb-4"
            >
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  onOpenChange(false);
                  setTimeout(() => setHangoutOpen(true), 300);
                }}
                className="flex-1 py-2.5 text-[13px] font-medium"
                style={{ backgroundColor: "#561828", borderRadius: 8, color: "#F0EAE2", border: "none" }}
              >
                Föreslå en träff
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  onOpenChange(false);
                  setTimeout(() => setGroupOpen(true), 300);
                }}
                className="flex-1 py-2.5 text-[13px] font-medium"
                style={{ borderRadius: 8, color: "#1C1917", backgroundColor: "#F5F0EA", border: "none" }}
              >
                Starta sällskap
              </motion.button>
            </motion.div>

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: "#F7F3EF", margin: "8px 0 12px" }} />

            {/* Manage relation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.24 }}
              className="space-y-1"
            >
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleToggleClose}
                className="w-full text-left py-2.5 px-1 text-[13px] flex items-center gap-2"
                style={{ color: "hsl(var(--color-text-primary))" }}
              >
                <Heart className="w-3.5 h-3.5" style={{ color: isClose ? "#D4E8F5" : "#6B5C78" }} fill={isClose ? "#D4E8F5" : "none"} />
                {isClose ? "Ta bort från närmaste krets" : "Lägg till i närmaste krets"}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onToggleMute(person.user_id)}
                className="w-full text-left py-2.5 px-1 text-[13px]"
                style={{ color: "hsl(var(--color-text-primary))" }}
              >
                {isMuted ? `Sluta muta ${person.display_name}` : `Muta ${person.display_name}`}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setRemoveConfirm(true)}
                className="w-full text-left py-2.5 px-1 text-[13px]"
                style={{ color: "#A32D2D" }}
              >
                Ta bort från kretsen
              </motion.button>
            </motion.div>
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

      {activePerson && (
        <AddHangoutSheet
          open={hangoutOpen}
          onOpenChange={setHangoutOpen}
          onCreated={onUpdate}
          initialTaggedUser={{ user_id: activePerson.user_id, display_name: activePerson.display_name }}
        />
      )}

      {activePerson && (
        <CreateGroupDialog
          onGroupCreated={onUpdate}
          externalOpen={groupOpen}
          onExternalOpenChange={setGroupOpen}
          preselectedFriendIds={[activePerson.user_id]}
        />
      )}
    </>
  );
};

export default KretspersonSheet;
