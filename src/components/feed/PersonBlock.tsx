import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ImageLightbox from "@/components/ImageLightbox";
import { Heart, Check, ChevronRight, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import LazyImage from "@/components/LazyImage";
import { useAuth } from "@/contexts/AuthContext";
import { useSignedImageUrl } from "@/hooks/useSignedImageUrl";
import FeedAvatar from "@/components/feed/FeedAvatar";
import HangoutDetailSheet from "@/components/profile/HangoutDetailSheet";
import { toast } from "sonner";
import { possessive } from "@/utils/possessive";
import { MONTHS_SHORT, monthShort } from "@/utils/months";

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
  if (diff < 0 || diff > 180 * 86400000) return ""; // future or >6 months
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
      const pronoun = "hen";
      toast.success(`${person.displayName} vet att du tänker på ${pronoun}`);
    } catch {
      toast.error("Något gick fel");
    } finally {
      setThinkingLoading(false);
    }
  };

  const preview = person.latestPost?.content?.slice(0, 80) || (person.activeHangout ? "Vill ses" : "");

  const timeStr = formatRelativeTime(person.lastActivityAt);

  return (
    <div
      style={{
        opacity: person.isQuiet && !expanded ? 0.65 : 1,
        transition: "opacity 0.2s ease",
      }}
    >
      {/* Collapsed header – tap anywhere to expand */}
      <div
        className="flex items-center gap-[14px] cursor-pointer"
        style={{ padding: "13px 14px" }}
        onClick={() => setExpanded(!expanded)}
      >
        <FeedAvatar
          avatarUrl={person.avatarUrl}
          displayName={person.displayName}
          initials={person.initials}
          size="w-9 h-9"
          onClick={() => navigate(`/profile/${person.userId}`)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[13px] font-medium truncate" style={{ color: "hsl(var(--color-text-primary))" }}>{person.displayName}</span>
            {timeStr && (
              <span className="text-[12px] shrink-0" style={{ color: "hsl(var(--color-text-faint))" }}>{timeStr}</span>
            )}
          </div>
          {preview && (
            <p className="text-[13px] truncate mt-0.5" style={{ color: "hsl(var(--color-text-secondary))" }}>
              {preview}
            </p>
          )}
          {person.isQuiet && !expanded && (
            <motion.button
              onClick={(e) => { e.stopPropagation(); handleThinkingOfYou(e); }}
              disabled={thinkingLoading}
              whileTap={{ scale: 0.95 }}
              className="mt-1.5 flex items-center gap-1"
              style={{ fontSize: 12, color: thinkingSent ? "hsl(var(--color-text-faint))" : "hsl(var(--accent))", background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              {thinkingSent ? <Check size={10} /> : <Heart size={10} />}
              {thinkingSent ? "Skickat" : "Skicka en tanke"}
            </motion.button>
          )}
        </div>
        {expanded
          ? <ChevronDown size={14} style={{ color: "hsl(var(--color-text-faint))", flexShrink: 0 }} />
          : <ChevronRight size={14} style={{ color: "hsl(var(--color-text-faint))", flexShrink: 0 }} />
        }
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 14px 14px" }}>
              {/* Recent posts */}
              <div className="space-y-0">
                {person.recentPosts.slice(0, 3).map((post, idx) => (
                  <div key={post.id}>
                    {idx > 0 && (
                      <div className="my-2.5" style={{ borderTop: "1px solid hsl(var(--color-border-subtle))" }} />
                    )}
                    {post.image_url && <PostImage imageUrl={post.image_url} onClick={setLightboxUrl} />}
                    {post.content && (
                      <p className="text-[13px] mt-1" style={{ color: "hsl(var(--color-text-primary))" }}>
                        {post.content}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[12px]" style={{ color: "hsl(var(--color-text-faint))" }}>
                        {formatDateSwedish(post.created_at)}
                      </span>
                      {post.sectionName && (
                        <span style={{ fontSize: 12, color: "hsl(var(--color-text-faint))" }}>
                          · {post.sectionName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {person.isQuiet && (
                <motion.button
                  onClick={handleThinkingOfYou}
                  disabled={thinkingLoading}
                  whileTap={{ scale: 0.95 }}
                  className="mt-3 flex items-center gap-1"
                  style={{ fontSize: 12, color: thinkingSent ? "hsl(var(--color-text-faint))" : "hsl(var(--accent))", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >
                  {thinkingSent ? <Check size={10} /> : <Heart size={10} />}
                  {thinkingSent ? "Skickat" : "Skicka en tanke"}
                </motion.button>
              )}

              {/* View profile link */}
              <button
                onClick={() => navigate(`/profile/${person.userId}`)}
                className="mt-3 text-[12px]"
                style={{ color: "hsl(var(--color-text-secondary))" }}
              >
                Se alla delar i {possessive(person.displayName)} vardag →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hangout inline card */}
      {person.activeHangout && (
        <div style={{ borderTop: "none", padding: "10px 14px" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[11px]" style={{ color: "hsl(var(--color-text-secondary))" }}>
              {formatHangoutDate(person.activeHangout.date)}
            </span>
          </div>
          <p className="text-[13px] line-clamp-1 mb-2.5" style={{ color: "hsl(var(--color-text-primary))" }}>
            {(() => {
              const note = person.activeHangout.custom_note || null;
              const activity = person.activeHangout.activities?.[0] || null;
              const similar = note && activity &&
                (note.toLowerCase().includes(activity.toLowerCase()) ||
                 activity.toLowerCase().includes(note.toLowerCase()));
              return note || activity || "Vill ses";
            })()}
          </p>
          {user?.id !== person.userId && (
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setHangoutSheetOpen(true); }}
                className="text-[12px] font-medium py-1.5 px-4 rounded-full"
                style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
              >
                Jag kan
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setHangoutSheetOpen(true); }}
                className="text-[12px] font-medium py-1.5 px-4 rounded-full"
                style={{ color: "hsl(var(--color-text-primary))" }}
              >
                Kanske
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tip signal – only show tips from last 7 days */}
      {person.latestTip && !person.activeHangout &&
        Date.now() - new Date(person.latestTip.created_at).getTime() < 7 * 86400000 && (
        <button
          onClick={() => navigate(`/profile/${person.userId}`)}
          className="flex items-center gap-1.5 w-full text-left"
          style={{ borderTop: "none", padding: "8px 14px" }}
        >
          <span style={{ fontSize: 12, color: "hsl(var(--color-text-faint))" }}>tips ·</span>
          <span className="text-[12px] truncate" style={{ color: "hsl(var(--color-text-secondary))" }}>
            {person.latestTip.title.slice(0, 40)}
          </span>
        </button>
      )}

      {/* Hangout detail sheet */}
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
