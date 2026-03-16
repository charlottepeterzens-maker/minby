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
import { toast } from "sonner";
import { Plus, Image, Link, Trash2, Send, Pencil, Check, X, RectangleHorizontal, LayoutList } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PostReactions from "@/components/profile/PostReactions";
import ConfirmSheet from "@/components/ConfirmSheet";

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
  const [posting, setPosting] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const [editTier, setEditTier] = useState(section.min_tier);
  const [saving, setSaving] = useState(false);

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
      if (uploadErr) {
        toast.error(t("couldNotPost"));
        setPosting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("life-images").getPublicUrl(filePath);
      image_url = urlData.publicUrl;
    }

    const { error } = await supabase.from("life_posts").insert({
      section_id: section.id,
      user_id: user.id,
      content: content.trim() || null,
      image_url,
      link_url: linkUrl.trim() || null,
    });

    if (error) {
      toast.error(t("couldNotPost"));
    } else {
      setContent("");
      setLinkUrl("");
      setImageFile(null);
      setShowCompose(false);
      fetchPosts();
    }
    setPosting(false);
  };

  const handleDelete = async (postId: string) => {
    await supabase.from("life_posts").delete().eq("id", postId);
    fetchPosts();
  };

  return (
    <Card id={`section-${section.id}`} className="border-border/50 shadow-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          {editing ? (
            <div className="flex-1 flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 text-sm flex-1 max-w-[180px]"
                autoFocus
              />
              <Select value={editTier} onValueChange={setEditTier}>
                <SelectTrigger className="h-8 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="close">{t("closeOnly")}</SelectItem>
                  <SelectItem value="inner">{t("innerPlus")}</SelectItem>
                  <SelectItem value="outer">{t("everyone")}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={handleSaveEdit} disabled={saving}>
                <Check className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => { setEditing(false); setEditName(section.name); setEditTier(section.min_tier); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <CardTitle className="font-display text-base flex items-center gap-2">
                {section.name}
                {isOwner && <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5">{tierLabels[section.min_tier]}</span>}
              </CardTitle>
              <div className="flex items-center gap-1">
                {isOwner && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(true)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
                {isOwner && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowCompose(!showCompose)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
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
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t("whatsNew")}
                  className="bg-background/50 border-border/30 min-h-[60px] text-sm"
                />
                <div className="flex gap-2 items-center">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 border transition-colors ${imageFile ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-border/50 hover:bg-muted"}`}>
                      <Image className="w-3 h-3" /> {imageFile ? imageFile.name.slice(0, 15) : t("photo")}
                    </span>
                  </label>
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder={t("pasteLink")}
                    className="flex-1 h-7 text-xs bg-background/50 border-border/30"
                  />
                  <Button size="sm" disabled={posting} onClick={handlePost} className="h-7 px-3">
                    <Send className="w-3 h-3" />
                  </Button>
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
              <div key={post.id} className="group relative flex gap-3">
                {post.image_url && (
                  <button
                    onClick={() => setExpandedImage(post.image_url)}
                    className="shrink-0 w-16 h-16 rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                  >
                    <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  {post.content && <p className="text-sm text-foreground">{post.content}</p>}
                  {post.link_url && (
                    <a href={post.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                      <Link className="w-3 h-3" /> {post.link_url.slice(0, 40)}...
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground/50 mt-1">
                    {new Date(post.created_at).toLocaleDateString("sv-SE")}
                  </p>
                  <PostReactions postId={post.id} />
                </div>
                {isOwner && (
                  <button
                    onClick={() => setDeletePostId(post.id)}
                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive/50 hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {/* Image lightbox */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-background">
          {expandedImage && (
            <img src={expandedImage} alt="" className="w-full h-full object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
      <ConfirmSheet
        open={!!deletePostId}
        onOpenChange={(open) => { if (!open) setDeletePostId(null); }}
        title="Ta bort inlägg"
        description="Är du säker på att du vill ta bort detta inlägg? Det går inte att ångra."
        confirmLabel="Ta bort"
        onConfirm={() => { if (deletePostId) handleDelete(deletePostId); setDeletePostId(null); }}
      />
    </Card>
  );
};

export default LifeSectionCard;
