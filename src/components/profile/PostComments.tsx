import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Trash2 } from "lucide-react";
import { sendNotification } from "@/utils/notifications";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  initials: string;
}

interface Props {
  postId: string;
  isOwner: boolean;
}

const PostComments = ({ postId, isOwner }: Props) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [myInitials, setMyInitials] = useState("?");
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) {
          setMyInitials(data.display_name.slice(0, 2).toUpperCase());
        }
      });
  }, [user]);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from("post_comments")
      .select("id, content, created_at, user_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!data || data.length === 0) {
      setComments([]);
      return;
    }

    const userIds = [...new Set(data.map((c) => c.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);

    const profileMap: Record<string, string | null> = {};
    profiles?.forEach((p) => {
      profileMap[p.user_id] = p.display_name;
    });

    setComments(
      data.map((c) => ({
        ...c,
        display_name: profileMap[c.user_id] || null,
        initials: (profileMap[c.user_id] || "?").slice(0, 2).toUpperCase(),
      })),
    );
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handlePost = async () => {
    if (!user || !text.trim()) return;
    setPosting(true);
    await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: user.id,
      content: text.trim(),
    });

    try {
      const { data: post } = await supabase.from("life_posts").select("user_id, section_id").eq("id", postId).single();
      if (post && post.user_id !== user.id) {
        const { data: section } = await supabase
          .from("life_sections")
          .select("name")
          .eq("id", post.section_id)
          .single();
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .single();
        const name = myProfile?.display_name || "Nagon";
        const sectionName = section?.name || "ditt inlagg";
        await sendNotification({
          recipientUserId: post.user_id,
          fromUserId: user.id,
          type: "life_comment",
          referenceId: postId,
          message: name + " kommenterade ditt inlagg i " + sectionName,
        });
      }
    } catch {}

    setText("");
    setFocused(false);
    fetchComments();
    setPosting(false);
  };

  const handleDelete = async (commentId: string) => {
    await supabase.from("post_comments").delete().eq("id", commentId);
    fetchComments();
  };

  return (
    <div style={{ marginTop: 10 }}>
      {/* Comment count summary */}
      {comments.length > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{ fontSize: 11, color: "#7A6A85", marginBottom: 8 }}
          className="hover:underline"
        >
          {comments.length === 1 ? "1 svar" : `${comments.length} svar`}
        </button>
      )}

      {comments.length > 0 && expanded && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 10,
            paddingTop: 10,
            borderTop: "1px solid #EDE8E0",
          }}
        >
          {comments.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "#EDE8F4",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 9, fontWeight: 500, color: "#3C2A4D" }}>{c.initials}</span>
              </div>
              <div style={{ flex: 1, background: "#F7F3EF", borderRadius: "0 8px 8px 8px", padding: "7px 10px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: "#2A1A3C" }}>
                    {c.user_id === user?.id ? "Du" : c.display_name || "Någon"}
                  </span>
                  <span style={{ fontSize: 10, color: "#B0A0B5" }}>{getTimeAgo(c.created_at)}</span>
                </div>
                <p style={{ fontSize: 12, color: "#5A4A6A", lineHeight: 1.5 }}>{c.content}</p>
              </div>
              {(c.user_id === user?.id || isOwner) && (
                <button
                  onClick={() => handleDelete(c.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 2,
                    marginTop: 4,
                    opacity: 0.4,
                  }}
                >
                  <Trash2 style={{ width: 11, height: 11, color: "#A32D2D" }} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "#EDE8F4",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 500, color: "#3C2A4D" }}>{myInitials}</span>
        </div>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => {
            setFocused(true);
            if (!expanded && comments.length > 0) setExpanded(true);
          }}
          onBlur={() => {
            if (!text.trim()) setFocused(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handlePost()}
          placeholder="Säg något till dem…"
          style={{
            flex: 1,
            height: 30,
            background: "#F7F3EF",
            border: focused ? "1px solid #C9B8D8" : "1px solid #EDE8E0",
            borderRadius: 99,
            padding: "0 12px",
            fontSize: 11,
            color: "#2A1A3C",
            outline: "none",
            transition: "border 0.15s ease",
          }}
        />
        {text.trim().length > 0 && (
          <button
            onClick={handlePost}
            disabled={posting}
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "#3C2A4D",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              opacity: posting ? 0.6 : 1,
            }}
          >
            <Send style={{ width: 11, height: 11, color: "#F7F3EF" }} />
          </button>
        )}
      </div>
    </div>
  );
};

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "nu";
  if (diffMins < 60) return diffMins + "m";
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return diffHours + "h";
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return diffDays + "d";
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export default PostComments;
