import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus, Settings, Lock, Users, Heart } from "lucide-react";
import LifeSectionCard from "@/components/profile/LifeSectionCard";
import CreateSectionDialog from "@/components/profile/CreateSectionDialog";
import FriendTierManager from "@/components/profile/FriendTierManager";
import PeriodTracker from "@/components/profile/PeriodTracker";
import WorkoutTracker from "@/components/profile/WorkoutTracker";

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

const tierLabels: Record<string, { label: string; icon: string; color: string }> = {
  close: { label: "Close", icon: "💖", color: "text-primary" },
  inner: { label: "Inner circle", icon: "🤝", color: "text-secondary-foreground" },
  outer: { label: "Everyone", icon: "🌍", color: "text-muted-foreground" },
};

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sections, setSections] = useState<LifeSection[]>([]);
  const [showTierManager, setShowTierManager] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const initial = profile?.display_name?.charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="font-display text-lg font-bold text-foreground">Profile</span>
          </button>
          {isOwnProfile && (
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowTierManager(!showTierManager)}>
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
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

        {/* Life sections */}
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
                  <motion.div key={section.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <PeriodTracker section={section} isOwner={isOwnProfile} />
                  </motion.div>
                );
              }
              if (section.section_type === "workout") {
                return (
                  <motion.div key={section.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <WorkoutTracker section={section} isOwner={isOwnProfile} />
                  </motion.div>
                );
              }
              return (
                <motion.div key={section.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <LifeSectionCard section={section} isOwner={isOwnProfile} />
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
                  {val.icon} {val.label}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default ProfilePage;
