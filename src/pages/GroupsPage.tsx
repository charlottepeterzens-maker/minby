import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import CurvedSeparator from "@/components/CurvedSeparator";
import CreateGroupDialog from "@/components/CreateGroupDialog";
import { Container } from "@/components/layout";
import GroupStatusLine from "@/components/chat/GroupStatusLine";

interface Group {
  id: string;
  name: string;
  emoji: string;
  owner_id: string;
  member_names: string[];
  member_count: number;
  last_message: string | null;
  last_message_at: string | null;
  latestPlan: { title: string; dateText: string; rsvpInCount: number; rsvpMaybeCount: number } | null;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Igår";
  if (diffDays < 7) return d.toLocaleDateString("sv-SE", { weekday: "short" });
  return d.toLocaleDateString("sv-SE", { month: "short", day: "numeric" });
}

const GroupsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    const { data: memberships } = await supabase
      .from("group_memberships").select("group_id").eq("user_id", user.id);

    if (!memberships?.length) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const groupIds = memberships.map((m) => m.group_id);
    const { data: groupsData } = await supabase
      .from("friend_groups").select("*").in("id", groupIds);

    if (groupsData) {
      const groupsWithDetails: Group[] = await Promise.all(
        groupsData.map(async (g) => {
          const { data: members } = await supabase
            .from("group_memberships").select("user_id").eq("group_id", g.id);
          const memberIds = (members || []).map((m) => m.user_id);
          const { data: profiles } = await supabase
            .from("profiles").select("display_name").in("user_id", memberIds);
          const names = (profiles || []).map((p) => p.display_name || "Anonym").slice(0, 4);

          // Fetch last message
          const { data: lastMsg } = await supabase
            .from("group_messages").select("content, created_at")
            .eq("group_id", g.id).order("created_at", { ascending: false }).limit(1).maybeSingle();

          // Fetch latest plan with rsvps
          const { data: latestPlanData } = await supabase
            .from("plans").select("id, title, date_text")
            .eq("group_id", g.id).order("created_at", { ascending: false }).limit(1).maybeSingle();

          let latestPlan = null;
          if (latestPlanData) {
            const { data: rsvpData } = await supabase
              .from("rsvps").select("status").eq("plan_id", latestPlanData.id);
            latestPlan = {
              title: latestPlanData.title,
              dateText: latestPlanData.date_text,
              rsvpInCount: (rsvpData || []).filter((r) => r.status === "in").length,
              rsvpMaybeCount: (rsvpData || []).filter((r) => r.status === "maybe").length,
            };
          }

          return {
            ...g,
            member_names: names,
            member_count: memberIds.length,
            last_message: lastMsg?.content || null,
            last_message_at: lastMsg?.created_at || null,
            latestPlan,
          };
        })
      );

      groupsWithDetails.sort((a, b) => {
        if (!a.last_message_at && !b.last_message_at) return 0;
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });

      setGroups(groupsWithDetails);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return (
    <PageTransition className="min-h-screen pb-20" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
      <nav className="sticky top-0 z-50" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
        <Container className="py-4 flex items-center justify-between">
          <span className="font-display text-[20px] font-medium text-foreground">Sällskap</span>
        </Container>
        <CurvedSeparator />
      </nav>

      <Container className="py-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl h-[72px] animate-pulse" style={{ backgroundColor: "hsl(var(--muted))" }} />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => navigate(`/groups/${g.id}`)}
                className="w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors hover:opacity-90"
                style={{ backgroundColor: "hsl(var(--color-surface-card))" }}
              >
                <div className="shrink-0 flex items-center justify-center"
                  style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: "hsl(var(--color-surface))" }}>
                  <span className="text-lg">{g.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: "hsl(var(--color-text-primary))" }}>{g.name}</p>
                  {g.latestPlan ? (
                    <GroupStatusLine
                      memberCount={g.member_count}
                      latestPlan={g.latestPlan}
                      lastMessageAt={g.last_message_at}
                      compact
                    />
                  ) : (
                    <p className="text-[11px] truncate italic" style={{ color: "hsl(var(--color-text-secondary))" }}>
                      {g.last_message || "Inga meddelanden än"}
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="text-[10px]" style={{ color: "hsl(var(--color-text-secondary))" }}>
                    {g.last_message_at ? formatTime(g.last_message_at) : "–"}
                  </span>
                </div>
              </button>
            ))}

            <CreateGroupDialog
              onGroupCreated={fetchGroups}
              trigger={
                <button
                  className="w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors hover:opacity-80 outline-none focus:outline-none"
                  style={{ border: "1.5px dashed hsl(var(--color-surface-raised))" }}>
                  <div className="shrink-0 flex items-center justify-center"
                    style={{ width: 42, height: 42, borderRadius: 12, border: "0.5px dashed hsl(var(--color-surface-raised))" }}>
                    <Plus className="w-4 h-4" style={{ color: "hsl(var(--color-text-secondary))" }} />
                  </div>
                  <span className="text-[12px] font-medium" style={{ color: "hsl(var(--color-text-secondary))" }}>
                    Skapa ett nytt sällskap
                  </span>
                </button>
              }
            />

            {groups.length === 0 && (
              <motion.div
                className="flex flex-col items-center pt-8 pb-4"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="relative mb-5" style={{ width: 100, height: 60 }}>
                  {[
                    { left: 0, top: 4, bg: "#EDE8F4", delay: 0.15 },
                    { left: 28, top: 0, bg: "#FCF0F3", delay: 0.25 },
                    { left: 56, top: 8, bg: "#EAF2E8", delay: 0.35 },
                  ].map((c, i) => (
                    <motion.div
                      key={i}
                      className="absolute rounded-xl flex items-center justify-center"
                      style={{ left: c.left, top: c.top, width: 44, height: 44, backgroundColor: c.bg, zIndex: i }}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: c.delay, type: "spring", stiffness: 260, damping: 20 }}
                    >
                      <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: "rgba(60,42,77,0.1)" }} />
                    </motion.div>
                  ))}
                </div>
                <motion.h3
                  className="font-fraunces text-[16px] font-medium mb-1"
                  style={{ color: "hsl(var(--color-text-primary))" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  Skapa ditt första sällskap
                </motion.h3>
                <motion.p
                  className="text-[12px] text-center leading-relaxed mb-1"
                  style={{ color: "hsl(var(--color-text-secondary))", maxWidth: 220 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                >
                  Samla gänget, planera träffar och chatta – allt på ett ställe.
                </motion.p>
              </motion.div>
            )}
          </div>
        )}
      </Container>
      <BottomNav />
    </PageTransition>
  );
};

export default GroupsPage;
