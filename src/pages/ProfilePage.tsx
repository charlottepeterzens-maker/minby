import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus, Settings, Lock, Heart, Menu } from "lucide-react";
import LifeSectionCard from "@/components/profile/LifeSectionCard";
import CreateSectionDialog from "@/components/profile/CreateSectionDialog";
import FriendTierManager from "@/components/profile/FriendTierManager";
import PeriodTracker from "@/components/profile/PeriodTracker";
import WorkoutTracker from "@/components/profile/WorkoutTracker";
import BottomNav from "@/components/BottomNav";

interface LifeSection {
  id: string;
  name: string;
  emoji: string;
  min_tier: string;
  section_type: string;
  sort_order: number;
}

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  user_id: string;
}

const tierLabels: Record<string, { label: string; color: string }> = {
  close: { label: "Close", color: "text-primary" },
  inner: { label: "Inner circle", color: "text-secondary-foreground" },
  outer: { label: "Everyone", color: "text-muted-foreground" },
};

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sections, setSections] = useState<LifeSection[]>([]);
  const [showTierManager, setShowTierManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const fetchProfile = useCallback(async () => {
    if (!targetUserId) return;
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, user_id")
      .eq("user_id", targetUserId)
      .single();
    if (data) setProfile(data);
  }, [targetUserId]);

  const fetchSections = useCallback(async () => {
    if (!targetUserId) return;
    const { data } = await supabase
      .from("life_sections")
      .select("*")
      .eq("user_id", targetUserId)
      .order("sort_order", { ascending: true });
    if (data) setSections(data as LifeSection[]);
    setLoading(false);
  }, [targetUserId]);

  useEffect(() => {
    fetchProfile();
    fetchSections();
  }, [fetchProfile, fetchSections]);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(`section-${sectionId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const initial = profile?.display_name?.charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="w-4 h-4" />
            </Button>
            <span className="font-display text-lg font-bold text-foreground">Profile</span>
          </div>
          {isOwnProfile && (
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowTierManager(!showTierManager)}>
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto flex">
        {/* Sidebar */}
        <AnimatePresence>
          {(sidebarOpen || typeof window !== "undefined") && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: sidebarOpen ? 220 : 0, opacity: sidebarOpen ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className="hidden lg:block sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto overflow-x-hidden border-r border-border/50 shrink-0"
            >
              <div className="p-4 space-y-1 w-[220px]">
                {/* Profile mini */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/30">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-xs font-display font-bold text-primary">{initial}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground truncate">{profile?.display_name || "Anonymous"}</span>
                </div>

                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-2">Sections</p>

                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-sm text-foreground/80 hover:bg-muted hover:text-foreground transition-colors truncate flex items-center justify-between group"
                  >
                    <span className="truncate">{section.name}</span>
                    {isOwnProfile && (
                      <span className="text-[9px] text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        {tierLabels[section.min_tier]?.label}
                      </span>
                    )}
                  </button>
                ))}

                {sections.length === 0 && !loading && (
                  <p className="text-xs text-muted-foreground/50 px-2">No sections yet</p>
                )}

                {isOwnProfile && (
                  <div className="pt-2">
                    <CreateSectionDialog onCreated={fetchSections} />
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <motion.div
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                exit={{ x: -240 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="absolute left-0 top-0 h-full w-60 bg-background border-r border-border/50 p-4 space-y-1"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/30">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-xs font-display font-bold text-primary">{initial}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground truncate">{profile?.display_name || "Anonymous"}</span>
                </div>

                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-2">Sections</p>

                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => { scrollToSection(section.id); setSidebarOpen(false); }}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-sm text-foreground/80 hover:bg-muted hover:text-foreground transition-colors truncate"
                  >
                    {section.name}
                  </button>
                ))}

                {isOwnProfile && (
                  <div className="pt-2">
                    <CreateSectionDialog onCreated={fetchSections} />
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 px-4 py-6 pb-20 min-w-0">
          {/* Profile header */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-3">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-2xl font-display font-bold text-primary">{initial}</span>
              )}
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {profile?.display_name || "Anonymous"}
            </h1>
            {isOwnProfile && (
              <p className="text-sm text-muted-foreground mt-1">Share your life with your circles</p>
            )}
          </motion.div>

          {/* Friend Tier Manager (own profile only) */}
          <AnimatePresence>
            {showTierManager && isOwnProfile && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-6"
              >
                <FriendTierManager />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Life sections header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" /> Life updates
            </h2>
            {isOwnProfile && <CreateSectionDialog onCreated={fetchSections} />}
          </div>

          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Loading...</div>
          ) : sections.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <Plus className="w-10 h-10 text-primary/30 mx-auto mb-4" />
              <p className="font-display text-lg text-muted-foreground">
                {isOwnProfile ? "Add your first life section" : "Nothing shared yet"}
              </p>
              {isOwnProfile && (
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Share your kids, workouts, pregnancy, hobbies & more
                </p>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-col gap-4">
              {sections.map((section, i) => {
                if (section.section_type === "period") {
                  return (
                    <motion.div key={section.id} id={`section-${section.id}`} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <PeriodTracker section={section} isOwner={isOwnProfile} />
                    </motion.div>
                  );
                }
                if (section.section_type === "workout") {
                  return (
                    <motion.div key={section.id} id={`section-${section.id}`} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <WorkoutTracker section={section} isOwner={isOwnProfile} />
                    </motion.div>
                  );
                }
                return (
                  <motion.div key={section.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <LifeSectionCard section={section} isOwner={isOwnProfile} onUpdated={fetchSections} />
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Tier legend */}
          {isOwnProfile && sections.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 p-4 bg-muted/50 rounded-2xl">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Access levels on your sections
              </p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(tierLabels).map(([key, val]) => (
                  <span key={key} className={`text-xs ${val.color}`}>
                    {val.label}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
