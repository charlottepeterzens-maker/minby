import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Plus, Lock, Camera, Pencil, Check, X, GripVertical, Heart } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import CurvedSeparator from "@/components/CurvedSeparator";
import LifeSectionCard from "@/components/profile/LifeSectionCard";
import SectionGridCard from "@/components/profile/SectionGridCard";
import CreateSectionDialog from "@/components/profile/CreateSectionDialog";

import WorkoutTracker from "@/components/profile/WorkoutTracker";
import HangoutAvailability from "@/components/profile/HangoutAvailability";
import ProfileShareDialog from "@/components/profile/ProfileShareDialog";
import TipsFavorites from "@/components/profile/TipsFavorites";
import FriendRequestButton from "@/components/profile/FriendRequestButton";

import InviteFriendDialog from "@/components/profile/InviteFriendDialog";
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
    zIndex: isDragging ? 50 : "auto" as any,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;




  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
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
    if (data) setSections((data as LifeSection[]).filter(s => s.section_type !== "period"));
    setLoading(false);
  }, [targetUserId]);

  useEffect(() => {
    fetchProfile();
    fetchSections();
  }, [fetchProfile, fetchSections]);

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

    // Update sort_order
    const withOrder = updated.map((s, i) => ({ ...s, sort_order: i }));
    setSections(withOrder);

    // Persist
    await Promise.all(
      withOrder.map((s) =>
        supabase.from("life_sections").update({ sort_order: s.sort_order }).eq("id", s.id)
      )
    );
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
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
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-150">
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <span className="font-display text-[20px] font-medium text-foreground">{t("profileTitle")}</span>
          </div>
          <div className="flex items-center gap-1">
            {targetUserId && <ProfileShareDialog userId={targetUserId} />}
          </div>
        </div>
        <CurvedSeparator />
      </nav>

      <main className="max-w-2xl mx-auto px-5 py-6 pb-24">
        {/* Profile header with avatar */}
        <div className="flex items-start gap-4 mb-8">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#EDE8F4' }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-display font-medium" style={{ color: '#3C2A4D' }}>{initial}</span>
              )}
            </div>
            {isOwnProfile && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-colors duration-150 disabled:opacity-50"
              >
                <Camera className="w-3 h-3" />
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

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-base font-medium text-foreground">
                {profile?.display_name || t("anonymous")}
              </h1>
              {!isOwnProfile && targetUserId && (
                <FriendRequestButton targetUserId={targetUserId} />
              )}
            </div>

            {/* Bio / Quote */}
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
                    <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8" onClick={() => { setEditingBio(false); setBioText(profile?.bio || ""); }}>
                      <X className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingBio(true)}
                    className="group flex items-start gap-1.5 text-[13px] hover:text-foreground transition-colors w-full text-left"
                    style={{ color: '#7A6A85', wordBreak: "break-word" }}
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
              <p className="mt-1 text-[13px]" style={{ color: '#7A6A85' }}>{profile.bio}</p>
            ) : null}
          </div>
        </div>

        {/* Invite friend */}
        {isOwnProfile && (
          <div className="mb-6 flex justify-start">
            <InviteFriendDialog />
          </div>
        )}

        {/* Health coming soon placeholder */}
        <div className="mb-6 flex items-center gap-3 rounded-[16px] border-[0.5px] border-[#EDE8F4] bg-[#FFFFFF] p-3">
          <div className="shrink-0 flex items-center justify-center rounded-full" style={{ width: 36, height: 36, backgroundColor: '#FCF0F3' }}>
            <Heart className="w-4 h-4" style={{ color: '#993556' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium" style={{ color: '#3C2A4D' }}>Hälsa</p>
            <p className="text-[11px]" style={{ color: '#7A6A85' }}>Menscykel, graviditet och mer – kommer snart</p>
          </div>
          <Lock className="w-4 h-4 shrink-0" style={{ color: '#C9B8D8' }} />
        </div>

        {/* Hangout Availability */}
        {targetUserId && (
          <div className="mb-6">
            <HangoutAvailability userId={targetUserId} isOwner={isOwnProfile} />
          </div>
        )}


        {/* Life sections as thumbnail grid */}
        <div className="mb-4">
          <h2 className="text-xs font-medium text-muted-foreground font-body">
            Min vardag
          </h2>
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map((s) => s.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {sections.map((section, i) => (
                  <div key={section.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <SortableGridCard
                      section={section}
                      isOwner={isOwnProfile}
                      isExpanded={expandedSection === section.id}
                      onClick={() => toggleSection(section.id)}
                      onDeleted={fetchSections}
                      onRenamed={fetchSections}
                      index={i}
                      reordering={reordering}
                    />
                  </div>
                ))}
                {/* Add card */}
                {isOwnProfile && (
                  <CreateSectionDialog onCreated={fetchSections} trigger={
                    <button className="w-full flex items-center gap-2.5 rounded-[16px] border-[0.5px] border-dashed border-border p-2.5 text-left text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                      <div className="shrink-0 flex items-center justify-center rounded-[7px] border-[0.5px] border-dashed border-current" style={{ width: 26, height: 26 }}>
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[12px] font-medium">Lägg till</span>
                    </button>
                  } />
                )}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Tips & Favorites */}
        {targetUserId && (
          <TipsFavorites userId={targetUserId} isOwner={isOwnProfile} />
        )}
      </main>
      <ScrollToTopButton />
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
