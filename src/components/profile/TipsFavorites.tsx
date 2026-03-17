import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Camera,
  Trash2,
  Loader2,
  Pencil,
  MoreHorizontal,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Tip {
  id: string;
  user_id: string;
  title: string;
  url: string | null;
  image_url: string | null;
  comment: string | null;
  category: string;
  sort_order: number;
  created_at: string;
}

const MAX_TIPS = 6;

const CATEGORIES = [
  { key: "lyssna", label: "Lyssna", bg: "#EDE8F4", color: "#3C2A4D" },
  { key: "titta", label: "Titta", bg: "#3C2A4D", color: "#F7F3EF" },
  { key: "läsa", label: "Läsa", bg: "#FCF0F3", color: "#4B1528" },
  { key: "hälsa", label: "Hälsa", bg: "#EAF2E8", color: "#1F4A1A" },
  { key: "mat", label: "Mat", bg: "#FAEEDA", color: "#633806" },
  { key: "shoppa", label: "Shoppa", bg: "#E8D5DA", color: "#4B1528" },
  { key: "vardagslyx", label: "Vardagslyx", bg: "#EDE8F4", color: "#7A6A85" },
];

const TipsFavorites = ({ userId, isOwner }: { userId: string; isOwner: boolean }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tips, setTips] = useState<Tip[]>([]);
  const [savedTipIds, setSavedTipIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTip, setEditingTip] = useState<Tip | null>(null);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [comment, setComment] = useState("");
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
    if (data) setTips(data as Tip[]);
    setLoading(false);
  }, [userId]);

  const fetchSavedTips = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("saved_tips").select("original_tip_id").eq("user_id", user.id);
    if (data) setSavedTipIds(new Set(data.map((s) => s.original_tip_id)));
  }, [user]);

  useEffect(() => {
    fetchTips();
    fetchSavedTips();
  }, [fetchTips, fetchSavedTips]);

  const fetchLinkPreview = useCallback(
    async (linkUrl: string) => {
      if (!linkUrl.trim()) return;
      let formatted = linkUrl.trim();
      if (!formatted.startsWith("http")) formatted = `https://${formatted}`;
      try {
        new URL(formatted);
      } catch {
        return;
      }

      setFetchingPreview(true);
      try {
        const { data, error } = await supabase.functions.invoke("fetch-link-preview", {
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
    },
    [title, customImage],
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/tip-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("life-images").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    } else {
      setCustomImage(path);
      setPreviewImage(null);
    }
    setUploading(false);
  };

  const resetForm = () => {
    setTitle("");
    setUrl("");
    setComment("");
    setCategory("other");
    setCustomImage(null);
    setPreviewImage(null);
    setEditingTip(null);
  };

  const handleEdit = (tip: Tip) => {
    setEditingTip(tip);
    setTitle(tip.title);
    setUrl(tip.url || "");
    setComment(tip.comment || "");
    setCategory(tip.category);
    setCustomImage(tip.image_url && !tip.image_url.startsWith("http") ? tip.image_url : null);
    setPreviewImage(tip.image_url && tip.image_url.startsWith("http") ? tip.image_url : null);
    setSheetOpen(true);
  };

  const handleAddOrUpdate = async () => {
    if (!user || !title.trim()) return;
    const imageUrl = customImage || previewImage || null;

    if (editingTip) {
      const { error } = await supabase
        .from("user_tips")
        .update({
          title: title.trim(),
          url: url.trim() || null,
          image_url: imageUrl,
          comment: comment.trim() || null,
          category,
        })
        .eq("id", editingTip.id);
      if (error) {
        toast({ title: t("error"), description: error.message, variant: "destructive" });
      } else {
        resetForm();
        setSheetOpen(false);
        await fetchTips();
      }
    } else {
      if (tips.length >= MAX_TIPS) {
        toast({ title: t("tipLimitReached"), description: t("tipLimitDesc"), variant: "destructive" });
        return;
      }
      const { error } = await supabase.from("user_tips").insert({
        user_id: user.id,
        title: title.trim(),
        url: url.trim() || null,
        image_url: imageUrl,
        comment: comment.trim() || null,
        category,
        sort_order: tips.length,
      });
      if (error) {
        toast({ title: t("error"), description: error.message, variant: "destructive" });
      } else {
        resetForm();
        setSheetOpen(false);
        await fetchTips();
      }
    }
  };

  const handleDelete = async (tipId: string) => {
    const { error } = await supabase.from("user_tips").delete().eq("id", tipId);
    if (!error) await fetchTips();
  };

  const handleSave = async (tipId: string) => {
    if (!user) return;
    if (savedTipIds.has(tipId)) {
      await supabase.from("saved_tips").delete().eq("user_id", user.id).eq("original_tip_id", tipId);
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

  const categoryEmoji = (key: string) => CATEGORIES.find((c) => c.key === key)?.emoji || "✨";

  if (loading) return null;

  const formContent = (
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
        onBlur={() => fetchLinkPreview(url)}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData("text");
          setTimeout(() => fetchLinkPreview(pasted), 100);
        }}
        type="url"
      />

      <Textarea
        placeholder={t("tipCommentPlaceholder")}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={200}
        className="min-h-[60px] resize-none"
      />

      {fetchingPreview && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {t("tipFetchingPreview")}
        </div>
      )}
      {previewImage && !customImage && (
        <div className="flex items-center gap-3 rounded-[12px] border border-border p-2">
          <img src={previewImage} alt="" className="w-14 h-14 rounded-[8px] object-cover" />
          <p className="text-[11px] text-muted-foreground flex-1">{t("tipPreviewFound")}</p>
          <button onClick={() => setPreviewImage(null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
          <button onClick={() => setCustomImage(null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      <Button onClick={handleAddOrUpdate} disabled={!title.trim()} className="w-full">
        {editingTip ? t("tipSave") : t("addTip")}
      </Button>

      <p className="text-[11px] text-center text-muted-foreground">{t("tipCountInfo", tips.length, MAX_TIPS)}</p>
    </div>
  );

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium text-muted-foreground font-body">{t("tipsSectionTitle")}</h2>
        {isOwner && tips.length < MAX_TIPS && (
          <Sheet
            open={sheetOpen}
            onOpenChange={(open) => {
              setSheetOpen(open);
              if (!open) resetForm();
            }}
          >
            <SheetTrigger asChild>
              <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                {t("addTip")}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[20px] bg-[hsl(var(--background))]">
              <SheetHeader>
                <SheetTitle className="font-display text-base">{editingTip ? t("tipSave") : t("addTip")}</SheetTitle>
              </SheetHeader>
              {formContent}
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
            <SheetContent side="bottom" className="rounded-t-[20px] bg-[hsl(var(--background))]">
              <SheetHeader>
                <SheetTitle className="font-display text-base">{t("addTip")}</SheetTitle>
              </SheetHeader>
              {formContent}
            </SheetContent>
          </Sheet>
        ) : null
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          <AnimatePresence>
            {tips.map((tip, i) => (
              <TipCard
                key={tip.id}
                tip={tip}
                isOwner={isOwner}
                isSaved={savedTipIds.has(tip.id)}
                onDelete={() => handleDelete(tip.id)}
                onEdit={() => handleEdit(tip)}
                onSave={() => handleSave(tip.id)}
                index={i}
                categoryEmoji={categoryEmoji}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Hidden sheet for editing (triggered programmatically) */}
      {isOwner && editingTip && (
        <Sheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) resetForm();
          }}
        >
          <SheetContent side="bottom" className="rounded-t-[20px] bg-[hsl(var(--background))]">
            <SheetHeader>
              <SheetTitle className="font-display text-base">{t("tipSave")}</SheetTitle>
            </SheetHeader>
            {formContent}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

const TipCard = ({
  tip,
  isOwner,
  isSaved,
  onDelete,
  onEdit,
  onSave,
  index,
  categoryEmoji,
}: {
  tip: Tip;
  isOwner: boolean;
  isSaved: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onSave: () => void;
  index: number;
  categoryEmoji: (key: string) => string;
}) => {
  const { t } = useLanguage();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (!tip.image_url) return;
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

  const hasImage = !!signedUrl;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ delay: index * 0.08 }}
        className="relative w-full aspect-[4/5] rounded-[16px] overflow-hidden border-[0.5px] border-border group cursor-pointer"
        onClick={() => setDetailOpen(true)}
      >
        {/* Background */}
        {hasImage ? (
          <img src={signedUrl!} alt={tip.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <span className="text-3xl">{categoryEmoji(tip.category)}</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Three-dot menu (top right) - stop propagation so it doesn't open detail */}
        <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
          {isOwner ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-7 h-7 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors">
                  <MoreHorizontal className="w-3.5 h-3.5 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[120px]">
                <DropdownMenuItem onClick={onEdit} className="gap-2 text-xs">
                  <Pencil className="w-3.5 h-3.5" />
                  {t("tipEdit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="gap-2 text-xs text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                  {t("tipDelete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={onSave}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors"
            >
              {isSaved ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-white" />
              ) : (
                <Bookmark className="w-3.5 h-3.5 text-white" />
              )}
            </button>
          )}
        </div>

        {/* Text content (bottom) */}
        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          <p className="text-[13px] font-medium text-white leading-tight line-clamp-2">{tip.title}</p>
          {tip.comment && <p className="text-[11px] text-white/75 mt-1 leading-snug line-clamp-2">{tip.comment}</p>}
        </div>
      </motion.div>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="bottom" className="rounded-t-[20px] bg-[hsl(var(--background))] p-0 max-h-[85vh]">
          {/* Hero image */}
          {hasImage ? (
            <div className="relative w-full aspect-[4/3] overflow-hidden rounded-t-[20px]">
              <img src={signedUrl!} alt={tip.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          ) : (
            <div className="w-full aspect-[4/3] bg-muted rounded-t-[20px] flex items-center justify-center">
              <span className="text-5xl">{categoryEmoji(tip.category)}</span>
            </div>
          )}

          {/* Content */}
          <div className="p-5 space-y-3">
            {/* Category pill */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
              {categoryEmoji(tip.category)} {t(`tipCat_${tip.category}` as any) || tip.category}
            </span>

            {/* Title */}
            <h3 className="text-[17px] font-medium text-foreground leading-snug">{tip.title}</h3>

            {/* Comment */}
            {tip.comment && <p className="text-[13px] text-muted-foreground leading-relaxed">{tip.comment}</p>}

            {/* Link */}
            {tip.url && (
              <a
                href={tip.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[13px] text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {(() => {
                  try {
                    return new URL(tip.url).hostname.replace("www.", "");
                  } catch {
                    return tip.url;
                  }
                })()}
              </a>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              {isOwner ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs"
                    onClick={() => {
                      setDetailOpen(false);
                      onEdit();
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {t("tipEdit")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => {
                      setDetailOpen(false);
                      onDelete();
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t("tipDelete")}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={onSave}>
                  {isSaved ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4" />}
                  {isSaved ? t("tipSave") : t("tipAddImage").replace("bild", "spara")}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default TipsFavorites;
