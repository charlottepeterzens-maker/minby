import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import PlanCard, { type PlanWithDetails } from "@/components/PlanCard";
import CreatePlanDialog from "@/components/CreatePlanDialog";
import CreateGroupDialog from "@/components/CreateGroupDialog";
import HeroSection from "@/components/HeroSection";
import { Button } from "@/components/ui/button";
import { LogOut, Users, Sparkles, ChevronLeft, User } from "lucide-react";

interface Group {
  id: string;
  name: string;
  emoji: string;
  owner_id: string;
  member_count: number;
}

const vibeFilters = [
  { label: "All", value: "all" },
  { label: "Chill", value: "chill" },
  { label: "Adventure", value: "adventure" },
  { label: "Creative", value: "creative" },
  { label: "Self-care", value: "selfcare" },
];

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [plans, setPlans] = useState<PlanWithDetails[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
    if (data?.display_name) setDisplayName(data.display_name);
  }, [user]);

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
      // Get member counts
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
        // Get creator profile
        const { data: creatorProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", p.created_by)
          .single();

        // Get RSVPs with profiles
        const { data: rsvpsData } = await supabase
          .from("rsvps")
          .select("user_id, status")
          .eq("plan_id", p.id);

        const rsvpsWithNames = await Promise.all(
          (rsvpsData || []).map(async (r) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("user_id", r.user_id)
              .single();
            const name = profile?.display_name || "?";
            return { ...r, display_name: name, initial: name.charAt(0).toUpperCase() };
          })
        );

        const creatorName = creatorProfile?.display_name || "Someone";
        const userRsvp = rsvpsWithNames.find((r) => r.user_id === user.id)?.status ?? null;

        return {
          id: p.id,
          title: p.title,
          emoji: p.emoji,
          date_text: p.date_text,
          location: p.location,
          vibe: p.vibe,
          created_by: p.created_by,
          creator_name: creatorName,
          creator_initial: creatorName.charAt(0).toUpperCase(),
          rsvps: rsvpsWithNames,
          userRsvp,
        };
      })
    );

    setPlans(plansWithDetails);
  }, [selectedGroup, user]);

  useEffect(() => {
    fetchProfile();
    fetchGroups();
  }, [fetchProfile, fetchGroups]);

  useEffect(() => {
    if (selectedGroup) fetchPlans();
  }, [selectedGroup, fetchPlans]);

  const filteredPlans = activeFilter === "all" ? plans : plans.filter((p) => p.vibe === activeFilter);

  // Group list view
  if (!selectedGroup) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-bold text-foreground">MinBy</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-body">Hey, {displayName || "you"}</span>
              <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} className="rounded-full">
                <User className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut} className="rounded-full">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </nav>

        <HeroSection />

        <main className="max-w-2xl mx-auto px-4 pb-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Your circles
            </h2>
            <CreateGroupDialog onGroupCreated={fetchGroups} />
          </div>

          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Loading...</div>
          ) : groups.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <Sparkles className="w-10 h-10 text-primary/30 mx-auto mb-4" />
              <p className="font-display text-lg text-muted-foreground">No circles yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Create your first friend group to start planning!</p>
            </motion.div>
          ) : (
            <div className="grid gap-3">
              {groups.map((g, i) => (
                <motion.button
                  key={g.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedGroup(g)}
                  className="bg-card rounded-2xl p-5 shadow-card hover:shadow-elevated transition-all duration-300 border border-border/50 text-left flex items-center gap-4"
                >
                  <span className="text-lg">{g.emoji}</span>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold text-card-foreground">{g.name}</h3>
                    <p className="text-sm text-muted-foreground">{g.member_count} member{g.member_count !== 1 ? "s" : ""}</p>
                  </div>
                  <span className="text-muted-foreground/50">→</span>
                </motion.button>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Group detail / plans view
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSelectedGroup(null)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-xl">{selectedGroup.emoji}</span>
            <span className="font-display text-lg font-bold text-foreground">{selectedGroup.name}</span>
          </button>
          <CreatePlanDialog groupId={selectedGroup.id} onPlanCreated={fetchPlans} />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 mb-6 overflow-x-auto pb-2"
        >
          {vibeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeFilter === f.value
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </motion.div>

        <div className="flex flex-col gap-4">
          {filteredPlans.map((plan, i) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
              <PlanCard plan={plan} onRsvpChange={fetchPlans} />
            </motion.div>
          ))}
        </div>

        {filteredPlans.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <Sparkles className="w-10 h-10 text-primary/30 mx-auto mb-4" />
            <p className="font-display text-lg text-muted-foreground">No plans yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Be the first to suggest something!</p>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Index;
