import { useState, useEffect, useCallback, useRef } from "react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Plus, Camera, Pencil, Check, X } from "lucide-react";
import { resolveAvatarUrl } from "@/utils/avatarUrl";
import AvatarCropDialog from "@/components/profile/AvatarCropDialog";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import CurvedSeparator from "@/components/CurvedSeparator";
import LifeSectionCard from "@/components/profile/LifeSectionCard";
import SectionGridCard from "@/components/profile/SectionGridCard";
import CreateSectionDialog from "@/components/profile/CreateSectionDialog";
import QuickPostCard from "@/components/profile/QuickPostCard";
import RecentPostsFeed from "@/components/profile/RecentPostsFeed";

import WorkoutTracker from "@/components/profile/WorkoutTracker";
import HangoutAvailability from "@/components/profile/HangoutAvailability";
import ProfileShareDialog from "@/components/profile/ProfileShareDialog";
import TipsFavorites from "@/components/profile/TipsFavorites";
import FriendRequestButton from "@/components/profile/FriendRequestButton";
import HangoutNotificationList from "@/components/profile/HangoutNotificationList";
import NotificationList from "@/components/profile/NotificationList";
import type { NotificationItem } from "@/components/profile/NotificationList";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

import InviteFriendDialog from "@/components/profile/InviteFriendDialog";
import BottomNav from "@/components/BottomNav";
import { Container } from "@/components/layout";
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

  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [recentRefreshKey, setRecentRefreshKey] = useState(0);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [notifHangoutId, setNotifHangoutId] = useState<string | null>(null);
  const { refresh: refreshUnread } = useUnreadNotifications();
  const [notifItems, setNotifItems] = useState<NotificationItem[]>([]);

  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;


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
    if (data) setSections((data as LifeSection[]).filter((s) => s.section_type !== "period"));
    setLoading(false);
  }, [targetUserId]);

  const fetchNotifItems = useCallback(async () => {
    if (!user || !isOwnProfile) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, body, created_at, read, from_user_id")
      .eq("user_id", user.id)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data && data.length > 0) {
      const fromIds = [...new Set(data.filter((n) => n.from_user_id).map((n) => n.from_user_id!))];
      let profileMap = new Map<string, { name: string | null; avatar: string | null }>();
      if (fromIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", fromIds);
        if (profiles) profileMap = new Map(profiles.map((p) => [p.user_id, { name: p.display_name, avatar: p.avatar_url }]));
      }
      setNotifItems(
        data.map((n) => ({
          id: n.id,
          body: n.body,
          created_at: n.created_at,
          read: n.read,
          from_user_name: n.from_user_id ? profileMap.get(n.from_user_id)?.name || null : null,
          from_user_avatar: n.from_user_id ? profileMap.get(n.from_user_id)?.avatar || null : null,
        })),
      );
    } else {
      setNotifItems([]);
    }
  }, [user, isOwnProfile]);

  useEffect(() => {
    fetchProfile();
    fetchSections();
    fetchNotifItems();
  }, [fetchProfile, fetchSections, fetchNotifItems]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchProfile(), fetchSections(), fetchNotifItems()]);
    setRecentRefreshKey((k) => k + 1);
  }, [fetchProfile, fetchSections, fetchNotifItems]);

  const { containerRef, pullDistance, refreshing, progress, handlers } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSection((prev) => (prev === sectionId ? null : sectionId));
    setTimeout(() => {
      const el = document.getElementById(`section-${sectionId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  };


  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    setCropOpen(true);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleCroppedUpload = async (blob: Blob) => {
    if (!user) return;
    setUploadingAvatar(true);
    const path = `${user.id}/avatar.jpg`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, {
      upsert: true,
      contentType: "image/jpeg",
    });
    if (uploadError) {
      toast({ title: t("error"), description: uploadError.message, variant: "destructive" });
      setUploadingAvatar(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const ts = Date.now();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: `${urlData.publicUrl}?t=${ts}` })
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
    <div
      ref={containerRef}
      className="min-h-screen bg-background overflow-auto"
      {...handlers}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all"
        style={{
          height: pullDistance > 0 ? pullDistance : 0,
          opacity: progress,
        }}
      >
        <motion.div
          animate={{ rotate: refreshing ? 360 : progress * 270 }}
          transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: "linear" } : { duration: 0 }}
          className="w-5 h-5 rounded-full border-2 border-t-transparent"
          style={{ borderColor: "#B0A8B5", borderTopColor: "transparent" }}
        />
      </div>

      {/* Top nav */}
      <nav className="sticky top-0 z-50 bg-background pt-safe">
        <Container className="px-2 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              aria-label="Tillbaka"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-150 min-w-[44px] min-h-[44px] justify-center"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <span className="font-fraunces text-[20px] font-medium text-foreground">Mitt</span>
          </div>
          <div className="flex items-center gap-1">{targetUserId && <ProfileShareDialog userId={targetUserId} />}</div>
        </Container>
        <CurvedSeparator />
      </nav>

      <main className="px-4 pt-6 pb-24">
        {/* ===== (1) PROFILE HEADER ===== */}
        <div className="flex items-start gap-4 mb-6">
          <div className="relative shrink-0">
            <motion.div
              whileTap={isOwnProfile ? { scale: 0.92 } : undefined}
              className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}
              onClick={isOwnProfile ? () => fileInputRef.current?.click() : undefined}
            >
              {resolveAvatarUrl(profile?.avatar_url ?? null) ? (
                <img src={resolveAvatarUrl(profile?.avatar_url ?? null)!} alt={`Profilbild för ${profile?.display_name || 'användare'}`} loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-display font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
                  {initial}
                </span>
              )}
            </motion.div>
            {isOwnProfile && (
              <motion.button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                whileTap={{ scale: 0.85 }}
                aria-label="Byt profilbild"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
              >
                <Camera className="w-3 h-3" />
              </motion.button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
          </div>

          <div className="flex-1 min-w-0 pt-1.5">
            <div className="flex items-center gap-2">
              <h1 className="font-fraunces text-[18px] font-medium text-foreground">
                {profile?.display_name || t("anonymous")}
              </h1>
              {!isOwnProfile && targetUserId && <FriendRequestButton targetUserId={targetUserId} />}
            </div>

            {/* Bio */}
            {isOwnProfile ? (
              <div className="mt-1.5">
                {editingBio ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={bioText}
                      onChange={(e) => setBioText(e.target.value)}
                      placeholder={t("addQuoteOrBio")}
                      className="text-sm"
                      maxLength={150}
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8" onClick={saveBio}>
                      <Check className="w-4 h-4 text-accent" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0 h-8 w-8"
                      onClick={() => {
                        setEditingBio(false);
                        setBioText(profile?.bio || "");
                      }}
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingBio(true)}
                    className="group flex items-start gap-1.5 text-[13px] hover:text-foreground transition-colors w-full text-left"
                    style={{ color: "hsl(var(--color-text-secondary))", wordBreak: "break-word" }}
                  >
                    {profile?.bio ? (
                      <span>{profile.bio}</span>
                    ) : (
                      <span className="not-italic">{t("addQuoteOrBio")}</span>
                    )}
                    <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                  </button>
                )}
              </div>
            ) : profile?.bio ? (
              <p className="mt-1.5 text-[13px]" style={{ color: "hsl(var(--color-text-secondary))" }}>
                {profile.bio}
              </p>
            ) : null}
          </div>
        </div>

        {/* Notifications */}
        {isOwnProfile && notifItems.length > 0 && (
          <div className="mb-6">
            <NotificationList
              notifications={notifItems}
              onClick={() => {}}
              onMarkAllRead={() => {
                if (!user) return;
                supabase
                  .from("notifications")
                  .update({ read: true })
                  .eq("user_id", user.id)
                  .eq("read", false)
                  .then(() => {
                    setNotifItems([]);
                    refreshUnread();
                  });
              }}
            />
          </div>
        )}

        {/* ===== (2) INVITE ROW ===== */}
        {isOwnProfile && (
          <div className="mb-6">
            <InviteFriendDialog />
          </div>
        )}

        {/* ===== (4) SES VI? ===== */}
        {isOwnProfile && (
          <HangoutNotificationList
            onOpenHangout={(hangoutId) => setNotifHangoutId(hangoutId)}
            onNotificationsRead={refreshUnread}
          />
        )}
        {targetUserId && (
          <div className="mb-8">
            <HangoutAvailability
              userId={targetUserId}
              isOwner={isOwnProfile}
              openEntryId={notifHangoutId}
              onOpenedEntry={() => setNotifHangoutId(null)}
            />
          </div>
        )}

        {/* ===== (5+6) MIN VARDAG ===== */}
        <div className="mb-8">
          {/* Section label */}
          <h2 className="font-fraunces font-normal text-[16px] mb-4" style={{ color: "hsl(var(--color-text-primary))" }}>
            {isOwnProfile ? "Min vardag" : `${profile?.display_name || "Deras"}s vardag`}
          </h2>

          {/* Quick post */}
          {isOwnProfile && (
            <div className="mb-4">
              <QuickPostCard
                profile={profile}
                sections={sections}
                onPosted={() => {
                  setRecentRefreshKey((k) => k + 1);
                  fetchSections();
                }}
                onSectionsChanged={fetchSections}
              />
            </div>
          )}

          {/* Recent posts */}
          <RecentPostsFeed
            sections={sections}
            refreshKey={recentRefreshKey}
            limit={showAllPosts ? 50 : 3}
            showFade={!showAllPosts}
          />

          {/* View all link */}
          <button
            onClick={() => setShowAllPosts(!showAllPosts)}
            className="w-full text-center mt-3"
            style={{
              fontSize: 11,
              color: "hsl(var(--color-text-secondary))",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 0",
            }}
          >
            {showAllPosts ? "Visa färre" : "Visa alla inlägg →"}
          </button>

          {/* Delar av min vardag – 2-col grid */}
          <div className="flex items-center justify-between mt-6 mb-3">
            <span className="text-[10px] uppercase font-medium tracking-wider" style={{ color: "hsl(var(--color-text-faint))" }}>
              {isOwnProfile ? "Delar av min vardag" : `Delar av ${profile?.display_name || "deras"}s vardag`}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-4 text-muted-foreground text-xs">{t("loading")}</div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              {sections.map((section, i) => {
                const isActive = expandedSection === section.id;
                return (
                  <div
                    key={section.id}
                    id={`section-${section.id}`}
                    style={{
                      gridColumn: isActive ? "1 / -1" : "auto",
                      transition: "grid-column 0.3s ease",
                    }}
                  >
                    <SectionGridCard
                      section={section}
                      isOwner={isOwnProfile}
                      isExpanded={isActive}
                      onClick={() => toggleSection(section.id)}
                      onDeleted={fetchSections}
                      onRenamed={fetchSections}
                      index={i}
                    />

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          style={{ overflow: "hidden" }}
                        >
                          <div style={{ paddingTop: 8 }}>
                            {/* Close button */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7A6A85" }}>
                                {section.name}
                              </span>
                              <button
                                onClick={() => setExpandedSection(null)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  fontSize: 18,
                                  color: "#B0A8B5",
                                  cursor: "pointer",
                                  padding: "0 4px",
                                  lineHeight: 1,
                                }}
                              >
                                ×
                              </button>
                            </div>
                            {section.section_type === "workout" ? (
                              <WorkoutTracker section={section} isOwner={isOwnProfile} />
                            ) : (
                              <LifeSectionCard section={section} isOwner={isOwnProfile} onUpdated={fetchSections} />
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Add card */}
              {isOwnProfile && (
                <CreateSectionDialog
                  onCreated={fetchSections}
                  trigger={
                    <button
                      style={{
                        width: "100%",
                        height: 100,
                        border: "1px dashed #C9B8D8",
                        borderRadius: 8,
                        background: "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: 20,
                        color: "#C9B8D8",
                      }}
                    >
                      +
                    </button>
                  }
                />
              )}
            </div>
          )}
        </div>

        {/* ===== (7) TIPS & FAVORITES ===== */}
        {targetUserId && <TipsFavorites userId={targetUserId} isOwner={isOwnProfile} displayName={profile?.display_name} />}
      </main>
      <ScrollToTopButton />
      <BottomNav />
      <AvatarCropDialog
        file={cropFile}
        open={cropOpen}
        onOpenChange={setCropOpen}
        onCropped={handleCroppedUpload}
      />
    </div>
  );
};

export default ProfilePage;
