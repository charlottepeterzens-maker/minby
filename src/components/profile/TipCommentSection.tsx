import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { resolveAvatarUrl } from "@/utils/avatarUrl";

interface TipComment {
  id: string;
  tip_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null };
}

const relativeTime = (dateStr: string) => {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just nu";
  if (mins < 60) return `${mins} min sedan`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h sedan`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "igår";
  if (days < 7) return `för ${days} dagar sedan`;
  const weeks = Math.floor(days / 7);
  return `för ${weeks}v sedan`;
};

const TipCommentSection = ({
  tipId,
  tipOwnerId,
  tipTitle,
}: {
  tipId: string;
  tipOwnerId: string;
  tipTitle: string;
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<TipComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from("tip_comments")
      .select("*")
      .eq("tip_id", tipId)
      .order("created_at", { ascending: true });
    if (!data) return;

    const userIds = [...new Set(data.map((c: any) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(
      (profiles || []).map((p) => [p.user_id, p])
    );

    setComments(
      data.map((c: any) => ({
        ...c,
        profile: profileMap.get(c.user_id) || { display_name: null, avatar_url: null },
      }))
    );
  }, [tipId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSend = async () => {
    if (!user || !newComment.trim()) return;
    setSending(true);

    const { error } = await supabase.from("tip_comments").insert({
      tip_id: tipId,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (error) {
      toast({ title: "Fel", description: error.message, variant: "destructive" });
      setSending(false);
      return;
    }

    // Send notification to tip owner (if not self)
    if (tipOwnerId !== user.id) {
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();

      const name = myProfile?.display_name || "Någon";
      const shortTitle = tipTitle.length > 20 ? tipTitle.slice(0, 20) + "…" : tipTitle;

      await supabase.from("notifications").insert({
        type: "tip_comment",
        user_id: tipOwnerId,
        from_user_id: user.id,
        title: "Ny kommentar",
        body: `${name} kommenterade ditt tips "${shortTitle}"`,
        reference_id: tipId,
      }).then(() => {});
    }

    setNewComment("");
    setSending(false);
    await fetchComments();
  };

  const initials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {comments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {comments.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#EDE8F4",
                  color: "hsl(var(--color-text-primary))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 600,
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                {resolveAvatarUrl(c.profile?.avatar_url ?? null) ? (
                  <img src={resolveAvatarUrl(c.profile?.avatar_url ?? null)!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  initials(c.profile?.display_name || null)
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: "hsl(var(--color-text-primary))" }}>
                    {c.profile?.display_name || "Anonym"}
                  </span>
                  <span style={{ fontSize: 10, color: "hsl(var(--color-text-faint))" }}>{relativeTime(c.created_at)}</span>
                </div>
                <p style={{ fontSize: 12, color: "hsl(var(--color-text-secondary))", margin: "2px 0 0", lineHeight: 1.4 }}>
                  {c.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {user && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Skriv en kommentar…"
            maxLength={300}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
              fontFamily: "Lexend, sans-serif",
              outline: "none",
              background: "transparent",
              color: "hsl(var(--color-text-primary))",
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !newComment.trim()}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: newComment.trim() ? "#3C2A4D" : "#EDE8F4",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: newComment.trim() ? "pointer" : "default",
              flexShrink: 0,
              transition: "background 0.2s",
            }}
          >
            <Send style={{ width: 14, height: 14, color: newComment.trim() ? "#F7F3EF" : "#857A8F" }} />
          </button>
        </div>
      )}
    </div>
  );
};

export default TipCommentSection;

export const useCommentCount = (tipIds: string[]) => {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (tipIds.length === 0) return;

    const fetchCounts = async () => {
      const { data } = await supabase
        .from("tip_comments")
        .select("tip_id")
        .in("tip_id", tipIds);

      if (data) {
        const map: Record<string, number> = {};
        data.forEach((r: any) => {
          map[r.tip_id] = (map[r.tip_id] || 0) + 1;
        });
        setCounts(map);
      }
    };

    fetchCounts();
  }, [tipIds.join(",")]);

  return counts;
};
