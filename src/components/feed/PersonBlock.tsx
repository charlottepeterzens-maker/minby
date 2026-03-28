import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronDown, Heart, Check, Calendar, Headphones } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import LazyImage from "@/components/LazyImage";
import { useAuth } from "@/contexts/AuthContext";
import { useSignedImageUrl } from "@/hooks/useSignedImageUrl";
import FeedAvatar from "@/components/feed/FeedAvatar";
import HangoutDetailSheet from "@/components/profile/HangoutDetailSheet";
import { toast } from "sonner";

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
  } | null;
  lastActivityAt: string;
  isQuiet: boolean;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "nu";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "igår";
  if (days > 21) return "Inte postat på länge";
  return `${days} dagar`;
}

function formatDateSwedish(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "idag";
  if (diffDays === 1) return "igår";
  if (diffDays < 7) return `för ${diffDays} dagar sedan`;
  const weekdays = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];
  const months = [
    "januari",
    "februari",
    "mars",
    "april",
    "maj",
    "juni",
    "juli",
    "augusti",
    "september",
    "oktober",
    "november",
    "december",
  ];
  return `${weekdays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function formatHangoutDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const weekdays = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];
  const months = [
    "januari",
    "februari",
    "mars",
    "april",
    "maj",
    "juni",
    "juli",
    "augusti",
    "september",
    "oktober",
    "november",
    "december",
  ];
  return `${weekdays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

const PostImage = ({ imageUrl }: { imageUrl: string }) => {
  const signedUrl = useSignedImageUrl(imageUrl);
  if (!signedUrl) return null;
  return (
    <div className="relative w-full rounded-lg overflow-hidden" style={{ maxHeight: 120 }}>
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

  return (
    <div
      style={{
        backgroundColor: "hsl(var(--color-surface-card))",
        border: expanded ? "1.5px solid #C9B8D8" : "none",
        borderRadius: 8,
        opacity: person.isQuiet && !expanded ? 0.7 : 1,
        transition: "all 0.2s ease",
      }}
    >
      {/* Collapsed header – always visible */}
      <div
        className="w-full flex items-center gap-3 text-left"
        style={{ padding: "12px 14px" }}
      >
        <FeedAvatar
          avatarUrl={person.avatarUrl}
          displayName={person.displayName}
          initials={person.initials}
          size="w-9 h-9"
          onClick={() => navigate(`/profile/${person.userId}`)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/profile/${person.userId}`)}
              className="font-medium text-[13px] hover:underline"
              style={{ color: "hsl(var(--color-text-primary))", fontFamily: "Lexend" }}
            >
              {person.displayName}
            </button>
            <span className="text-[10px]" style={{ color: "hsl(var(--color-text-faint))" }}>
              {formatRelativeTime(person.lastActivityAt)}
            </span>
          </div>
          {preview && (
            <p
              className="text-[11px] truncate mt-0.5 cursor-pointer"
              style={{ color: "hsl(var(--color-text-secondary))" }}
              onClick={() => setExpanded(!expanded)}
            >
              {preview}
            </p>
          )}
        </div>
        <button onClick={() => setExpanded(!expanded)} className="shrink-0 p-1">
          {expanded ? (
            <ChevronDown size={16} style={{ color: "hsl(var(--color-text-faint))" }} />
          ) : (
            <ChevronRight size={16} style={{ color: "hsl(var(--color-text-faint))" }} />
          )}
        </button>
      </div>

      {/* Thinking of you button for quiet persons */}
      {person.isQuiet && !expanded && (
        <div style={{ padding: "0 14px 10px" }}>
          <motion.button
            onClick={handleThinkingOfYou}
            disabled={thinkingLoading}
            whileTap={{ scale: 0.93 }}
            animate={thinkingSent ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-1.5"
            style={{
              backgroundColor: thinkingSent ? "#EAF2E8" : "#EDE8F4",
              borderRadius: 99,
              padding: "5px 12px",
              fontSize: 10,
              fontWeight: 500,
              color: thinkingSent ? "#1F4A1A" : "#3C2A4D",
              transition: "background-color 0.2s ease",
            }}
          >
            {thinkingSent ? <Check size={10} /> : <Heart size={10} />}
            {thinkingSent ? "Skickat" : "Jag tänker på dig"}
          </motion.button>
        </div>
      )}

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
                    {post.image_url && <PostImage imageUrl={post.image_url} />}
                    {post.content && (
                      <p className="text-[13px] mt-1" style={{ color: "hsl(var(--color-text-primary))" }}>
                        {post.content}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px]" style={{ color: "hsl(var(--color-text-faint))" }}>
                        {formatDateSwedish(post.created_at)}
                      </span>
                      {post.sectionName && (
                        <span
                          className="text-[8px] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "hsl(var(--color-surface-raised))", color: "hsl(var(--color-text-primary))" }}
                        >
                          {post.sectionName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Thinking of you in expanded for quiet */}
              {person.isQuiet && (
                <div className="mt-3">
                  <motion.button
                    onClick={handleThinkingOfYou}
                    disabled={thinkingLoading}
                    whileTap={{ scale: 0.93 }}
                    animate={thinkingSent ? { scale: [1, 1.08, 1] } : {}}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-1.5"
                    style={{
                      backgroundColor: thinkingSent ? "#EAF2E8" : "#EDE8F4",
                      borderRadius: 99,
                      padding: "5px 12px",
                      fontSize: 10,
                      fontWeight: 500,
                      color: thinkingSent ? "#1F4A1A" : "#3C2A4D",
                      transition: "background-color 0.2s ease",
                    }}
                  >
                    {thinkingSent ? <Check size={10} /> : <Heart size={10} />}
                    {thinkingSent ? "Skickat" : "Jag tänker på dig"}
                  </motion.button>
                </div>
              )}

              {/* View profile link */}
              <button
                onClick={() => navigate(`/profile/${person.userId}`)}
                className="mt-3 text-[11px]"
                style={{ color: "hsl(var(--color-text-secondary))" }}
              >
                Se alla delar i {person.displayName}s vardag →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hangout inline card */}
      {person.activeHangout && (
        <div style={{ borderTop: "1px solid hsl(var(--color-border-subtle))", padding: "10px 14px" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar size={11} style={{ color: "hsl(var(--color-text-secondary))" }} />
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
          </p>
          {user?.id !== person.userId && (
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setHangoutSheetOpen(true); }}
                className="text-[12px] font-medium py-1.5 px-4 rounded-full"
                style={{ backgroundColor: "hsl(var(--color-text-primary))", color: "#FFFFFF" }}
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

      {/* Tip signal */}
      {person.latestTip && !person.activeHangout && (
        <div
          className="flex items-center gap-1"
          style={{ borderTop: "1px solid hsl(var(--color-border-subtle))", padding: "8px 14px", fontSize: 10, color: "hsl(var(--color-text-secondary))" }}
        >
          <Heart size={10} />
          {person.latestTip.title.slice(0, 30)}
        </div>
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
    </div>
  );
};

export default PersonBlock;
