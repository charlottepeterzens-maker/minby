import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import CurvedSeparator from "@/components/CurvedSeparator";
import CreateGroupDialog from "@/components/CreateGroupDialog";
import { Container } from "@/components/layout";

interface Group {
  id: string;
  name: string;
  emoji: string;
  owner_id: string;
  member_names: string[];
  last_message: string | null;
  last_message_at: string | null;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) {
    return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  }
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
    const { data: memberships } = await supabase.
    from("group_memberships").
    select("group_id").
    eq("user_id", user.id);

    if (!memberships?.length) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const groupIds = memberships.map((m) => m.group_id);
    const { data: groupsData } = await supabase.
    from("friend_groups").
    select("*").
    in("id", groupIds);

    if (groupsData) {
      const groupsWithMembers: Group[] = await Promise.all(
        groupsData.map(async (g) => {
          const { data: members } = await supabase.
          from("group_memberships").
          select("user_id").
          eq("group_id", g.id);

          const memberIds = (members || []).map((m) => m.user_id);
          const { data: profiles } = await supabase.
          from("profiles").
          select("display_name").
          in("user_id", memberIds);

          const names = (profiles || []).
          map((p) => p.display_name || "Anonym").
          slice(0, 4);

          // Fetch last message
          const { data: lastMsg } = await supabase.
          from("group_messages").
          select("content, created_at").
          eq("group_id", g.id).
          order("created_at", { ascending: false }).
          limit(1).
          maybeSingle();

          return {
            ...g,
            member_names: names,
            last_message: lastMsg?.content || null,
            last_message_at: lastMsg?.created_at || null
          };
        })
      );

      // Sort by last message time (newest first), groups without messages last
      groupsWithMembers.sort((a, b) => {
        if (!a.last_message_at && !b.last_message_at) return 0;
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });

      setGroups(groupsWithMembers);
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
          <span className="font-display text-[20px] font-medium text-foreground">Grupper</span>
        </Container>
        <CurvedSeparator />
      </nav>

      <Container as="main" className="py-5">
        {loading ?
        <div className="space-y-3">
            {[1, 2, 3].map((i) =>
          <div
            key={i}
            className="rounded-[16px] h-[72px] animate-pulse"
            style={{ backgroundColor: "#E8E2DB" }} />

          )}
          </div> :

        <div className="space-y-2.5">
            {groups.map((g) =>
          <button
            key={g.id}
            onClick={() => navigate(`/groups/${g.id}`)}
            className="w-full flex items-center gap-3 rounded-[16px] p-3 text-left transition-colors hover:opacity-90"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #EDE8F4"
            }}>
            
                {/* Emoji icon box */}
                <div
              className="shrink-0 flex items-center justify-center"
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                backgroundColor: "#F7F3EF"
              }}>
              
                  <span className="text-lg">{g.emoji}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                className="text-[13px] font-medium truncate"
                style={{ color: "#3C2A4D" }}>
                
                    {g.name}
                  </p>
                  <p
                className="text-[11px] truncate italic"
                style={{ color: "#7A6A85" }}>
                
                    {g.last_message || "Inga meddelanden än"}
                  </p>
                </div>

                {/* Timestamp */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="text-[10px]" style={{ color: "#7A6A85" }}>
                    {g.last_message_at ? formatTime(g.last_message_at) : "–"}
                  </span>
                </div>
              </button>
          )}

            {/* Create new group card */}
            <CreateGroupDialog
            onGroupCreated={fetchGroups}
            trigger={
            <button
              className="w-full flex items-center gap-3 rounded-[16px] p-3 text-left transition-colors hover:opacity-80 outline-none focus:outline-none"
              style={{ border: "1.5px dashed #EDE8F4" }}>
              
                  <div
                className="shrink-0 flex items-center justify-center"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  border: "0.5px dashed #EDE8F4"
                }}>
                
                    <Plus className="w-4 h-4" style={{ color: "#7A6A85" }} />
                  </div>
                  <span
                className="text-[12px] font-medium"
                style={{ color: "#7A6A85" }}>
                
                    Skapa en ny grupp
                  </span>
                </button>
            } />
          

            {groups.length === 0 &&
          <div className="text-center py-12">
                <p
              className="font-display text-base"
              style={{ color: "#7A6A85" }}>
              
                  Inga grupper ännu
                </p>
                <p className="text-[12px] mt-1" style={{ color: "#9B8BA5" }}>
                  Inga grupper ännu – skapa en från en bekräftad dejt
                </p>
              </div>
          }
          </div>
        }
      </Container>
      <BottomNav />
    </div>);

};

export default GroupsPage;