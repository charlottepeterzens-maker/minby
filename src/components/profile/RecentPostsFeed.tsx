import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSignedImageUrl } from "@/hooks/useSignedImageUrl";
import PostReactions from "@/components/profile/PostReactions";
import PostComments from "@/components/profile/PostComments";
import ConfirmSheet from "@/components/ConfirmSheet";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface LifeSection {
  id: string;
  name: string;
}

interface LifePost {
  id: string;
  content: string | null;
  image_url: string | null;
  photo_layout: string;
  created_at: string;
  section_id: string | null;
}

interface Props {
  sections: LifeSection[];
  refreshKey: number;
}

const PILL_COLORS = [
  { bg: "#EDE8F4", text: "#3C2A4D" },
  { bg: "#EAF2E8", text: "#1F4A1A" },
  { bg: "#FCF0F3", text: "#4B1528" },
  { bg: "#FCF0F3", text: "#993556" },
  { bg: "#EDE8F4", text: "#3C2A4D" },
  { bg: "#EAF2E8", text: "#1F4A1A" },
];

const RecentPostsFeed = ({ sections, refreshKey }: Props) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<LifePost[]>([]);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<LifePost | null>(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [savingPost, setSavingPost] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("life_posts")
      .select("id, content, image_url, photo_layout, created_at, section_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setPosts(data as LifePost[]);
  }, [user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts, refreshKey]);

  const handleDelete = async (postId: string) => {
    await supabase.from("life_posts").delete().eq("id", postId);
    fetchPosts();
  };

  const handleSavePost = async () => {
    if (!editingPost) return;
    setSavingPost(true);
    const { error } = await supabase
      .from("life_posts")
      .update({ content: editPostContent.trim() || null })
      .eq("id", editingPost.id);
    if (error) {
      toast.error("Kunde inte uppdatera");
    } else {
      toast.success("Inlägg uppdaterat");
      setEditingPost(null);
      fetchPosts();
    }
    setSavingPost(false);
  };

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (days === 0) return "idag";
    if (days === 1) return "igår";
    if (days < 30) return `för ${days} dagar sedan`;
    return date.toLocaleDateString("sv-SE", { day: "numeric", month: "long" });
  };

  const getSectionPill = (sectionId: string | null) => {
    if (!sectionId) return null;
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx === -1) return null;
    const colors = PILL_COLORS[idx % PILL_COLORS.length];
    return (
      <span
        style={{
          fontSize: 10,
          padding: "2px 8px",
          borderRadius: 99,
          background: colors.bg,
          color: colors.text,
          fontWeight: 500,
        }}
      >
        {sections[idx].name}
      </span>
    );
  };

  if (posts.length === 0) return null;

  return (
    <div className="mb-6">
      <p
        className="text-[10px] uppercase font-medium tracking-wider mb-3"
        style={{ color: "#B0A0B5" }}
      >
        Senaste
      </p>
      <div className="flex flex-col gap-2.5">
        {posts.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <PostCard
              post={post}
              sectionPill={getSectionPill(post.section_id)}
              dateStr={formatRelativeDate(post.created_at)}
              onEdit={() => {
                setEditingPost(post);
                setEditPostContent(post.content || "");
              }}
              onDelete={() => setDeletePostId(post.id)}
              onImageClick={(url) => setExpandedImage(url)}
            />
          </motion.div>
        ))}
      </div>

      {/* Delete confirm */}
      <ConfirmSheet
        open={!!deletePostId}
        onOpenChange={(open) => { if (!open) setDeletePostId(null); }}
        title="Ta bort inlägg"
        description="Är du säker? Det går inte att ångra."
        confirmLabel="Ta bort"
        onConfirm={() => {
          if (deletePostId) handleDelete(deletePostId);
          setDeletePostId(null);
        }}
      />

      {/* Edit sheet */}
      <Sheet open={!!editingPost} onOpenChange={(open) => { if (!open) setEditingPost(null); }}>
        <SheetContent
          side="bottom"
          className="rounded-t-[20px]"
          style={{ backgroundColor: "#F7F3EF", padding: "24px 16px" }}
        >
          <SheetHeader>
            <SheetTitle style={{ fontSize: 15, fontWeight: 500 }}>Redigera inlägg</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-3">
            <Textarea
              value={editPostContent}
              onChange={(e) => setEditPostContent(e.target.value)}
              className="min-h-[100px] text-[13px] bg-white border-[#EDE8E0] rounded-lg resize-none"
              autoFocus
            />
            <button
              onClick={handleSavePost}
              disabled={savingPost}
              style={{
                width: "100%",
                padding: 10,
                background: "#3C2A4D",
                color: "#F7F3EF",
                borderRadius: 8,
                border: "none",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                opacity: savingPost ? 0.6 : 1,
              }}
            >
              Spara
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Expanded image */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent style={{ maxWidth: "90vw", maxHeight: "90vh", padding: 8, background: "#1A0A2E" }}>
          {expandedImage && <SignedImg imageRef={expandedImage} className="w-full h-full object-contain rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* Individual post card */
const PostCard = ({
  post,
  sectionPill,
  dateStr,
  onEdit,
  onDelete,
  onImageClick,
}: {
  post: LifePost;
  sectionPill: React.ReactNode;
  dateStr: string;
  onEdit: () => void;
  onDelete: () => void;
  onImageClick: (url: string) => void;
}) => {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #EDE8E0",
        borderRadius: 8,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Menu */}
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "rgba(247,243,239,0.9)", border: "1px solid #EDE8E0" }}
            >
              <MoreHorizontal className="w-3.5 h-3.5" style={{ color: "#9B8BA5" }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[150px]" style={{ borderRadius: 8, border: "1px solid #EDE8E0" }}>
            <DropdownMenuItem onClick={onEdit} className="text-xs gap-2 cursor-pointer">
              <Pencil className="w-3.5 h-3.5" /> Redigera inlägg
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-xs gap-2 cursor-pointer text-destructive">
              <Trash2 className="w-3.5 h-3.5" /> Ta bort inlägg
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Large image */}
      {post.image_url && post.photo_layout !== "small" && (
        <SignedImg
          imageRef={post.image_url}
          className="w-full max-h-72 object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onImageClick(post.image_url!)}
        />
      )}

      <div className="p-3 flex gap-2.5">
        {/* Small image */}
        {post.image_url && post.photo_layout === "small" && (
          <SignedImg
            imageRef={post.image_url}
            className="w-[60px] h-[60px] object-cover rounded-md shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onImageClick(post.image_url!)}
          />
        )}
        <div className="flex-1 min-w-0">
          {post.content && (
            <p className="text-[13px] leading-relaxed mb-1" style={{ color: "#2A1A3C" }}>{post.content}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px]" style={{ color: "#B0A0B5" }}>{dateStr}</span>
            {sectionPill}
          </div>
        </div>
      </div>

      <div className="px-3 pb-3">
        <PostReactions postId={post.id} />
        <PostComments postId={post.id} isOwner={true} />
      </div>
    </div>
  );
};

/* Signed image helper */
const SignedImg = ({
  imageRef,
  className,
  onClick,
}: {
  imageRef: string;
  className?: string;
  onClick?: () => void;
}) => {
  const url = useSignedImageUrl(imageRef);
  if (!url) return null;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={onClick ? "" : undefined}>
      <img src={url} alt="" className={className} />
    </Tag>
  );
};

export default RecentPostsFeed;
