import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const REACTION_EMOJIS = ["❤️", "🥂", "😮", "🙌"];

const REACTION_TOASTS: Record<string, string> = {
  "❤️": "Du skickade kärlek",
  "🥂": "Du firade med dem",
  "🙌": "Du hejade på dem",
  "😮": "Du blev berörd",
  "🤗": "Du skickade en kram",
};

interface ReactionRow {
  emoji: string;
  user_id: string;
}

interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface Props {
  postId: string;
  readOnly?: boolean;
  showLabel?: boolean;
}

const PostReactions = ({ postId, readOnly, showLabel }: Props) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [rawData, setRawData] = useState<ReactionRow[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [detailEmoji, setDetailEmoji] = useState<string | null>(null);
  const [detailNames, setDetailNames] = useState<string[]>([]);
  const [loadingNames, setLoadingNames] = useState(false);

  const fetchReactions = useCallback(async () => {
    const { data } = await supabase
      .from("post_reactions")
      .select("emoji, user_id")
      .eq("post_id", postId);

    if (data) {
      setRawData(data as ReactionRow[]);
      const emojiMap: Record<string, { count: number; reacted: boolean }> = {};
      data.forEach((r: any) => {
        if (!emojiMap[r.emoji]) emojiMap[r.emoji] = { count: 0, reacted: false };
        emojiMap[r.emoji].count++;
        if (r.user_id === user?.id) emojiMap[r.emoji].reacted = true;
      });
      setReactions(
        Object.entries(emojiMap).map(([emoji, v]) => ({ emoji, ...v }))
      );
    }
  }, [postId, user?.id]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  useEffect(() => {
    if (!hasAnimated) {
      const timer = setTimeout(() => setHasAnimated(true), 800);
      return () => clearTimeout(timer);
    }
  }, [hasAnimated]);

  const toggleReaction = async (emoji: string) => {
    if (!user || readOnly) return;
    const existing = reactions.find((r) => r.emoji === emoji && r.reacted);
    if (existing) {
      await supabase
        .from("post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .eq("emoji", emoji);
    } else {
      await supabase.from("post_reactions").insert({
        post_id: postId,
        user_id: user.id,
        emoji,
      });
      const toastMsg = REACTION_TOASTS[emoji];
      if (toastMsg) toast.success(toastMsg);
    }
    setShowPicker(false);
    fetchReactions();
  };

  const showDetail = async (emoji: string) => {
    if (detailEmoji === emoji) {
      setDetailEmoji(null);
      return;
    }

    setDetailEmoji(emoji);
    setLoadingNames(true);

    const userIds = rawData
      .filter((r) => r.emoji === emoji)
      .map((r) => r.user_id);

    if (userIds.length === 0) {
      setDetailNames([]);
      setLoadingNames(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    if (data) {
      setDetailNames(
        data.map((p) =>
          p.user_id === user?.id ? "Du" : (p.display_name || "Någon")
        )
      );
    }
    setLoadingNames(false);
  };

  if (reactions.length === 0 && readOnly) return null;

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        {showLabel && !readOnly && (
          <span className="text-[10px] mr-0.5" style={{ color: "#B0A8B5" }}>
            Reagera
          </span>
        )}
        {reactions.map((r) => (
          <motion.span
            key={r.emoji}
            initial={!hasAnimated ? { scale: 1 } : false}
            animate={!hasAnimated ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full border inline-flex items-center gap-0.5 select-none",
              readOnly
                ? "bg-muted/50 border-border/50 text-muted-foreground cursor-pointer"
                : r.reacted
                  ? "bg-primary/10 border-primary/30 text-primary cursor-pointer"
                  : "bg-muted/50 border-border/50 text-muted-foreground hover:border-primary/30 cursor-pointer"
            )}
            role="button"
            onClick={() => {
              if (readOnly) {
                showDetail(r.emoji);
              } else {
                toggleReaction(r.emoji);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              showDetail(r.emoji);
            }}
          >
            <span>{r.emoji}</span>
            <span>{r.count}</span>
          </motion.span>
        ))}

        {/* Long-press / tap detail for non-readOnly: show on any pill tap-hold */}
        {!readOnly && reactions.length > 0 && (
          <button
            onClick={() => {
              const first = reactions[0]?.emoji;
              if (first) showDetail(detailEmoji ? (detailEmoji === first ? first : first) : first);
            }}
            className="text-[10px] px-1 text-muted-foreground hover:underline"
            style={{ color: "#B0A8B5" }}
          >
            {detailEmoji ? "×" : "?"}
          </button>
        )}

        {!readOnly && (
          <div className="relative">
            <motion.button
              onClick={() => setShowPicker(!showPicker)}
              whileTap={{ scale: 0.9 }}
              className="text-[10px] px-1.5 py-0.5 rounded-full border border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              +
            </motion.button>
            <AnimatePresence>
              {showPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute bottom-full left-0 mb-1 z-20 bg-popover border border-border rounded-md shadow-elevated px-1 py-0.5 flex gap-0.5"
                >
                  {REACTION_EMOJIS.map((emoji) => (
                    <motion.button
                      key={emoji}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => toggleReaction(emoji)}
                      className="text-sm p-1 hover:bg-accent rounded transition-colors"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Detail popup showing who reacted */}
      <AnimatePresence>
        {detailEmoji && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 z-30 mt-1"
          >
            <div
              className="px-3 py-2 rounded-[10px] shadow-lg max-w-[200px]"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #EDE8F4",
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-sm">{detailEmoji}</span>
                <button
                  onClick={() => setDetailEmoji(null)}
                  className="ml-auto text-[10px]"
                  style={{ color: "#B0A8B5" }}
                >
                  ✕
                </button>
              </div>
              {loadingNames ? (
                <p className="text-[11px]" style={{ color: "#7A6A85" }}>...</p>
              ) : detailNames.length === 0 ? (
                <p className="text-[11px]" style={{ color: "#7A6A85" }}>Ingen ännu</p>
              ) : (
                <div className="space-y-0.5">
                  {detailNames.map((name, i) => (
                    <p key={i} className="text-[11px] font-medium" style={{ color: "#3C2A4D" }}>
                      {name}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PostReactions;
