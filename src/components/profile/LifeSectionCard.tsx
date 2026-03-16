import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, Image, Link, Send, Pencil, Check, X, RectangleHorizontal, LayoutList, MoreHorizontal, Trash2 } from "lucide-react";
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
  // Edit section state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const [editTier, setEditTier] = useState(section.min_tier);
  const [saving, setSaving] = useState(false);
  // Edit post state
  const [editingPost, setEditingPost] = useState<LifePost | null>(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [savingPost, setSavingPost] = useState(false);

  const tierLabels: Record<string, string> = {
    close: t("tierClose"),
    inner: t("tierInner"),
    outer: t("tierAll"),
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

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

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
      toast.error(t("couldNotUpdateSection"));
    } else {
      toast.success(t("sectionUpdated"));
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
      const filePath = `${user.id}/${Date.now()}-${imageFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("life-images").upload(filePath, imageFile);
      if (uploadErr) { toast.error(t("couldNotPost")); setPosting(false); return; }
      image_url = filePath;
    }
    const { error } = await supabase.from("life_posts").insert({
      section_id: section.id, user_id: user.id,
      content: content.trim() || null, image_url,
      link_url: linkUrl.trim() || null,
      photo_layout: image_url ? photoLayout : "large",
    });
    if (error) { toast.error(t("couldNotPost")); }
    else { setContent(""); setLinkUrl(""); setImageFile(null); setPhotoLayout("large"); setShowCompose(false); fetchPosts(); }
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
    if (error) { toast.error("Kunde inte uppdatera"); }
    else { toast.success("Inlägg uppdaterat"); setEditingPost(null); fetchPosts(); }
    setSavingPost(false);
  };

  return (
    <Card id={`section-${section.id}`} className="border-border/50 shadow-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          {editing ? (
            <div className="flex-1 flex items-center gap-2">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm flex-1 max-w-[180px]" autoFocus />
              <Select value={editTier} onValueChange={setEditTier}>
                <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="close">{t("closeOnly")}</SelectItem>
                  <SelectItem value="inner">{t("innerPlus")}</SelectItem>
                  <SelectItem value="outer">{t("everyone")}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={handleSaveEdit} disabled={saving}><Check className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => { setEditing(false); setEditName(section.name); setEditTier(section.min_tier); }}><X className="w-4 h-4" /></Button>
            </div>
          ) : (
            <>
              <CardTitle className="font-display text-base flex items-center gap-2">
                {section.name}
                {isOwner && <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5">{tierLabels[section.min_tier]}</span>}
              </CardTitle>
              <div className="flex items-center gap-1">
                {isOwner && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(true)}><Pencil className="w-3.5 h-3.5" /></Button>}
                {isOwner && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowCompose(!showCompose)}><Plus className="w-4 h-4" /></Button>}
              </div>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Compose */}
        <AnimatePresence>
          {showCompose && isOwner && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
              <div className="bg-muted/30 p-3 space-y-2">
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={t("whatsNew")} className="bg-background/50 border-border/30 min-h-[60px] text-sm" />
                <div className="flex gap-2 items-center flex-wrap">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 border transition-colors ${imageFile ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-border/50 hover:bg-muted"}`}>
                      <Image className="w-3 h-3" /> {imageFile ? imageFile.name.slice(0, 15) : t("photo")}
                    </span>
                  </label>
                  {imageFile && (
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setPhotoLayout("large")} className="w-7 h-7 rounded-md flex items-center justify-center transition-colors" style={{ backgroundColor: photoLayout === "large" ? "#3C2A4D" : "#FFFFFF", border: "1px solid #3C2A4D" }} title="Stort foto">
                        <RectangleHorizontal className="w-3.5 h-3.5" style={{ color: photoLayout === "large" ? "#FFFFFF" : "#3C2A4D" }} />
                      </button>
                      <button type="button" onClick={() => setPhotoLayout("small")} className="w-7 h-7 rounded-md flex items-center justify-center transition-colors" style={{ backgroundColor: photoLayout === "small" ? "#3C2A4D" : "#FFFFFF", border: "1px solid #3C2A4D" }} title="Litet foto">
                        <LayoutList className="w-3.5 h-3.5" style={{ color: photoLayout === "small" ? "#FFFFFF" : "#3C2A4D" }} />
                      </button>
                    </div>
                  )}
                  <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder={t("pasteLink")} className="flex-1 h-7 text-xs bg-background/50 border-border/30" />
                  <Button size="sm" disabled={posting} onClick={handlePost} className="h-7 px-3"><Send className="w-3 h-3" /></Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Posts */}
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 text-center py-4">{t("noUpdatesYet")}</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="relative rounded-[14px] p-3"
                style={{ backgroundColor: "#FFFFFF", border: "0.5px solid #EDE8F4" }}
              >
                {/* Three-dot menu */}
                {isOwner && (
                  <div className="absolute top-2 right-2 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors text-muted-foreground">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[120px]">
                        <DropdownMenuItem onClick={() => handleEditPost(post)} className="text-[13px] gap-2">
                          <Pencil className="w-3.5 h-3.5" /> Redigera
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeletePostId(post.id)} className="text-[13px] gap-2 text-destructive focus:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" /> Ta bort
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {/* Large layout image */}
                {post.image_url && post.photo_layout !== "small" && (
                  <SignedImage imageRef={post.image_url} onClick={() => setExpandedImage(post.image_url)} className="w-full mb-2 rounded-[10px] overflow-hidden hover:opacity-90 transition-opacity" imgClassName="w-full max-h-72 object-cover" />
                )}
                <div className={`flex gap-3`}>
                  {/* Small layout thumbnail */}
                  {post.image_url && post.photo_layout === "small" && (
                    <SignedImage imageRef={post.image_url} onClick={() => setExpandedImage(post.image_url)} className="shrink-0 w-20 h-20 rounded-[10px] overflow-hidden hover:opacity-80 transition-opacity" imgClassName="w-full h-full object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    {post.content && <p className="text-[13px] text-foreground leading-[1.55]">{post.content}</p>}
                    {post.link_url && (
                      <a href={post.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                        <Link className="w-3 h-3" /> {post.link_url.slice(0, 40)}...
                      </a>
                    )}
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      {new Date(post.created_at).toLocaleDateString("sv-SE")}
                    </p>
                  </div>
                </div>

                {/* Reactions */}
                <PostReactions postId={post.id} />

                {/* Comments */}
                <PostComments postId={post.id} isOwner={isOwner} />
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Image lightbox */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-background">
          {expandedImage && <SignedImage imageRef={expandedImage} className="w-full h-full" imgClassName="w-full h-full object-contain rounded-lg" />}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmSheet
        open={!!deletePostId}
        onOpenChange={(open) => { if (!open) setDeletePostId(null); }}
        title="Ta bort inlägg"
        description="Är du säker på att du vill ta bort detta inlägg? Det går inte att ångra."
        confirmLabel="Ta bort"
        onConfirm={() => { if (deletePostId) handleDelete(deletePostId); setDeletePostId(null); }}
      />

      {/* Edit post sheet */}
      <Sheet open={!!editingPost} onOpenChange={(open) => { if (!open) setEditingPost(null); }}>
        <SheetContent side="bottom" className="rounded-t-[20px]" style={{ backgroundColor: "#F7F3EF" }}>
          <SheetHeader>
            <SheetTitle className="text-[15px] font-medium">Redigera inlägg</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Textarea
              value={editPostContent}
              onChange={(e) => setEditPostContent(e.target.value)}
              className="min-h-[100px] text-[13px] bg-white border-border/30"
              autoFocus
            />
            <Button
              onClick={handleSavePost}
              disabled={savingPost}
              className="w-full h-10 text-[13px] font-medium text-white"
              style={{ backgroundColor: "#3C2A4D" }}
            >
              Spara
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
};

export default LifeSectionCard;
