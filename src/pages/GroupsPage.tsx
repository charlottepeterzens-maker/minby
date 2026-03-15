import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import CreateGroupDialog from "@/components/CreateGroupDialog";

interface Group {
  id: string;
  name: string;
  emoji: string;
  owner_id: string;
  member_names: string[];
}

const GroupsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    const { data: memberships } = await supabase
      .from("group_memberships")
      .select("group_id")
      .eq("user_id", user.id);

    if (!memberships?.length) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const groupIds = memberships.map((m) => m.group_id);
    const { data: groupsData } = await supabase
      .from("friend_groups")
      .select("*")
      .in("id", groupIds);

    if (groupsData) {
      const groupsWithMembers: Group[] = await Promise.all(
        groupsData.map(async (g) => {
          const { data: members } = await supabase
            .from("group_memberships")
            .select("user_id")
            .eq("group_id", g.id);

          const memberIds = (members || []).map((m) => m.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("display_name")
            .in("user_id", memberIds);

          const names = (profiles || [])
            .map((p) => p.display_name || "Anonym")
            .slice(0, 4);

          return { ...g, member_names: names };
        })
      );
      setGroups(groupsWithMembers);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "#F7F3EF" }}>
      <nav className="sticky top-0 z-50 border-b border-border" style={{ backgroundColor: "#F7F3EF" }}>
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <span className="font-display text-lg font-medium text-foreground">Grupper</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-5 py-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-[12px] h-[72px] animate-pulse"
                style={{ backgroundColor: "#E8E2DB" }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => navigate(`/groups/${g.id}`)}
                className="w-full flex items-center gap-3 rounded-[12px] p-3 text-left transition-colors hover:opacity-90"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "0.5px solid #DDD5CC",
                }}
              >
                {/* Emoji icon box */}
                <div
                  className="shrink-0 flex items-center justify-center"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    backgroundColor: "#F7F3EF",
                  }}
                >
                  <span className="text-lg">{g.emoji}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] font-medium truncate"
                    style={{ color: "#3C2A4D" }}
                  >
                    {g.name}
                  </p>
                  <p
                    className="text-[11px] truncate"
                    style={{ color: "#7A6A85" }}
                  >
                    {g.member_names.join(", ")}
                  </p>
                </div>

                {/* Timestamp placeholder */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="text-[10px]" style={{ color: "#7A6A85" }}>
                    –
                  </span>
                </div>
              </button>
            ))}

            {/* Create new group card */}
            <CreateGroupDialog
              onGroupCreated={fetchGroups}
              trigger={
                <button
                  className="w-full flex items-center gap-3 rounded-[12px] p-3 text-left transition-colors hover:opacity-80"
                  style={{ border: "0.5px dashed #DDD5CC" }}
                >
                  <div
                    className="shrink-0 flex items-center justify-center"
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      border: "0.5px dashed #DDD5CC",
                    }}
                  >
                    <Plus className="w-4 h-4" style={{ color: "#7A6A85" }} />
                  </div>
                  <span
                    className="text-[12px] font-medium"
                    style={{ color: "#7A6A85" }}
                  >
                    Skapa en ny grupp
                  </span>
                </button>
              }
            />

            {groups.length === 0 && (
              <div className="text-center py-12">
                <p
                  className="font-display text-base"
                  style={{ color: "#7A6A85" }}
                >
                  Inga grupper ännu
                </p>
                <p className="text-[12px] mt-1" style={{ color: "#9B8BA5" }}>
                  Skapa din första grupp för att börja planera!
                </p>
              </div>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default GroupsPage;
