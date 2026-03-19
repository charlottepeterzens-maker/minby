import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { sendNotification } from "@/utils/notifications";

const REACTION_EMOJIS = ["❤️", "🥂", "😮", "🙌"];

const REACTION_TOASTS: Record<string, string> = {
  "❤️": "Kärlek skickad",
  "🥂": "Du firade tillsammans",
  "🙌": "Du hejade",
  "😮": "Du berördes",
  "🤗": "Du skickade en kram",
};

interface ReactionRow {
  emoji: string;
  user_id: string;
}

interface ReactionCount {
  emoji: string;
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
  const [detailEmoji, setDetailEmoji] = useState<string | null>(null);
  const [detailNames, setDetailNames] = useState<string[]>([]);
  const [rawData, setRawData] = useState<ReactionRow[]>([]);

  const fetchReactions = useCallback(async () => {
    const { data } = await supabase.from("post_reactions").select("emoji, user_id").eq("post_id", postId);

    if (data) {
      setRawData(data as ReactionRow[]);
      const map: Record<string, ReactionCount> = {};
      data.forEach((r: any) => {
        if (!map[r.emoji]) map[r.emoji] = { emoji: r.emoji, count: 0, reacted: false };
        map[r.emoji].count++;
        if (r.user_id === user?.id) map[r.emoji].reacted = true;
      });
      setCounts(map);
    }
  }, [postId, user?.id]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  const toggleReaction = async (emoji: string) => {
    if (!user || readOnly) return;
    const existing = counts[emoji]?.reacted;
    if (existing) {
      await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", user.id).eq("emoji", emoji);
    } else {
      await supabase.from("post_reactions").insert({
        post_id: postId,
        user_id: user.id,
        emoji,
      });
      const msg = REACTION_TOASTS[emoji];
      if (msg) toast.success(msg);

      // Trigger 3: Send push to post owner (if not self)
      try {
        const { data: post } = await supabase
          .from("life_posts")
          .select("user_id")
          .eq("id", postId)
          .single();

        if (post && post.user_id !== user.id) {
          // Check if post owner has muted the reactor
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
              message: `${name} reagerade – de skickade ${emoji} på ditt inlägg.`,
            });
          }
        }
      } catch {
        // Best effort
      }
    }
    fetchReactions();
  };

  const showDetail = async (emoji: string) => {
    if (detailEmoji === emoji) {
      setDetailEmoji(null);
      return;
    }
    setDetailEmoji(emoji);
    const userIds = rawData.filter((r) => r.emoji === emoji).map((r) => r.user_id);
    if (userIds.length === 0) {
      setDetailNames([]);
      return;
    }
    const { data } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
    if (data) setDetailNames(data.map((p) => (p.user_id === user?.id ? "Du" : p.display_name || "Nagon")));
  };

  const totalCount = Object.values(counts).reduce((sum, r) => sum + r.count, 0);

  return (
    <div style={{ marginTop: 10, position: "relative" }}>
      {/* Emoji pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {REACTION_EMOJIS.map((emoji) => {
          const r = counts[emoji];
          const count = r?.count || 0;
          const reacted = r?.reacted || false;
          return (
            <button
              key={emoji}
              onClick={() => (readOnly ? showDetail(emoji) : toggleReaction(emoji))}
              onContextMenu={(e) => {
                e.preventDefault();
                showDetail(emoji);
              }}
              disabled={readOnly && count === 0}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: count > 0 ? "4px 10px" : "4px 8px",
                borderRadius: 99,
                border: reacted ? "1px solid #C9B8D8" : "1px solid #EDE8E0",
                background: reacted ? "#EDE8F4" : "#F7F3EF",
                cursor: readOnly && count === 0 ? "default" : "pointer",
                fontSize: 13,
                fontWeight: reacted ? 500 : 400,
                color: reacted ? "#3C2A4D" : "#9B8BA5",
                opacity: readOnly && count === 0 ? 0.4 : 1,
                transition: "all 0.15s ease",
              }}
            >
              <span>{emoji}</span>
              {count > 0 && <span style={{ fontSize: 11, fontWeight: 500 }}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Activity micro-signal */}
      {totalCount > 0 && !readOnly && (
        <p style={{ fontSize: 10, color: "#B0A8B5", marginTop: 4 }}>
          {totalCount === 1 ? "Någon reagerade" : `${totalCount} personer har reagerat`}
        </p>
      )}

      {/* Detail popup */}
      {detailEmoji && counts[detailEmoji]?.count > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "calc(100% + 6px)",
            background: "#fff",
            border: "1px solid #EDE8F4",
            borderRadius: 10,
            padding: "10px 14px",
            zIndex: 30,
            minWidth: 140,
            boxShadow: "0 4px 16px rgba(60,42,77,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 16 }}>{detailEmoji}</span>
            <button
              onClick={() => setDetailEmoji(null)}
              style={{ fontSize: 10, color: "#B0A0B5", background: "none", border: "none", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
          {detailNames.length === 0 ? (
            <p style={{ fontSize: 11, color: "#9B8BA5" }}>Ingen ännu</p>
          ) : (
            detailNames.map((name, i) => (
              <p key={i} style={{ fontSize: 12, fontWeight: 500, color: "#3C2A4D", marginBottom: 2 }}>
                {name}
              </p>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PostReactions;
