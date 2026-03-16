import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Camera,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface Tip {
  id: string;
  user_id: string;
  title: string;
  url: string | null;
  image_url: string | null;
  category: string;
  sort_order: number;
  created_at: string;
}

const MAX_TIPS = 5;

const CATEGORIES = [
  { key: "skincare", emoji: "🧴" },
  { key: "food", emoji: "🍽️" },
  { key: "podcast", emoji: "🎧" },
  { key: "book", emoji: "📖" },
  { key: "show", emoji: "📺" },
  { key: "salon", emoji: "💇" },
  { key: "workout", emoji: "💪" },
  { key: "product", emoji: "🛍️" },
  { key: "other", emoji: "✨" },
];

const TipsFavorites = ({
  userId,
  isOwner,
}: {
  userId: string;
  isOwner: boolean;
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tips, setTips] = useState<Tip[]>([]);
  const [savedTipIds, setSavedTipIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Add form state
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("other");
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTips = useCallback(async () => {
    const { data } = await supabase
      .from("user_tips")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });
    if (data) setTips(data);
    setLoading(false);
  }, [userId]);

  const fetchSavedTips = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("saved_tips")
      .select("original_tip_id")
      .eq("user_id", user.id);
    if (data) setSavedTipIds(new Set(data.map((s) => s.original_tip_id)));
  }, [user]);

  useEffect(() => {
    fetchTips();
    fetchSavedTips();
  }, [fetchTips, fetchSavedTips]);

  const fetchLinkPreview = useCallback(async (linkUrl: string) => {
    if (!linkUrl.trim()) return;
    let formatted = linkUrl.trim();
    if (!formatted.startsWith('http')) formatted = `https://${formatted}`;
    try { new URL(formatted); } catch { return; }

    setFetchingPreview(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-link-preview', {
        body: { url: formatted },
      });
      if (!error && data) {
        if (data.title && !title) setTitle(data.title);
        if (data.image && !customImage) setPreviewImage(data.image);
      }
    } catch {
      // silently fail
    } finally {
      setFetchingPreview(false);
    }
  }, [title, customImage]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/tip-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("life-images")
      .upload(path, file, { upsert: true });
    if (error) {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    } else {
      setCustomImage(path);
      setPreviewImage(null);
    }
    setUploading(false);
  };

  const handleAdd = async () => {
    if (!user || !title.trim()) return;
    if (tips.length >= MAX_TIPS) {
      toast({
        title: t("tipLimitReached"),
        description: t("tipLimitDesc"),
        variant: "destructive",
      });
      return;
    }

    // Use custom image, or OG preview image, or null
    let imageUrl = customImage || previewImage || null;

    const { error } = await supabase.from("user_tips").insert({
      user_id: user.id,
      title: title.trim(),
      url: url.trim() || null,
      image_url: imageUrl,
      category,
      sort_order: tips.length,
    });

    if (error) {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    } else {
      setTitle("");
      setUrl("");
      setCategory("other");
      setCustomImage(null);
      setSheetOpen(false);
      await fetchTips();
    }
  };

  const handleDelete = async (tipId: string) => {
    const { error } = await supabase.from("user_tips").delete().eq("id", tipId);
    if (!error) await fetchTips();
  };

  const handleSave = async (tipId: string) => {
    if (!user) return;
    if (savedTipIds.has(tipId)) {
      await supabase
        .from("saved_tips")
        .delete()
        .eq("user_id", user.id)
        .eq("original_tip_id", tipId);
      setSavedTipIds((prev) => {
        const next = new Set(prev);
        next.delete(tipId);
        return next;
      });
    } else {
      await supabase.from("saved_tips").insert({
        user_id: user.id,
        original_tip_id: tipId,
      });
      setSavedTipIds((prev) => new Set(prev).add(tipId));
    }
  };

  const categoryEmoji = (key: string) =>
    CATEGORIES.find((c) => c.key === key)?.emoji || "✨";

  if (loading) return null;

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: "#993556" }} />
          <h2 className="text-xs font-medium text-muted-foreground font-body">
            {t("tipsSectionTitle")}
          </h2>
        </div>
        {isOwner && tips.length < MAX_TIPS && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                {t("addTip")}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[20px] bg-[#F7F3EF]">
              <SheetHeader>
                <SheetTitle className="font-display text-base">
                  {t("addTip")}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                {/* Category picker */}
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setCategory(cat.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        category === cat.key
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat.emoji} {t(`tipCat_${cat.key}` as any) || cat.key}
                    </button>
                  ))}
                </div>

                <Input
                  placeholder={t("tipTitlePlaceholder")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                />

                <Input
                  placeholder={t("tipUrlPlaceholder")}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  type="url"
                />

                {/* Image upload */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    {customImage ? t("tipImageChanged") : t("tipAddImage")}
                  </button>
                  {customImage && (
                    <button
                      onClick={() => setCustomImage(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                <Button
                  onClick={handleAdd}
                  disabled={!title.trim()}
                  className="w-full"
                >
                  {t("addTip")}
                </Button>

                <p className="text-[11px] text-center text-muted-foreground">
                  {t("tipCountInfo", tips.length, MAX_TIPS)}
                </p>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* Tips grid */}
      {tips.length === 0 ? (
        isOwner ? (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button className="w-full flex items-center gap-3 rounded-[16px] border-[0.5px] border-dashed border-border p-4 text-left text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                <div className="shrink-0 flex items-center justify-center rounded-full w-9 h-9 border border-dashed border-current">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[13px] font-medium">{t("tipEmptyTitle")}</p>
                  <p className="text-[11px]">{t("tipEmptyDesc")}</p>
                </div>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[20px] bg-[#F7F3EF]">
              <SheetHeader>
                <SheetTitle className="font-display text-base">
                  {t("addTip")}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setCategory(cat.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        category === cat.key
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat.emoji} {t(`tipCat_${cat.key}` as any) || cat.key}
                    </button>
                  ))}
                </div>
                <Input placeholder={t("tipTitlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
                <Input placeholder={t("tipUrlPlaceholder")} value={url} onChange={(e) => setUrl(e.target.value)} type="url" />
                <div className="flex items-center gap-3">
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                    <Camera className="w-4 h-4" />
                    {customImage ? t("tipImageChanged") : t("tipAddImage")}
                  </button>
                  {customImage && <button onClick={() => setCustomImage(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <Button onClick={handleAdd} disabled={!title.trim()} className="w-full">{t("addTip")}</Button>
                <p className="text-[11px] text-center text-muted-foreground">{t("tipCountInfo", tips.length, MAX_TIPS)}</p>
              </div>
            </SheetContent>
          </Sheet>
        ) : null
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {tips.map((tip, i) => (
              <TipCard
                key={tip.id}
                tip={tip}
                isOwner={isOwner}
                isSaved={savedTipIds.has(tip.id)}
                onDelete={() => handleDelete(tip.id)}
                onSave={() => handleSave(tip.id)}
                index={i}
                categoryEmoji={categoryEmoji}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

const TipCard = ({
  tip,
  isOwner,
  isSaved,
  onDelete,
  onSave,
  index,
  categoryEmoji,
}: {
  tip: Tip;
  isOwner: boolean;
  isSaved: boolean;
  onDelete: () => void;
  onSave: () => void;
  index: number;
  categoryEmoji: (key: string) => string;
}) => {
  const { t } = useLanguage();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!tip.image_url) return;
    // If it's a storage path (not a full URL), get signed URL
    if (!tip.image_url.startsWith("http")) {
      supabase.storage
        .from("life-images")
        .createSignedUrl(tip.image_url, 3600)
        .then(({ data }) => {
          if (data?.signedUrl) setSignedUrl(data.signedUrl);
        });
    } else {
      setSignedUrl(tip.image_url);
    }
  }, [tip.image_url]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 rounded-[16px] border-[0.5px] border-border bg-card p-3"
    >
      {/* Thumbnail */}
      <div className="shrink-0 w-12 h-12 rounded-[10px] overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: "#EDE8F4" }}
      >
        {signedUrl ? (
          <img src={signedUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg">{categoryEmoji(tip.category)}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground truncate">
          {tip.title}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {categoryEmoji(tip.category)}{" "}
          {t(`tipCat_${tip.category}` as any) || tip.category}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {tip.url && (
          <a
            href={tip.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
        )}
        {isOwner ? (
          <button
            onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        ) : (
          <button
            onClick={onSave}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            {isSaved ? (
              <BookmarkCheck className="w-4 h-4 text-primary" />
            ) : (
              <Bookmark className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default TipsFavorites;
