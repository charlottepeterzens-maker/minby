import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Plus, Lock, Camera, Pencil, Check, X } from "lucide-react";
import LifeSectionCard from "@/components/profile/LifeSectionCard";
import CreateSectionDialog from "@/components/profile/CreateSectionDialog";
import FriendTierManager from "@/components/profile/FriendTierManager";
import PeriodTracker from "@/components/profile/PeriodTracker";
import WorkoutTracker from "@/components/profile/WorkoutTracker";
import BottomNav from "@/components/BottomNav";
import { toast } from "@/hooks/use-toast";

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
  bio: string | null;
}

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sections, setSections] = useState<LifeSection[]>([]);
  const [showTierManager, setShowTierManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const tierLabels: Record<string, { label: string; color: string }> = {
    close: { label: t("close"), color: "text-primary" },
    inner: { label: t("innerCircle"), color: "text-secondary-foreground" },
    outer: { label: t("everyone"), color: "text-muted-foreground" },
  };

  const fetchProfile = useCallback(async () => {
    if (!targetUserId) return;
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, user_id, bio")
      .eq("user_id", targetUserId)
      .single();
    if (data) {
      setProfile(data);
      setBioText(data.bio || "");
    }
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
    setActiveSection(sectionId);
    const el = document.getElementById(`section-${sectionId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("life-images")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: t("error"), description: uploadError.message, variant: "destructive" });
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("life-images").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: urlData.publicUrl })
      .eq("user_id", user.id);

    if (updateError) {
      toast({ title: t("error"), description: updateError.message, variant: "destructive" });
    } else {
      await fetchProfile();
    }
    setUploadingAvatar(false);
  };

   const saveBio = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ bio: bioText.trim() || null })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    } else {
      setEditingBio(false);
      await fetchProfile();
    }
  };

  const initial = profile?.display_name?.charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-display text-lg font-bold text-foreground">{t("profileTitle")}</span>
          </div>
          {isOwnProfile && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setShowTierManager(!showTierManager)}>
              {t("accessLevels")}
            </Button>
          )}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Profile header with avatar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 bg-primary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-display font-bold text-primary">{initial}</span>
              )}
            </div>
            {isOwnProfile && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center shadow-elevated hover:scale-105 transition-transform disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground">
            {profile?.display_name || t("anonymous")}
          </h1>

          {/* Bio / Quote */}
          {isOwnProfile ? (
            <div className="mt-3 max-w-sm mx-auto">
              {editingBio ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    placeholder={t("addQuoteOrBio")}
                    className="text-center text-sm"
                    maxLength={150}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8" onClick={saveBio}>
                    <Check className="w-4 h-4 text-accent" />
                  </Button>
                  <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8" onClick={() => { setEditingBio(false); setBioText(profile?.bio || ""); }}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingBio(true)}
                  className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground italic hover:text-foreground transition-colors"
                >
                  {profile?.bio ? (
                    <span>"{profile.bio}"</span>
                  ) : (
                    <span className="not-italic">{t("addQuoteOrBio")}</span>
                  )}
                  <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          ) : profile?.bio ? (
            <p className="mt-3 text-sm text-muted-foreground italic">"{profile.bio}"</p>
          ) : null}
        </motion.div>

        {/* Friend Tier Manager */}
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

        {/* Horizontal section nav bar */}
        {sections.length > 0 && (
          <div className="sticky top-[57px] z-40 bg-background/90 backdrop-blur-md border-b border-border/30 -mx-4 px-4 mb-6">
            <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`shrink-0 px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeSection === section.id
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="mr-1">{section.emoji}</span>
                  {section.name}
                </button>
              ))}
              {isOwnProfile && <CreateSectionDialog onCreated={fetchSections} />}
            </div>
          </div>
        )}

        {/* Life sections header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-foreground">
            {t("lifeUpdates")}
          </h2>
          {isOwnProfile && sections.length === 0 && <CreateSectionDialog onCreated={fetchSections} />}
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">{t("loading")}</div>
        ) : sections.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <Plus className="w-10 h-10 text-primary/30 mx-auto mb-4" />
            <p className="font-display text-lg text-muted-foreground">
              {isOwnProfile ? t("addFirstSection") : t("nothingSharedYet")}
            </p>
            {isOwnProfile && (
              <p className="text-sm text-muted-foreground/70 mt-1">
                {t("shareLifeHint")}
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
                <motion.div key={section.id} id={`section-${section.id}`} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <LifeSectionCard section={section} isOwner={isOwnProfile} onUpdated={fetchSections} />
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Tier legend */}
        {isOwnProfile && sections.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 p-4 bg-muted/50">
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Lock className="w-3 h-3" /> {t("accessLevels")}
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
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
