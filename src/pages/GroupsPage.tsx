import { useState, useEffect, useCallback } from "react";
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
    <div className="min-h-screen pb-20" style={{ backgroundColor: "#F7F3EF" }}>
      <nav className="sticky top-0 z-50" style={{ backgroundColor: "#F7F3EF" }}>
        <Container className="py-4 flex items-center justify-between">
          <span className="font-display text-[20px] font-medium text-foreground">Sällskap</span>
        </Container>
        <CurvedSeparator />
      </nav>

      <Container className="py-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-[16px] h-[72px] animate-pulse" style={{ backgroundColor: "#E8E2DB" }} />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => navigate(`/groups/${g.id}`)}
                className="w-full flex items-center gap-3 rounded-[16px] p-3 text-left transition-colors hover:opacity-90"
                style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE8F4" }}
              >
                <div className="shrink-0 flex items-center justify-center"
                  style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: "#F7F3EF" }}>
                  <span className="text-lg">{g.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: "#3C2A4D" }}>{g.name}</p>
                  {g.latestPlan ? (
                    <GroupStatusLine
                      memberCount={g.member_count}
                      latestPlan={g.latestPlan}
                      lastMessageAt={g.last_message_at}
                      compact
                    />
                  ) : (
                    <p className="text-[11px] truncate italic" style={{ color: "#7A6A85" }}>
                      {g.last_message || "Inga meddelanden än"}
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="text-[10px]" style={{ color: "#7A6A85" }}>
                    {g.last_message_at ? formatTime(g.last_message_at) : "–"}
                  </span>
                </div>
              </button>
            ))}

            <CreateGroupDialog
              onGroupCreated={fetchGroups}
              trigger={
                <button
                  className="w-full flex items-center gap-3 rounded-[16px] p-3 text-left transition-colors hover:opacity-80 outline-none focus:outline-none"
                  style={{ border: "1.5px dashed #EDE8F4" }}>
                  <div className="shrink-0 flex items-center justify-center"
                    style={{ width: 42, height: 42, borderRadius: 10, border: "0.5px dashed #EDE8F4" }}>
                    <Plus className="w-4 h-4" style={{ color: "#7A6A85" }} />
                  </div>
                  <span className="text-[12px] font-medium" style={{ color: "#7A6A85" }}>
                    Skapa ett nytt sällskap
                  </span>
                </button>
              }
            />

            {groups.length === 0 && (
              <div className="flex flex-col items-center pt-8 pb-4">
                {/* Illustration */}
                <div className="relative mb-5" style={{ width: 100, height: 60 }}>
                  <div className="absolute left-0 top-1 rounded-xl flex items-center justify-center"
                    style={{ width: 44, height: 44, backgroundColor: "#EDE8F4" }}>
                    <span className="text-lg">👯</span>
                  </div>
                  <div className="absolute left-7 top-0 rounded-xl flex items-center justify-center z-10"
                    style={{ width: 44, height: 44, backgroundColor: "#FCF0F3", border: "2px solid #F7F3EF" }}>
                    <span className="text-lg">💬</span>
                  </div>
                  <div className="absolute left-14 top-2 rounded-xl flex items-center justify-center z-20"
                    style={{ width: 44, height: 44, backgroundColor: "#EAF2E8", border: "2px solid #F7F3EF" }}>
                    <span className="text-lg">📅</span>
                  </div>
                </div>
                <h3 className="font-fraunces text-[16px] font-medium mb-1" style={{ color: "#3C2A4D" }}>
                  Skapa ditt första sällskap
                </h3>
                <p className="text-[12px] text-center leading-relaxed mb-1" style={{ color: "#7A6A85", maxWidth: 220 }}>
                  Samla gänget, planera träffar och chatta – allt på ett ställe.
                </p>
              </div>
            )}
          </div>
        )}
      </Container>
      <BottomNav />
    </div>
  );
};

export default GroupsPage;
