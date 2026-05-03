import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ImageLightbox from "@/components/ImageLightbox";
import { Heart, Check, ChevronRight, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import LazyImage from "@/components/LazyImage";
import { useAuth } from "@/contexts/AuthContext";
import { useSignedImageUrl } from "@/hooks/useSignedImageUrl";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { resolveAvatarUrl } from "@/utils/avatarUrl";
import HangoutDetailSheet from "@/components/profile/HangoutDetailSheet";
import { toast } from "sonner";
import { possessive } from "@/utils/possessive";
import { monthShort } from "@/utils/months";

export interface PersonData {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  initials: string;
  latestPost: {
    id: string;
    content: string | null;
    image_url: string | null;
    created_at: string;
    sectionName: string;
    photo_layout: string;
  } | null;
  recentPosts: {
    id: string;
    content: string | null;
    image_url: string | null;
    created_at: string;
    sectionName: string;
    photo_layout: string;
  }[];
  postCountLast7Days: number;
  activeHangout: {
    date: string;
    activities: string[];
    custom_note: string | null;
  } | null;
  latestTip: {
    title: string;
    created_at: string;
  } | null;
  lastActivityAt: string;
  isQuiet: boolean;
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 0 || diff > 180 * 86400000) return "";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "nu";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "igår";
  if (days <= 21) return `${days} dagar`;
  const weeks = Math.floor(days / 7);
  if (weeks <= 12) return `${weeks} veckor`;
  return "";
}

function formatDateSwedish(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "idag";
  if (diffDays === 1) return "igår";
  if (diffDays < 7) return `för ${diffDays} dagar sedan`;
  const weekdays = ["sön", "mån", "tis", "ons", "tor", "fre", "lör"];
  return `${weekdays[d.getDay()]} ${d.getDate()} ${monthShort(d)}`;
}

function formatHangoutDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const weekdays = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];
  return `${weekdays[d.getDay()]} ${d.getDate()} ${monthShort(d)}`;
}

const PostImage = ({ imageUrl, onClick }: { imageUrl: string; onClick?: (url: string) => void }) => {
  const signedUrl = useSignedImageUrl(imageUrl);
  if (!signedUrl) return null;
  return (
    <div
      className="relative w-full rounded-lg overflow-hidden"
      style={{ maxHeight: 120, cursor: onClick ? "pointer" : undefined }}
      onClick={() => onClick?.(signedUrl)}
    >
      <LazyImage src={signedUrl} alt="Inläggsbild" className="w-full h-full" style={{ maxHeight: 120 }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(transparent 40%, rgba(0,0,0,0.4))" }} />
    </div>
  );
};

const PersonAvatar = ({ person, onClick }: { person: PersonData; onClick?: () => void }) => {
  const resolved = resolveAvatarUrl(person.avatarUrl);
  const Wrapper: any = onClick ? "button" : "div";
  return (
    <Wrapper onClick={onClick} className="shrink-0">
      <Avatar className="w-10 h-10">
        {resolved && <AvatarImage src={resolved} alt={person.displayName} className="object-cover" />}
        <AvatarFallback
          style={{ backgroundColor: "hsl(206, 60%, 91%)", color: "#561828" }}
          className="text-[13px] font-medium"
        >
          {person.initials}
        </AvatarFallback>
      </Avatar>
    </Wrapper>
  );
};

const PersonBlock = ({ person, currentUserName }: { person: PersonData; currentUserName: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [thinkingSent, setThinkingSent] = useState(false);
  const [thinkingLoading, setThinkingLoading] = useState(false);
  const [hangoutSheetOpen, setHangoutSheetOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleThinkingOfYou = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || thinkingLoading) return;
    setThinkingLoading(true);
    try {
      await supabase.from("notifications").insert({
        user_id: person.userId,
        from_user_id: user.id,
        type: "thinking_of_you",
        title: `${currentUserName} tänker på dig`,
        body: `${currentUserName} tänker på dig`,
      });
      setThinkingSent(true);
      toast.success(`${person.displayName} vet att du tänker på hen`);
    } catch {
      toast.error("Något gick fel");
    } finally {
      setThinkingLoading(false);
    }
  };

  const preview = person.latestPost?.content?.slice(0, 80) || (person.activeHangout ? "Vill ses" : "");
  const timeStr = formatRelativeTime(person.lastActivityAt);

  const ThinkingButton = ({ size = "sm" }: { size?: "sm" | "md" }) => (
    <motion.button
      onClick={handleThinkingOfYou}
      disabled={thinkingLoading}
      whileTap={{ scale: 0.95 }}
      className="flex items-center"
      style={{
        gap: 4,
        fontSize: size === "md" ? 13 : 12,
        color: thinkingSent ? "hsl(var(--color-text-faint))" : "#C4522A",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
      }}
    >
      {thinkingSent ? <Check size={12} strokeWidth={1.5} /> : <Heart size={12} strokeWidth={1.5} />}
      {thinkingSent ? "Skickat" : "Skicka en tanke"}
    </motion.button>
  );

  return (
    <div>
      {/* Collapsed header */}
      {!expanded && (
        <div
          className="flex items-center cursor-pointer"
          style={{ padding: "13px 14px", gap: 12 }}
          onClick={() => setExpanded(true)}
        >
          <PersonAvatar person={person} onClick={() => navigate(`/profile/${person.userId}`)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="truncate"
                style={{ fontSize: 15, fontWeight: 500, color: "hsl(var(--color-text-primary))" }}
              >
                {person.displayName}
              </span>
              {timeStr && (
                <span className="shrink-0" style={{ fontSize: 11, color: "hsl(var(--color-text-faint))" }}>
                  {timeStr}
                </span>
              )}
            </div>
            {preview && (
              <p
                className="truncate mt-0.5"
                style={{ fontSize: 13, color: "hsl(var(--color-text-primary))" }}
              >
                {preview}
              </p>
            )}
            {person.isQuiet && (
              <div className="mt-1.5">
                <ThinkingButton />
              </div>
            )}
          </div>
          <ChevronRight size={14} style={{ color: "hsl(var(--color-text-faint))", flexShrink: 0 }} />
        </div>
      )}

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            {/* Sticky header */}
            <div
              className="flex items-center cursor-pointer"
              style={{
                position: "sticky",
                top: 0,
                zIndex: 5,
                backgroundColor: "hsl(var(--color-surface))",
                padding: "13px 14px",
                gap: 12,
              }}
              onClick={() => setExpanded(false)}
            >
              <PersonAvatar
                person={person}
                onClick={() => navigate(`/profile/${person.userId}`)}
              />
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span
                  className="truncate"
                  style={{ fontSize: 15, fontWeight: 500, color: "hsl(var(--color-text-primary))" }}
                >
                  {person.displayName}
                </span>
                {timeStr && (
                  <span style={{ fontSize: 11, color: "hsl(var(--color-text-faint))" }}>{timeStr}</span>
                )}
              </div>
              <ChevronDown size={14} style={{ color: "hsl(var(--color-text-faint))", flexShrink: 0 }} />
            </div>

            {/* Posts indented 52px */}
            <div style={{ paddingLeft: 52, paddingRight: 14, paddingBottom: 14 }}>
              {person.recentPosts.slice(0, 3).map((post, idx) => (
                <div
                  key={post.id}
                  style={{
                    paddingTop: idx === 0 ? 0 : 12,
                    marginTop: idx === 0 ? 0 : 12,
                    borderTop: idx === 0 ? "none" : "1px solid hsl(var(--color-border-subtle))",
                  }}
                >
                  {post.image_url && <PostImage imageUrl={post.image_url} onClick={setLightboxUrl} />}
                  {post.content && (
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 400,
                        color: "hsl(var(--color-text-primary))",
                        lineHeight: 1.6,
                        margin: post.image_url ? "8px 0 0" : 0,
                      }}
                    >
                      {post.content}
                    </p>
                  )}
                  <div className="flex items-center mt-1.5" style={{ gap: 6 }}>
                    <span style={{ fontSize: 11, color: "hsl(var(--color-text-faint))" }}>
                      {formatDateSwedish(post.created_at)}
                    </span>
                    {post.sectionName && (
                      <>
                        <span
                          style={{
                            width: 2,
                            height: 2,
                            borderRadius: "50%",
                            backgroundColor: "hsl(var(--color-border-subtle))",
                            display: "inline-block",
                          }}
                        />
                        <span style={{ fontSize: 11, color: "hsl(var(--color-text-faint))" }}>
                          {post.sectionName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* Footer */}
              <div
                className="flex items-center justify-between"
                style={{ marginTop: 14 }}
              >
                <ThinkingButton size="md" />
                <button
                  onClick={() => navigate(`/profile/${person.userId}`)}
                  style={{ fontSize: 12, color: "hsl(var(--color-text-faint))", background: "none", border: "none", cursor: "pointer" }}
                >
                  Se alla delar i {possessive(person.displayName)} vardag →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hangout inline card */}
      {person.activeHangout && (
        <div style={{ padding: "10px 14px" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <span style={{ fontSize: 11, color: "hsl(var(--color-text-secondary))" }}>
              {formatHangoutDate(person.activeHangout.date)}
            </span>
          </div>
          <p className="line-clamp-1 mb-2.5" style={{ fontSize: 13, color: "hsl(var(--color-text-primary))" }}>
            {person.activeHangout.custom_note || person.activeHangout.activities?.[0] || "Vill ses"}
          </p>
          {user?.id !== person.userId && (
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setHangoutSheetOpen(true); }}
                className="text-[12px] font-medium py-1.5 px-4 rounded-lg"
                style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
              >
                Jag kan
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setHangoutSheetOpen(true); }}
                className="text-[12px] font-medium py-1.5 px-4 rounded-lg"
                style={{ color: "hsl(var(--color-text-primary))" }}
              >
                Kanske
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tip signal */}
      {person.latestTip && !person.activeHangout &&
        Date.now() - new Date(person.latestTip.created_at).getTime() < 7 * 86400000 && (
        <button
          onClick={() => navigate(`/profile/${person.userId}`)}
          className="flex items-center gap-1.5 w-full text-left"
          style={{ padding: "8px 14px" }}
        >
          <span style={{ fontSize: 11, color: "hsl(var(--color-text-faint))" }}>tips ·</span>
          <span className="truncate" style={{ fontSize: 12, color: "hsl(var(--color-text-secondary))" }}>
            {person.latestTip.title.slice(0, 40)}
          </span>
        </button>
      )}

      {person.activeHangout && (
        <HangoutDetailSheet
          entry={{
            id: "",
            date: person.activeHangout.date,
            activities: person.activeHangout.activities,
            custom_note: person.activeHangout.custom_note,
            entry_type: "available",
            user_id: person.userId,
          }}
          open={hangoutSheetOpen}
          onOpenChange={setHangoutSheetOpen}
          isOwner={false}
        />
      )}
      <ImageLightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
};

export default PersonBlock;
