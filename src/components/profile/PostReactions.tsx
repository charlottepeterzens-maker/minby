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
  const [showPicker, setShowPicker] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  const fetchReactions = useCallback(async () => {
    const { data } = await supabase
      .from("post_reactions")
      .select("emoji, user_id")
      .eq("post_id", postId);

    if (data) {
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

  // Trigger entrance animation once
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

  if (reactions.length === 0 && readOnly) return null;

  return (
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
            "text-[10px] px-1.5 py-0.5 rounded-full border inline-flex items-center gap-0.5",
            readOnly
              ? "bg-muted/50 border-border/50 text-muted-foreground cursor-default"
              : r.reacted
                ? "bg-primary/10 border-primary/30 text-primary cursor-pointer"
                : "bg-muted/50 border-border/50 text-muted-foreground hover:border-primary/30 cursor-pointer"
          )}
          role={readOnly ? undefined : "button"}
          onClick={readOnly ? undefined : () => toggleReaction(r.emoji)}
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </motion.span>
      ))}
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
  );
};

export default PostReactions;
