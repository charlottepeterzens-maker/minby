import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSignedImageUrl } from "@/hooks/useSignedImageUrl";
import LazyImage from "@/components/LazyImage";
import PostReactions from "@/components/profile/PostReactions";
import PostComments from "@/components/profile/PostComments";
import ConfirmSheet from "@/components/ConfirmSheet";
import { MoreHorizontal, Pencil, Trash2, Camera, X, RectangleHorizontal, LayoutList } from "lucide-react";
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
import { compressImage } from "@/utils/imageCompression";

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
  limit?: number;
  showFade?: boolean;
}

// Post section badge uses dark background for photo overlay readability

const RecentPostsFeed = ({ sections, refreshKey, limit = 10, showFade = false }: Props) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<LifePost[]>([]);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<LifePost | null>(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [editNewImage, setEditNewImage] = useState<File | null>(null);
  const [editRemoveImage, setEditRemoveImage] = useState(false);
  const [editPhotoLayout, setEditPhotoLayout] = useState<"large" | "small">("large");
  const [savingPost, setSavingPost] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("life_posts")
      .select("id, content, image_url, photo_layout, created_at, section_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) setPosts(data as LifePost[]);
  }, [user, limit]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts, refreshKey]);

  const handleDelete = async (postId: string) => {
    await supabase.from("life_posts").delete().eq("id", postId);
    fetchPosts();
  };

  const handleSavePost = async () => {
    if (!editingPost || !user) return;
    setSavingPost(true);

    let newImageUrl = editingPost.image_url;

    // Handle new image upload
    if (editNewImage) {
      const compressed = await compressImage(editNewImage);
      const sanitized = compressed.name.replace(/[^a-zA-Z0-9.]/g, "_").toLowerCase();
      const filePath = `${user.id}/${Date.now()}-${sanitized}`;
      const { error: uploadErr } = await supabase.storage.from("life-images").upload(filePath, compressed);
      if (uploadErr) {
        toast.error("Kunde inte ladda upp bild");
        setSavingPost(false);
        return;
      }
      newImageUrl = filePath;
    } else if (editRemoveImage) {
      newImageUrl = null;
    }

    const { error } = await supabase
      .from("life_posts")
      .update({
        content: editPostContent.trim() || null,
        image_url: newImageUrl,
        photo_layout: newImageUrl ? editPhotoLayout : "large",
      } as any)
      .eq("id", editingPost.id);
    if (error) {
      toast.error("Kunde inte uppdatera");
    } else {
      toast.success("Inlägg uppdaterat");
      setEditingPost(null);
      setEditNewImage(null);
      setEditRemoveImage(false);
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

  const getSectionName = (sectionId: string | null) => {
    if (!sectionId) return null;
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx === -1) return null;
    return sections[idx].name;
  };

  if (posts.length === 0) return null;

  return (
    <div className="relative">
      <div className="flex flex-col gap-2">
        {posts.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <PostCard
              post={post}
              sectionName={getSectionName(post.section_id)}
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

      {/* Fade overlay on last post */}
      {showFade && posts.length >= 3 && (
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: 80,
            background: "linear-gradient(to bottom, transparent, #F0EAE2)",
          }}
        />
      )}

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
      <Sheet open={!!editingPost} onOpenChange={(open) => { if (!open) { setEditingPost(null); setEditNewImage(null); setEditRemoveImage(false); } }}>
        <SheetContent
          side="bottom"
          className="rounded-t-[20px]"
          style={{ backgroundColor: "hsl(var(--color-surface))", padding: "24px 16px" }}
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

            {/* Image editing */}
            <div>
              <p className="text-[10px] mb-1.5" style={{ color: "hsl(var(--color-text-faint))" }}>Bild</p>

              {/* Current image preview */}
              {editingPost?.image_url && !editRemoveImage && !editNewImage && (
                <div className="relative inline-block mb-2">
                  <SignedImg
                    imageRef={editingPost.image_url}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setEditRemoveImage(true)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "#A32D2D", border: "2px solid #F7F3EF" }}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              )}

              {/* New image preview */}
              {editNewImage && (
                <div className="relative inline-block mb-2">
                  <img
                    src={URL.createObjectURL(editNewImage)}
                    alt=""
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => { setEditNewImage(null); setEditRemoveImage(false); }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "#A32D2D", border: "2px solid #F7F3EF" }}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <label style={{ cursor: "pointer" }}>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setEditNewImage(f);
                        setEditRemoveImage(false);
                      }
                    }}
                  />
                  <span
                    className="inline-flex items-center gap-1"
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: "hsl(var(--color-surface))",
                      color: "hsl(var(--color-text-secondary))",
                      cursor: "pointer",
                    }}
                  >
                    <Camera className="w-3 h-3" />
                    {editRemoveImage ? "Lägg till bild" : "Byt bild"}
                  </span>
                </label>

                {/* Layout toggle - show if there's an image */}
                {((editingPost?.image_url && !editRemoveImage) || editNewImage) && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditPhotoLayout("large")}
                      className="flex items-center justify-center"
                      style={{
                        width: 26, height: 26, borderRadius: 8,
                        background: editPhotoLayout === "large" ? "#3C2A4D" : "#fff",
                        border: "1px solid #3C2A4D",
                      }}
                      title="Stort foto"
                    >
                      <RectangleHorizontal className="w-3 h-3" style={{ color: editPhotoLayout === "large" ? "#fff" : "#3C2A4D" }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPhotoLayout("small")}
                      className="flex items-center justify-center"
                      style={{
                        width: 26, height: 26, borderRadius: 8,
                        background: editPhotoLayout === "small" ? "#3C2A4D" : "#fff",
                        border: "1px solid #3C2A4D",
                      }}
                      title="Liten thumbnail"
                    >
                      <LayoutList className="w-3 h-3" style={{ color: editPhotoLayout === "small" ? "#fff" : "#3C2A4D" }} />
                    </button>
                  </div>
                )}
              </div>
            </div>

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
  sectionName,
  dateStr,
  onEdit,
  onDelete,
  onImageClick,
}: {
  post: LifePost;
  sectionName: string | null;
  dateStr: string;
  onEdit: () => void;
  onDelete: () => void;
  onImageClick: (url: string) => void;
}) => {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 1px 4px 0 rgba(0,0,0,0.05)",
      }}
    >
      {/* Row 1 – section label + menu */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px 0" }}>
        {sectionName ? (
          <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7A6A85" }}>
            {sectionName}
          </span>
        ) : <span />}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontSize: 16,
                letterSpacing: 2,
                color: "#B0A8B5",
                lineHeight: 1,
              }}
            >
              ···
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[150px]" style={{ borderRadius: 8 }}>
            <DropdownMenuItem onClick={onEdit} className="text-xs gap-2 cursor-pointer">
              <Pencil className="w-3.5 h-3.5" /> Redigera inlägg
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-xs gap-2 cursor-pointer text-destructive">
              <Trash2 className="w-3.5 h-3.5" /> Ta bort inlägg
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Row 2 – content */}
      <div className="p-3 flex gap-3">
        {post.image_url && post.photo_layout === "small" && (
          <SignedImg
            imageRef={post.image_url}
            className="w-[72px] h-[72px] object-cover rounded-md shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onImageClick(post.image_url!)}
          />
        )}
        <div className="flex-1 min-w-0">
          {post.content && (
            <p style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 15,
              fontWeight: 500,
              color: "#2E1F3E",
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>{post.content}</p>
          )}
        </div>
      </div>

      {/* Large image */}
      {post.image_url && post.photo_layout !== "small" && (
        <div style={{ padding: "0 12px" }}>
          <SignedImg
            imageRef={post.image_url}
            className="w-full object-cover cursor-pointer hover:opacity-90 transition-opacity rounded-md"
            style={{ maxHeight: 280, minHeight: 140 }}
            onClick={() => onImageClick(post.image_url!)}
          />
        </div>
      )}

      {/* Row 3 – date */}
      <div className="px-3 pt-1.5">
        <span style={{ fontSize: 12, fontWeight: 300, color: "#B0A8B5" }}>{dateStr}</span>
      </div>

      {/* Row 4–6 – reactions + comments */}
        <div className="px-3 pb-3" style={{ marginTop: 12 }}>
          <PostReactions postId={post.id} />
          <div style={{ marginTop: 4 }}>
            <PostComments postId={post.id} isOwner={true} />
          </div>
        </div>
    </div>
  );
};

/* Signed image helper */
const SignedImg = ({
  imageRef,
  className,
  style,
  onClick,
}: {
  imageRef: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) => {
  const url = useSignedImageUrl(imageRef);
  if (!url) return null;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={`block ${className || ""}`} style={style}>
      <LazyImage src={url} alt="Inläggsbild" className="w-full h-full" style={{ borderRadius: "inherit" }} />
    </Tag>
  );
};

export default RecentPostsFeed;
