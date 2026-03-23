import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Plus, Camera, Pencil, Check, X, GripVertical, UserPlus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

// Sortable wrapper for grid cards
const SortableGridCard = ({
  section,
  isOwner,
  isExpanded,
  onClick,
  onDeleted,
  onRenamed,
  index,
  reordering,
}: {
  section: LifeSection;
  isOwner: boolean;
  isExpanded: boolean;
  onClick: () => void;
  onDeleted?: () => void;
  onRenamed?: () => void;
  index: number;
  reordering: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : ("auto" as any),
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {reordering && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-1 right-1 z-10 w-6 h-6 rounded bg-background/80 flex items-center justify-center cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
      <SectionGridCard
        section={section}
        isOwner={isOwner}
        isExpanded={isExpanded}
        onClick={reordering ? () => {} : onClick}
        onDeleted={onDeleted}
        onRenamed={onRenamed}
        index={index}
      />
    </div>
  );
};

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
  const [reordering, setReordering] = useState(false);
  const [recentRefreshKey, setRecentRefreshKey] = useState(0);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notifHangoutId, setNotifHangoutId] = useState<string | null>(null);
  const { refresh: refreshUnread } = useUnreadNotifications();
  const [notifItems, setNotifItems] = useState<NotificationItem[]>([]);

  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

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

  const toggleSection = (sectionId: string) => {
    setExpandedSection((prev) => (prev === sectionId ? null : sectionId));
    setTimeout(() => {
      const el = document.getElementById(`section-${sectionId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const updated = [...sections];
    const [moved] = updated.splice(oldIndex, 1);
    updated.splice(newIndex, 0, moved);

    const withOrder = updated.map((s, i) => ({ ...s, sort_order: i }));
    setSections(withOrder);

    await Promise.all(
      withOrder.map((s) => supabase.from("life_sections").update({ sort_order: s.sort_order }).eq("id", s.id)),
    );
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: t("error"), description: uploadError.message, variant: "destructive" });
      setUploadingAvatar(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
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
      <nav className="sticky top-0 z-50 bg-background">
        <Container className="px-2 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <span className="font-display text-[20px] font-medium text-foreground">Mitt</span>
          </div>
          <div className="flex items-center gap-1">{targetUserId && <ProfileShareDialog userId={targetUserId} />}</div>
        </Container>
        <CurvedSeparator />
      </nav>

      <Container className="px-2 py-6 pb-24">
        {/* ===== (1) PROFILE HEADER ===== */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative shrink-0">
            <motion.div
              whileTap={isOwnProfile ? { scale: 0.92 } : undefined}
              className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: "#EDE8F4" }}
              onClick={isOwnProfile ? () => fileInputRef.current?.click() : undefined}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-display font-medium" style={{ color: "#3C2A4D" }}>
                  {initial}
                </span>
              )}
            </motion.div>
            {isOwnProfile && (
              <motion.button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                whileTap={{ scale: 0.85 }}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
              >
                <Camera className="w-3 h-3" />
              </motion.button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2">
              <h1 className="font-fraunces text-base font-medium text-foreground">
                {profile?.display_name || t("anonymous")}
              </h1>
              {!isOwnProfile && targetUserId && <FriendRequestButton targetUserId={targetUserId} />}
            </div>

            {/* Bio */}
            {isOwnProfile ? (
              <div className="mt-1">
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
                    style={{ color: "#7A6A85", wordBreak: "break-word" }}
                  >
                    {profile?.bio ? (
                      <span>{profile.bio}</span>
                    ) : (
                      <span className="not-italic">{t("addQuoteOrBio")}</span>
                    )}
                    <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
            ) : profile?.bio ? (
              <p className="mt-1 text-[13px]" style={{ color: "#7A6A85" }}>
                {profile.bio}
              </p>
            ) : null}
          </div>
        </div>

        {/* Notifications */}
        {isOwnProfile && notifItems.length > 0 && (
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
        )}

        {/* ===== (2) INVITE ROW ===== */}
        {isOwnProfile && (
          <div className="mb-5">
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
          <div className="mb-5">
            <HangoutAvailability
              userId={targetUserId}
              isOwner={isOwnProfile}
              openEntryId={notifHangoutId}
              onOpenedEntry={() => setNotifHangoutId(null)}
            />
          </div>
        )}

        {/* Section divider */}
        <div className="mb-4" style={{ borderTop: "1px solid #EDE8E0" }} />

        {/* ===== (5+6) MIN VARDAG BLOCK ===== */}
        <div
          className="mb-5"
          style={{
            background: "#F7F3EF",
            borderRadius: 8,
            padding: "14px 8px",
            overflow: "hidden",
          }}
        >
          {/* Block header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-fraunces font-normal text-[16px] mt-4 mb-3" style={{ color: "#2A1A3C" }}>
              Min vardag
            </h2>
          </div>

          {/* Quick post */}
          {isOwnProfile && (
            <div className="mb-3">
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

          {/* Recent 3 posts with fade */}
          <RecentPostsFeed
            sections={sections}
            refreshKey={recentRefreshKey}
            limit={showAllPosts ? 50 : 3}
            showFade={!showAllPosts}
          />

          {/* Section header */}
          <div className="flex items-center justify-between mt-4 mb-2">
            <span className="text-[10px] uppercase font-medium tracking-wider" style={{ color: "#B0A0B5" }}>
              Delar av min vardag
            </span>
            {isOwnProfile && (
              <CreateSectionDialog
                onCreated={fetchSections}
                trigger={
                  <button
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#EDE8F4" }}
                  >
                    <Plus className="w-3 h-3" style={{ color: "#3C2A4D" }} />
                  </button>
                }
              />
            )}
          </div>

          {/* Horizontal sections scroll */}
          {loading ? (
            <div className="text-center py-4 text-muted-foreground text-xs">{t("loading")}</div>
          ) : sections.length === 0 ? (
            <p className="text-[11px] text-center py-4" style={{ color: "#B0A0B5" }}>
              {isOwnProfile ? "Lägg till en del av din vardag" : t("nothingSharedYet")}
            </p>
          ) : (
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
              {sections.map((section, i) => {
                const colors = [
                  { bg: "#EDE8F4" },
                  { bg: "#EAF2E8" },
                  { bg: "#FCF0F3" },
                  { bg: "#EDE8F4" },
                  { bg: "#EAF2E8" },
                  { bg: "#FCF0F3" },
                ];
                const color = colors[i % colors.length];
                return (
                  <button
                    key={section.id}
                    onClick={() => toggleSection(section.id)}
                    className="shrink-0 flex flex-col items-center justify-center transition-all active:scale-[0.97]"
                    style={{
                      minWidth: 72,
                      height: 64,
                      borderRadius: 8,
                      background: expandedSection === section.id ? "#3C2A4D" : color.bg,
                      border: expandedSection === section.id ? "none" : "1px solid #EDE8E0",
                      cursor: "pointer",
                      marginRight: 0,
                    }}
                  >
                    <span
                      className="text-[9px] font-medium"
                      style={{ color: expandedSection === section.id ? "#F7F3EF" : "#2A1A3C" }}
                    >
                      {section.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Expanded section content */}
          <AnimatePresence mode="wait">
            {expandedSection && (
              <motion.div
                key={expandedSection}
                id={`section-${expandedSection}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden mt-2"
              >
                {(() => {
                  const sec = sections.find((s) => s.id === expandedSection);
                  if (!sec) return null;
                  if (sec.section_type === "workout") return <WorkoutTracker section={sec} isOwner={isOwnProfile} />;
                  return <LifeSectionCard section={sec} isOwner={isOwnProfile} onUpdated={fetchSections} />;
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* View all link */}
          <button
            onClick={() => setShowAllPosts(!showAllPosts)}
            className="w-full text-center mt-3"
            style={{
              fontSize: 11,
              color: "#7A6A85",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 10,
            }}
          >
            {showAllPosts ? "Visa färre" : "Visa alla inlägg →"}
          </button>
        </div>

        {/* Section divider */}
        <div className="mb-4" style={{ borderTop: "1px solid #EDE8E0" }} />

        {/* ===== (7) TIPS & FAVORITES ===== */}
        {targetUserId && <TipsFavorites userId={targetUserId} isOwner={isOwnProfile} />}
      </Container>
      <ScrollToTopButton />
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
