import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Image, Link, Trash2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LifePost {
  id: string;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  link_title: string | null;
  created_at: string;
}

interface Props {
  section: { id: string; name: string; emoji: string; min_tier: string };
  isOwner: boolean;
}

const tierBadge: Record<string, string> = {
  close: "💖",
  inner: "🤝",
  outer: "🌍",
};

const LifeSectionCard = ({ section, isOwner }: Props) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<LifePost[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

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

  const handlePost = async () => {
    if (!user || (!content.trim() && !imageFile && !linkUrl.trim())) return;
    setPosting(true);

    let image_url: string | null = null;
    if (imageFile) {
      const filePath = `${user.id}/${Date.now()}-${imageFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("life-images").upload(filePath, imageFile);
      if (uploadErr) {
        toast.error("Image upload failed");
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
      toast.error("Could not post");
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
    <Card className="rounded-2xl border-border/50 shadow-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <span className="text-xl">{section.emoji}</span>
            {section.name}
            {isOwner && <span className="text-xs">{tierBadge[section.min_tier]}</span>}
          </CardTitle>
          {isOwner && (
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => setShowCompose(!showCompose)}>
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Compose */}
        <AnimatePresence>
          {showCompose && isOwner && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
              <div className="bg-muted/30 rounded-xl p-3 space-y-2">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's new?"
                  className="rounded-xl bg-background/50 border-border/30 min-h-[60px] text-sm"
                />
                <div className="flex gap-2 items-center">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${imageFile ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-border/50 hover:bg-muted"}`}>
                      <Image className="w-3 h-3" /> {imageFile ? imageFile.name.slice(0, 15) : "Photo"}
                    </span>
                  </label>
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Paste a link..."
                    className="flex-1 h-7 text-xs rounded-full bg-background/50 border-border/30"
                  />
                  <Button size="sm" disabled={posting} onClick={handlePost} className="rounded-full h-7 px-3">
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Posts */}
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 text-center py-4">No updates yet</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="group relative">
                {post.image_url && (
                  <img src={post.image_url} alt="" className="w-full rounded-xl mb-2 max-h-64 object-cover" />
                )}
                {post.content && <p className="text-sm text-foreground">{post.content}</p>}
                {post.link_url && (
                  <a href={post.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                    <Link className="w-3 h-3" /> {post.link_url.slice(0, 40)}...
                  </a>
                )}
                <p className="text-xs text-muted-foreground/50 mt-1">
                  {new Date(post.created_at).toLocaleDateString()}
                </p>
                {isOwner && (
                  <button
                    onClick={() => handleDelete(post.id)}
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
    </Card>
  );
};

export default LifeSectionCard;
