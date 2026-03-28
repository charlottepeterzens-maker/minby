import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { sendNotification } from "@/utils/notifications";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Smile, Sparkles, HeartHandshake } from "lucide-react";
import ReactionButton from "@/components/reactions/ReactionButton";
import type { LucideIcon } from "lucide-react";

interface ReactionDef {
  key: string;
  icon: LucideIcon;
  toast: string;
}

const REACTIONS: ReactionDef[] = [
  { key: "love", icon: Heart, toast: "Du skickade kärlek" },
  { key: "laugh", icon: Smile, toast: "Du skrattade" },
  { key: "sparkle", icon: Sparkles, toast: "Du tyckte det var magiskt" },
  { key: "thanks", icon: HeartHandshake, toast: "Du tackade" },
];

const REACTION_KEYS = REACTIONS.map((r) => r.key);

// Legacy emoji → new key mapping for backward compat
const LEGACY_MAP: Record<string, string> = {
  "❤️": "love",
  "🥂": "love",
  "😂": "laugh",
  "😮": "sparkle",
  "🙌": "thanks",
  "🤗": "love",
};

function normalizeKey(emoji: string): string {
  return LEGACY_MAP[emoji] || emoji;
}

interface ReactionRow {
  emoji: string;
  user_id: string;
}

interface ReactionCount {
  count: number;
  reacted: boolean;
}

interface Props {
  postId: string;
  readOnly?: boolean;
}

const PostReactions = ({ postId, readOnly }: Props) => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, ReactionCount>>({});
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [detailNames, setDetailNames] = useState<string[]>([]);
  const [rawData, setRawData] = useState<ReactionRow[]>([]);

  const fetchReactions = useCallback(async () => {
    const { data } = await supabase
      .from("post_reactions")
      .select("emoji, user_id")
      .eq("post_id", postId);

    if (data) {
      setRawData(data as ReactionRow[]);
      const map: Record<string, ReactionCount> = {};
      data.forEach((r: any) => {
        const key = normalizeKey(r.emoji);
        if (!REACTION_KEYS.includes(key)) return;
        if (!map[key]) map[key] = { count: 0, reacted: false };
        map[key].count++;
        if (r.user_id === user?.id) map[key].reacted = true;
      });
      setCounts(map);
    }
  }, [postId, user?.id]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  const toggleReaction = async (key: string) => {
    if (!user || readOnly) return;
    const existing = counts[key]?.reacted;
    if (existing) {
      await supabase
        .from("post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .eq("emoji", key);
    } else {
      await supabase.from("post_reactions").insert({
        post_id: postId,
        user_id: user.id,
        emoji: key,
      });
      const def = REACTIONS.find((r) => r.key === key);
      if (def) toast.success(def.toast);

      // Notify post owner
      try {
        const { data: post } = await supabase
          .from("life_posts")
          .select("user_id")
          .eq("id", postId)
          .single();

        if (post && post.user_id !== user.id) {
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("muted_users")
            .eq("user_id", post.user_id)
            .single();

          const mutedUsers = (ownerProfile?.muted_users as string[]) || [];
          if (!mutedUsers.includes(user.id)) {
            const { data: myProfile } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("user_id", user.id)
              .single();
            const name = myProfile?.display_name || "Någon";

            await sendNotification({
              recipientUserId: post.user_id,
              fromUserId: user.id,
              type: "life_reaction",
              referenceId: postId,
              message: `${name} reagerade på ditt inlägg.`,
            });
          }
        }
      } catch {
        // Best effort
      }
    }
    fetchReactions();
  };

  const showDetail = async (key: string) => {
    if (detailKey === key) {
      setDetailKey(null);
      return;
    }
    setDetailKey(key);
    const userIds = rawData
      .filter((r) => normalizeKey(r.emoji) === key)
      .map((r) => r.user_id);
    if (userIds.length === 0) {
      setDetailNames([]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);
    if (data)
      setDetailNames(
        data.map((p) => (p.user_id === user?.id ? "Du" : p.display_name || "Någon"))
      );
  };

  const totalCount = Object.values(counts).reduce((sum, r) => sum + r.count, 0);

  return (
    <div style={{ marginTop: 10, position: "relative" }}>
      <div className="flex items-center gap-1.5 flex-wrap">
        {REACTIONS.map(({ key, icon }) => {
          const r = counts[key];
          const count = r?.count || 0;
          const reacted = r?.reacted || false;
          return (
            <ReactionButton
              key={key}
              icon={icon}
              active={reacted}
              count={count}
              disabled={readOnly && count === 0}
              onClick={() => (readOnly ? showDetail(key) : toggleReaction(key))}
              onContextMenu={(e) => {
                e.preventDefault();
                showDetail(key);
              }}
            />
          );
        })}
      </div>

      {totalCount > 0 && !readOnly && (
        <p style={{ fontSize: 10, color: "hsl(var(--color-text-faint))", marginTop: 4 }}>
          {totalCount === 1 ? "Någon reagerade" : `${totalCount} personer har reagerat`}
        </p>
      )}

      <AnimatePresence>
        {detailKey && counts[detailKey]?.count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 bg-card border rounded-lg z-30 shadow-sm"
            style={{
              top: "calc(100% + 6px)",
              borderColor: "hsl(var(--color-surface-raised))",
              padding: "10px 14px",
              minWidth: 140,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              {(() => {
                const def = REACTIONS.find((r) => r.key === detailKey);
                if (!def) return null;
                const Icon = def.icon;
                return <Icon size={16} strokeWidth={1.8} style={{ stroke: "#3C2A4D" }} />;
              })()}
              <button
                onClick={() => setDetailKey(null)}
                className="text-[10px] bg-transparent border-none cursor-pointer"
                style={{ color: "hsl(var(--color-text-faint))" }}
              >
                ✕
              </button>
            </div>
            {detailNames.length === 0 ? (
              <p style={{ fontSize: 11, color: "hsl(var(--color-text-muted))" }}>Ingen ännu</p>
            ) : (
              detailNames.map((name, i) => (
                <p key={i} style={{ fontSize: 12, fontWeight: 500, color: "hsl(var(--color-text-primary))", marginBottom: 2 }}>
                  {name}
                </p>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PostReactions;
