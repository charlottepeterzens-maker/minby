import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { sendNotification } from "@/utils/notifications";

import LoveActive from "@/love_active.svg?react";
import LoveInactive from "@/love_inactive.svg?react";
import LolActive from "@/lol_active.svg?react";
import LolInactive from "@/lol_inactive.svg?react";
import SparkleActive from "@/sparkle_active.svg?react";
import SparkleInactive from "@/sparkle_inactive.svg?react";
import PrayActive from "@/pray_active.svg?react";
import PrayInactive from "@/pray_inactive.svg?react";

interface ReactionDef {
  key: string;
  ActiveIcon: React.FC<React.SVGProps<SVGSVGElement>>;
  InactiveIcon: React.FC<React.SVGProps<SVGSVGElement>>;
  toastMsg: string;
}

const REACTIONS: ReactionDef[] = [
  { key: "love", ActiveIcon: LoveActive, InactiveIcon: LoveInactive, toastMsg: "Kärlek skickad" },
  { key: "lol", ActiveIcon: LolActive, InactiveIcon: LolInactive, toastMsg: "Du skrattade" },
  { key: "sparkle", ActiveIcon: SparkleActive, InactiveIcon: SparkleInactive, toastMsg: "Du hejade" },
  { key: "pray", ActiveIcon: PrayActive, InactiveIcon: PrayInactive, toastMsg: "Du skickade en tanke" },
];

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

  const toggleReaction = async (key: string, toastMsg: string) => {
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
      toast.success(toastMsg);

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
    const userIds = rawData.filter((r) => r.emoji === key).map((r) => r.user_id);
    if (userIds.length === 0) {
      setDetailNames([]);
      return;
    }
    const { data } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
    if (data) setDetailNames(data.map((p) => (p.user_id === user?.id ? "Du" : p.display_name || "Någon")));
  };

  const totalCount = Object.values(counts).reduce((sum, r) => sum + r.count, 0);

  return (
    <div style={{ marginTop: 10, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {REACTIONS.map(({ key, ActiveIcon, InactiveIcon, toastMsg }) => {
          const r = counts[key];
          const count = r?.count || 0;
          const reacted = r?.reacted || false;
          const Icon = reacted ? ActiveIcon : InactiveIcon;

          return (
            <button
              key={key}
              onClick={() => (readOnly ? showDetail(key) : toggleReaction(key, toastMsg))}
              onContextMenu={(e) => {
                e.preventDefault();
                showDetail(key);
              }}
              disabled={readOnly && count === 0}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: count > 0 ? "4px 10px" : "4px 8px",
                borderRadius: 99,
                border: reacted ? "1px solid hsl(var(--accent))" : "1px solid hsl(var(--border))",
                background: reacted ? "hsl(var(--accent))" : "hsl(var(--muted))",
                cursor: readOnly && count === 0 ? "default" : "pointer",
                fontSize: 13,
                fontWeight: reacted ? 500 : 400,
                color: reacted ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                opacity: readOnly && count === 0 ? 0.4 : 1,
                transition: "all 0.15s ease",
              }}
            >
              <Icon style={{ width: 18, height: 18 }} />
              {count > 0 && (
                <span style={{ fontSize: 11, fontWeight: 500 }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {totalCount > 0 && !readOnly && (
        <p style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>
          {totalCount === 1 ? "Någon reagerade" : `${totalCount} personer har reagerat`}
        </p>
      )}

      {detailKey && counts[detailKey]?.count > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "calc(100% + 6px)",
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 10,
            padding: "10px 14px",
            zIndex: 30,
            minWidth: 140,
            boxShadow: "0 4px 16px rgba(60,42,77,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            {(() => {
              const def = REACTIONS.find((r) => r.key === detailKey);
              if (!def) return null;
              const Icon = def.ActiveIcon;
              return <Icon style={{ width: 20, height: 20 }} />;
            })()}
            <button
              onClick={() => setDetailKey(null)}
              style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", background: "none", border: "none", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
          {detailNames.length === 0 ? (
            <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Ingen ännu</p>
          ) : (
            detailNames.map((name, i) => (
              <p key={i} style={{ fontSize: 12, fontWeight: 500, color: "hsl(var(--foreground))", marginBottom: 2 }}>
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
