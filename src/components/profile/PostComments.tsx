import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Trash2 } from "lucide-react";
import { sendNotification } from "@/utils/notifications";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  display_name: string | null;
  initials: string;
}

interface Props {
  postId: string;
  isOwner: boolean;
}

const PostComments = ({ postId, isOwner }: Props) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

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
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const profileMap: Record<string, string | null> = {};
    profiles?.forEach((p) => {
      profileMap[p.user_id] = p.display_name;
    });

    setComments(
      data.map((c) => ({
        ...c,
        display_name: profileMap[c.user_id] || null,
        initials: (profileMap[c.user_id] || "?").slice(0, 2).toUpperCase(),
      }))
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

    // Send life_comment notification to post owner
    try {
      const { data: post } = await supabase.from("life_posts").select("user_id, section_id").eq("id", postId).single();
      if (post && post.user_id !== user.id) {
        const { data: section } = await supabase.from("life_sections").select("name").eq("id", post.section_id).single();
        const { data: myProfile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
        const name = myProfile?.display_name || "Någon";
        const sectionName = section?.name || "ditt inlägg";
        await sendNotification({
          recipientUserId: post.user_id,
          fromUserId: user.id,
          type: "life_comment",
          referenceId: postId,
          message: `${name} kommenterade ditt inlägg i ${sectionName}`,
        });
      }
    } catch {
      // Best effort
    }

    setText("");
    setShowInput(false);
    fetchComments();
    setPosting(false);
  };

  const handleDelete = async (commentId: string) => {
    await supabase.from("post_comments").delete().eq("id", commentId);
    fetchComments();
  };

  return (
    <div className="mt-2">
      {/* Existing comments */}
      {comments.length > 0 && (
        <div className="space-y-2 mb-2">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 group">
              <Avatar className="w-6 h-6 shrink-0 mt-0.5">
                <AvatarFallback
                  style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }}
                  className="text-[9px] font-medium"
                >
                  {c.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[12px] font-medium text-foreground">
                    {c.user_id === user?.id ? "Du" : (c.display_name || "Någon")}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50">
                    {getTimeAgo(c.created_at)}
                  </span>
                </div>
                <p className="text-[12px] text-foreground/80 leading-[1.5]">{c.content}</p>
              </div>
              {(c.user_id === user?.id || isOwner) && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-destructive mt-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Comment input toggle / field */}
      {showInput ? (
        <div className="flex gap-1.5 items-center">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Skriv en kommentar..."
            className="h-7 text-[12px] flex-1 bg-muted/30 border-border/30"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handlePost()}
          />
          <Button
            size="sm"
            disabled={posting || !text.trim()}
            onClick={handlePost}
            className="h-7 w-7 p-0"
            style={{ backgroundColor: "#3C2A4D" }}
          >
            <Send className="w-3 h-3 text-white" />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Kommentera
        </button>
      )}
    </div>
  );
};

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "nu";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export default PostComments;
