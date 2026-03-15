import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import PlanCard, { type PlanWithDetails } from "@/components/PlanCard";
import CreatePlanDialog from "@/components/CreatePlanDialog";
import CreateGroupDialog from "@/components/CreateGroupDialog";
import { Button } from "@/components/ui/button";
import { Users, ChevronLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";

interface Group {
  id: string;
  name: string;
  emoji: string;
  owner_id: string;
  member_count: number;
}

const vibeFilters = [
  { label: "Alla", value: "all" },
  { label: "Chill", value: "chill" },
  { label: "Äventyr", value: "adventure" },
  { label: "Kreativt", value: "creative" },
  { label: "Egentid", value: "selfcare" },
];

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [plans, setPlans] = useState<PlanWithDetails[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    const { data: memberships } = await supabase
      .from("group_memberships")
      .select("group_id")
      .eq("user_id", user.id);

    if (!memberships?.length) { setGroups([]); setLoading(false); return; }

    const groupIds = memberships.map((m) => m.group_id);
    const { data: groupsData } = await supabase.from("friend_groups").select("*").in("id", groupIds);

    if (groupsData) {
      const groupsWithCounts: Group[] = await Promise.all(
        groupsData.map(async (g) => {
          const { count } = await supabase
            .from("group_memberships")
            .select("*", { count: "exact", head: true })
            .eq("group_id", g.id);
          return { ...g, member_count: count || 0 };
        })
      );
      setGroups(groupsWithCounts);
    }
    setLoading(false);
  }, [user]);

  const fetchPlans = useCallback(async () => {
    if (!selectedGroup || !user) return;

    const { data: plansData } = await supabase
      .from("plans")
      .select("*")
      .eq("group_id", selectedGroup.id)
      .order("created_at", { ascending: false });

    if (!plansData) return;

    const plansWithDetails: PlanWithDetails[] = await Promise.all(
      plansData.map(async (p) => {
        const { data: creatorProfile } = await supabase.from("profiles").select("display_name").eq("user_id", p.created_by).single();
        const { data: rsvpsData } = await supabase.from("rsvps").select("user_id, status").eq("plan_id", p.id);

        const rsvpsWithNames = await Promise.all(
          (rsvpsData || []).map(async (r) => {
            const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", r.user_id).single();
            const name = profile?.display_name || "?";
            return { ...r, display_name: name, initial: name.charAt(0).toUpperCase() };
          })
        );

        const creatorName = creatorProfile?.display_name || "Someone";
        const userRsvp = rsvpsWithNames.find((r) => r.user_id === user.id)?.status ?? null;

        return {
          id: p.id, title: p.title, emoji: p.emoji, date_text: p.date_text,
          location: p.location, vibe: p.vibe, created_by: p.created_by,
          creator_name: creatorName, creator_initial: creatorName.charAt(0).toUpperCase(),
          rsvps: rsvpsWithNames, userRsvp,
        };
      })
    );
    setPlans(plansWithDetails);
  }, [selectedGroup, user]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);
  useEffect(() => { if (selectedGroup) fetchPlans(); }, [selectedGroup, fetchPlans]);

  const filteredPlans = activeFilter === "all" ? plans : plans.filter((p) => p.vibe === activeFilter);

  if (!selectedGroup) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <nav className="sticky top-0 z-50 bg-background border-b border-border">
          <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
            <span className="font-display text-[20px] font-medium text-foreground">Grupper</span>
            <CreateGroupDialog onGroupCreated={fetchGroups} />
          </div>
        </nav>

        <main className="max-w-2xl mx-auto px-5 py-5">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="bg-muted rounded-[14px] h-20 animate-pulse" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-display text-lg text-muted-foreground">Inga grupper ännu</p>
              <p className="text-sm text-muted-foreground mt-2">Skapa din första grupp för att börja planera!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroup(g)}
                  className="w-full bg-card rounded-[14px] p-4 border-[0.5px] border-border text-left flex items-center gap-4 hover:bg-muted/50 transition-colors duration-150"
                >
                  <div className="w-10 h-10 bg-lavender-bg rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-secondary-foreground" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-base font-medium text-card-foreground">{g.name}</h3>
                    <p className="text-xs text-muted-foreground">{g.member_count} medlem{g.member_count !== 1 ? "mar" : ""}</p>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </button>
              ))}
            </div>
          )}
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <nav className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <button onClick={() => setSelectedGroup(null)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-150">
            <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            <span className="font-display text-lg font-medium text-foreground">{selectedGroup.name}</span>
          </button>
          <CreatePlanDialog groupId={selectedGroup.id} onPlanCreated={fetchPlans} />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-5 py-5 pb-20">
        {/* Vibe filter pills */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          {vibeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`px-4 py-1.5 rounded-[20px] text-xs font-medium whitespace-nowrap transition-colors duration-150 ${
                activeFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground border-[0.5px] border-border hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onRsvpChange={fetchPlans} />
          ))}
        </div>

        {filteredPlans.length === 0 && (
          <div className="text-center py-20">
            <p className="font-display text-lg text-muted-foreground">Inga planer ännu</p>
            <p className="text-sm text-muted-foreground mt-2">Var först med att föreslå något!</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Index;
