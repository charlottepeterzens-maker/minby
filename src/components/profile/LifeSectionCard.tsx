import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Image,
  Link,
  Send,
  Check,
  X,
  RectangleHorizontal,
  LayoutList,
  MoreHorizontal,
  Trash2,
  Pencil,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PostReactions from "@/components/profile/PostReactions";
import PostComments from "@/components/profile/PostComments";
import ConfirmSheet from "@/components/ConfirmSheet";
import { useSignedImageUrl } from "@/hooks/useSignedImageUrl";

interface LifePost {
  id: string;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  link_title: string | null;
  created_at: string;
  photo_layout: string;
  section_id: string | null;
}

interface Props {
  section: { id: string; name: string; emoji: string; min_tier: string };
  isOwner: boolean;
  onUpdated?: () => void;
}

const LifeSectionCard = ({ section, isOwner, onUpdated }: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [posts, setPosts] = useState<LifePost[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [photoLayout, setPhotoLayout] = useState<"large" | "small">("large");
  const [posting, setPosting] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const [editTier, setEditTier] = useState(section.min_tier);
  const [saving, setSaving] = useState(false);
  const [editingPost, setEditingPost] = useState<LifePost | null>(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [editPostSectionId, setEditPostSectionId] = useState<string | null>(null);
  const [savingPost, setSavingPost] = useState(false);
  const [allSections, setAllSections] = useState<{ id: string; name: string }[]>([]);

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (days === 0) return "idag";
    if (days === 1) return "igar";
    if (days < 30) return "for " + days + " dagar sedan";
    return date.toLocaleDateString("sv-SE", { day: "numeric", month: "long" });
  };

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from("life_posts")
      .select("*")
      .eq("section_id", section.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setPosts(data as LifePost[]);
  }, [section.id]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    setEditName(section.name);
    setEditTier(section.min_tier);
  }, [section.name, section.min_tier]);

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("life_sections")
      .update({ name: editName.trim(), min_tier: editTier as any })
      .eq("id", section.id);
    if (error) {
      toast.error("Kunde inte uppdatera delen");
    } else {
      toast.success("Delen uppdaterad");
      setEditing(false);
      onUpdated?.();
    }
    setSaving(false);
  };

  const handlePost = async () => {
    if (!user || (!content.trim() && !imageFile && !linkUrl.trim())) return;
    setPosting(true);
    let image_url: string | null = null;
    if (imageFile) {
      const sanitizedName = imageFile.name.replace(/[^a-zA-Z0-9.]/g, "_").toLowerCase();
      const filePath = user.id + "/" + Date.now() + "-" + sanitizedName;
      const { error: uploadErr } = await supabase.storage.from("life-images").upload(filePath, imageFile);
      if (uploadErr) {
        toast.error("Kunde inte ladda upp bild");
        setPosting(false);
        return;
      }
      image_url = filePath;
    }
    const { error } = await supabase.from("life_posts").insert({
      section_id: section.id,
      user_id: user.id,
      content: content.trim() || null,
      image_url,
      link_url: linkUrl.trim() || null,
      photo_layout: image_url ? photoLayout : "large",
    });
    if (error) {
      toast.error("Kunde inte publicera");
    } else {
      setContent("");
      setLinkUrl("");
      setImageFile(null);
      setPhotoLayout("large");
      setShowCompose(false);
      fetchPosts();
    }
    setPosting(false);
  };

  const handleDelete = async (postId: string) => {
    await supabase.from("life_posts").delete().eq("id", postId);
    fetchPosts();
  };

  const handleEditPost = (post: LifePost) => {
    setEditingPost(post);
    setEditPostContent(post.content || "");
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
      toast.success("Inlagg uppdaterat");
      setEditingPost(null);
      fetchPosts();
    }
    setSavingPost(false);
  };

  return (
    <div id={"section-" + section.id}>
      <div style={{ marginBottom: 10 }}>
        {editing ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              style={{ height: 32, fontSize: 13, flex: 1, maxWidth: 180 }}
              autoFocus
            />
            <Select value={editTier} onValueChange={setEditTier}>
              <SelectTrigger style={{ height: 32, width: 110, fontSize: 12 }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="close">Närmaste krets</SelectItem>
                <SelectItem value="outer">Alla i kretsen</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "#3C2A4D",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Check style={{ width: 14, height: 14, color: "#F7F3EF" }} />
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEditName(section.name);
                setEditTier(section.min_tier);
              }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "hsl(var(--color-surface-raised))",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X style={{ width: 14, height: 14, color: "hsl(var(--color-text-primary))" }} />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 16, fontWeight: 500, color: "hsl(var(--color-text-primary))" }}>{section.name}</p>
            {isOwner && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  onClick={() => setEditing(true)}
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: "hsl(var(--color-text-secondary))",
                    background: "hsl(var(--color-surface))",
                    border: "none",
                    borderRadius: 8,
                    padding: "4px 10px",
                    cursor: "pointer",
                  }}
                >
                  Redigera del
                </button>
                <button
                  onClick={() => setShowCompose(!showCompose)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    background: "#3C2A4D",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Plus style={{ width: 12, height: 12, color: "#F7F3EF" }} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCompose && isOwner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden", marginBottom: 10 }}
          >
            <div
              style={{
                background: "#fff",
                border: "none",
                borderRadius: 8,
                padding: 12,
                boxShadow: "0 1px 4px 0 rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Dela nagot med dina nara"
                style={{
                  fontSize: 13,
                  minHeight: 60,
                  background: "hsl(var(--color-surface))",
                  border: "none",
                  borderRadius: 8,
                  resize: "none",
                }}
              />
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ cursor: "pointer" }}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: imageFile ? "#EDE8F4" : "#F7F3EF",
                      color: imageFile ? "#3C2A4D" : "#655675",
                      cursor: "pointer",
                    }}
                  >
                    <Image style={{ width: 12, height: 12 }} />
                    {imageFile ? imageFile.name.slice(0, 15) : "Foto"}
                  </span>
                </label>
                {imageFile && (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setPhotoLayout("large")}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: photoLayout === "large" ? "#3C2A4D" : "#fff",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <RectangleHorizontal
                        style={{ width: 14, height: 14, color: photoLayout === "large" ? "#fff" : "#3C2A4D" }}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoLayout("small")}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: photoLayout === "small" ? "#3C2A4D" : "#fff",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <LayoutList
                        style={{ width: 14, height: 14, color: photoLayout === "small" ? "#fff" : "#3C2A4D" }}
                      />
                    </button>
                  </div>
                )}
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="Klistra in en lank..."
                  style={{ flex: 1, height: 28, fontSize: 11, background: "hsl(var(--color-surface))", border: "none" }}
                />
                <button
                  onClick={handlePost}
                  disabled={posting}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "#3C2A4D",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    opacity: posting ? 0.5 : 1,
                  }}
                >
                  <Send style={{ width: 12, height: 12, color: "#F7F3EF" }} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {posts.length === 0 ? (
        <p style={{ fontSize: 12, color: "hsl(var(--color-text-faint))", textAlign: "center", padding: "16px 0" }}>
          Inga uppdateringar annu
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {posts.map((post) => (
            <div
              key={post.id}
              style={{
                background: "#fff",
                border: "none",
                borderRadius: 8,
                overflow: "hidden",
                boxShadow: "0 1px 4px 0 rgba(0,0,0,0.05)",
              }}
            >
              {/* Row 1 – section label + menu */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px 0" }}>
                {section.name && (
                  <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7A6A85" }}>
                    {section.name}
                  </span>
                )}
                {isOwner && (
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
                    <DropdownMenuContent
                      align="end"
                      style={{ minWidth: 150, borderRadius: 8 }}
                    >
                      <DropdownMenuItem
                        onClick={() => handleEditPost(post)}
                        style={{ fontSize: 12, gap: 8, cursor: "pointer" }}
                      >
                        <Pencil style={{ width: 13, height: 13 }} /> Redigera inlägg
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeletePostId(post.id)}
                        style={{ fontSize: 12, gap: 8, color: "hsl(var(--color-accent-red))", cursor: "pointer" }}
                      >
                        <Trash2 style={{ width: 13, height: 13 }} /> Ta bort inlägg
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Row 2 – content */}
              <div style={{ padding: "8px 12px 0", display: "flex", gap: 12 }}>
                {post.image_url && post.photo_layout === "small" && (
                  <SignedImage
                    imageRef={post.image_url}
                    onClick={() => setExpandedImage(post.image_url)}
                    className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    imgClassName="object-cover rounded-md w-[72px] h-[72px]"
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {post.content && (
                    <p style={{
                      fontFamily: "'Fraunces', serif",
                      fontSize: 15,
                      fontWeight: 500,
                      color: "#2E1F3E",
                      lineHeight: 1.4,
                      marginBottom: 2,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}>{post.content}</p>
                  )}
                  {post.link_url && (
                    <a
                      href={post.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 11,
                        color: "hsl(var(--color-text-primary))",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 4,
                      }}
                    >
                      <Link style={{ width: 11, height: 11 }} />
                      {post.link_url.slice(0, 40)}...
                    </a>
                  )}
                </div>
              </div>

              {/* Large image below content */}
              {post.image_url && post.photo_layout !== "small" && (
                <div style={{ padding: "8px 12px 0" }}>
                  <SignedImage
                    imageRef={post.image_url}
                    onClick={() => setExpandedImage(post.image_url)}
                    className="w-full cursor-pointer hover:opacity-90 transition-opacity"
                    imgClassName="block w-full max-h-72 object-cover rounded-md"
                  />
                </div>
              )}

              {/* Row 3 – date */}
              <div style={{ padding: "6px 12px 0" }}>
                <span style={{ fontSize: 12, fontWeight: 300, color: "#B0A8B5" }}>{formatRelativeDate(post.created_at)}</span>
              </div>

              {/* Row 4–6 – reactions + comments */}
              <div style={{ padding: "12px 12px 12px" }}>
                <PostReactions postId={post.id} />
                <div style={{ marginTop: 4 }}>
                  <PostComments postId={post.id} isOwner={isOwner} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent style={{ maxWidth: "90vw", maxHeight: "90vh", padding: 8, background: "#1A0A2E" }}>
          {expandedImage && (
            <SignedImage
              imageRef={expandedImage}
              className="w-full h-full"
              imgClassName="w-full h-full object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmSheet
        open={!!deletePostId}
        onOpenChange={(open) => {
          if (!open) setDeletePostId(null);
        }}
        title="Ta bort inlagg"
        description="Ar du saker? Det gar inte att angra."
        confirmLabel="Ta bort"
        onConfirm={() => {
          if (deletePostId) handleDelete(deletePostId);
          setDeletePostId(null);
        }}
      />

      <Sheet
        open={!!editingPost}
        onOpenChange={(open) => {
          if (!open) setEditingPost(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="rounded-t-[20px]"
          style={{ backgroundColor: "hsl(var(--color-surface))", padding: "24px 16px" }}
        >
          <SheetHeader>
            <SheetTitle style={{ fontSize: 15, fontWeight: 500 }}>Redigera inlagg</SheetTitle>
          </SheetHeader>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <Textarea
              value={editPostContent}
              onChange={(e) => setEditPostContent(e.target.value)}
              style={{
                minHeight: 100,
                fontSize: 13,
                background: "#fff",
                border: "none",
                borderRadius: 8,
                resize: "none",
              }}
              autoFocus
            />
            <button
              onClick={handleSavePost}
              disabled={savingPost}
              style={{
                width: "100%",
                padding: "10px",
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
    </div>
  );
};

const SignedImage = ({
  imageRef,
  onClick,
  className,
  imgClassName,
}: {
  imageRef: string;
  onClick?: () => void;
  className?: string;
  imgClassName?: string;
}) => {
  const url = useSignedImageUrl(imageRef);
  if (!url) return null;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={className} style={{ width: "100%", display: "block", padding: 0, border: "none", background: "none" }}>
      <img src={url} alt="" className={imgClassName} />
    </Tag>
  );
};

export default LifeSectionCard;
