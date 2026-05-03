import { useState, useEffect, useCallback, useRef } from "react";
import { possessive } from "@/utils/possessive";
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
import TipCommentSection, { useCommentCount } from "@/components/profile/TipCommentSection";
import { MessageCircle } from "lucide-react";

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
  { key: "lyssna", label: "Lyssna", bg: "#D4E8F5", color: "hsl(var(--color-text-primary))" },
  { key: "titta", label: "Titta", bg: "#561828", color: "#F7F3EF" },
  { key: "läsa", label: "Läsa", bg: "#FCF0F3", color: "#4B1528" },
  { key: "hälsa", label: "Hälsa", bg: "#F8F0D8", color: "hsl(var(--color-accent-sage-text))" },
  { key: "mat", label: "Mat", bg: "#FAEEDA", color: "#633806" },
  { key: "shoppa", label: "Shoppa", bg: "#E8D5DA", color: "#4B1528" },
  { key: "vardagslyx", label: "Vardagslyx", bg: "#D4E8F5", color: "hsl(var(--color-text-secondary))" },
];

const decodeTitle = (title: string) =>
  title
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

const TipsFavorites = ({ userId, isOwner, displayName }: { userId: string; isOwner: boolean; displayName?: string | null }) => {
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
  const [category, setCategory] = useState("lyssna");
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
        const { data, error } = await supabase.functions.invoke("fetch-link-preview", { body: { url: formatted } });
        if (!error && data) {
          if (data.title && !title) setTitle(data.title);
          if (data.image && !customImage) setPreviewImage(data.image);
        }
      } catch {
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
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, "_").toLowerCase();
    const path = `${user.id}/${Date.now()}-${sanitizedName}`;
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
    setCategory("lyssna");
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
      await supabase.from("saved_tips").insert({ user_id: user.id, original_tip_id: tipId });
      setSavedTipIds((prev) => new Set(prev).add(tipId));
    }
  };

  if (loading) return null;

  const formContent = (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{
              background: category === cat.key ? "#561828" : cat.bg,
              color: category === cat.key ? "#F7F3EF" : cat.color,
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <Input placeholder="Namn på tipset" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
      <Input
        placeholder="Länk (valfritt)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={() => fetchLinkPreview(url)}
        onPaste={(e) => {
          const p = e.clipboardData.getData("text");
          setTimeout(() => fetchLinkPreview(p), 100);
        }}
        type="url"
      />
      <Textarea
        placeholder="Din kommentar – varför tipsar du om det här?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={200}
        className="min-h-[60px] resize-none"
      />
      {fetchingPreview && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Hämtar förhandsgranskning...
        </div>
      )}
      {previewImage && !customImage && (
        <div className="flex items-center gap-3 rounded-lg p-2 shadow-[0_1px_4px_0_hsl(0_0%_0%/0.05)]">
          <img src={previewImage} alt="" loading="lazy" className="w-14 h-14 rounded-lg object-cover" />
          <p className="text-[11px] text-muted-foreground flex-1">Bild hittad från länken</p>
          <button onClick={() => setPreviewImage(null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
          style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}
        >
          <Camera className="w-4 h-4" />
          {customImage ? "Byt bild" : "Lägg till bild"}
        </button>
        {customImage && (
          <button onClick={() => setCustomImage(null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <Button onClick={handleAddOrUpdate} disabled={!title.trim()} className="w-full">
        {editingTip ? "Spara" : "Lägg till tips"}
      </Button>
      <p className="text-[11px] text-center text-muted-foreground">
        {tips.length} av {MAX_TIPS} tips
      </p>
    </div>
  );

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-fraunces font-normal text-[16px] mt-8 mb-3" style={{ color: "hsl(var(--color-text-primary))" }}>
          {isOwner ? "Mina tips & favoriter" : `${possessive(displayName || "Deras")} tips & favoriter`}
        </h2>
        {isOwner && tips.length < MAX_TIPS && (
          <Sheet
            open={sheetOpen}
            onOpenChange={(open) => {
              setSheetOpen(open);
              if (!open) resetForm();
            }}
          >
            <SheetTrigger asChild>
              <button
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}
              >
                <Plus className="w-3 h-3" style={{ color: "hsl(var(--color-text-primary))" }} />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[20px]" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
              <SheetHeader>
                <SheetTitle className="font-display text-base">
                  {editingTip ? "Redigera tips" : "Lägg till tips"}
                </SheetTitle>
              </SheetHeader>
              {formContent}
            </SheetContent>
          </Sheet>
        )}
      </div>

      {tips.length === 0 ? (
        isOwner ? (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button className="w-full flex items-center gap-3 rounded-lg p-4 text-left text-muted-foreground hover:text-foreground transition-colors" style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}>
                <div className="shrink-0 flex items-center justify-center rounded-full w-9 h-9" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[13px] font-medium">Dela dina favoriter</p>
                  <p className="text-[11px]">Tipsa om poddar, serier, produkter och mer</p>
                </div>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[20px]" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
              <SheetHeader>
                <SheetTitle className="font-display text-base">Lägg till tips</SheetTitle>
              </SheetHeader>
              {formContent}
            </SheetContent>
          </Sheet>
        ) : null
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <TipListWithCounts
            tips={tips}
            isOwner={isOwner}
            savedTipIds={savedTipIds}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onSave={handleSave}
          />
        </div>
      )}

      {isOwner && editingTip && (
        <Sheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) resetForm();
          }}
        >
          <SheetContent side="bottom" className="rounded-t-[20px]" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
            <SheetHeader>
              <SheetTitle className="font-display text-base">Redigera tips</SheetTitle>
            </SheetHeader>
            {formContent}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

const TipListWithCounts = ({
  tips,
  isOwner,
  savedTipIds,
  onDelete,
  onEdit,
  onSave,
}: {
  tips: Tip[];
  isOwner: boolean;
  savedTipIds: Set<string>;
  onDelete: (id: string) => void;
  onEdit: (tip: Tip) => void;
  onSave: (id: string) => void;
}) => {
  const commentCounts = useCommentCount(tips.map((t) => t.id));
  return (
    <AnimatePresence>
      {tips.map((tip, i) => (
        <TipCard
          key={tip.id}
          tip={tip}
          isOwner={isOwner}
          isSaved={savedTipIds.has(tip.id)}
          onDelete={() => onDelete(tip.id)}
          onEdit={() => onEdit(tip)}
          onSave={() => onSave(tip.id)}
          index={i}
          commentCount={commentCounts[tip.id] || 0}
        />
      ))}
    </AnimatePresence>
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
  commentCount,
}: {
  tip: Tip;
  isOwner: boolean;
  isSaved: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onSave: () => void;
  index: number;
  commentCount: number;
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(tip.title);
  const [editComment, setEditComment] = useState(tip.comment || "");
  const [editUrl, setEditUrl] = useState(tip.url || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editMode) {
      setEditTitle(tip.title);
      setEditComment(tip.comment || "");
      setEditUrl(tip.url || "");
    }
  }, [editMode, tip.title, tip.comment, tip.url]);

  const handleInlineSave = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("user_tips")
      .update({
        title: editTitle.trim(),
        comment: editComment.trim() || null,
        url: editUrl.trim() || null,
      })
      .eq("id", tip.id);
    setSaving(false);
    if (error) {
      toast({ title: "Kunde inte spara", description: error.message, variant: "destructive" });
      return;
    }
    // mutate local tip for instant feedback
    tip.title = editTitle.trim();
    tip.comment = editComment.trim() || null;
    tip.url = editUrl.trim() || null;
    setEditMode(false);
  };

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

  const cat = CATEGORIES.find((c) => c.key === tip.category) || CATEGORIES[CATEGORIES.length - 1];
  const displayTitle = decodeTitle(tip.title);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ delay: index * 0.06 }}
        onClick={() => setDetailOpen(true)}
        className="cursor-pointer"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          background: "#fff",
          borderRadius: 8,
          border: "none",
          padding: "10px",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            background: signedUrl ? "transparent" : cat.bg,
            flexShrink: 0,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {signedUrl ? (
            <img src={signedUrl} alt={displayTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 18, color: cat.color, fontWeight: 500 }}>{cat.label.charAt(0)}</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "hsl(var(--color-text-primary))",
              margin: "0 0 3px",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {displayTitle}
          </p>
          {tip.comment && (
            <p
              style={{
                fontSize: 11,
                color: "hsl(var(--color-text-secondary))",
                margin: 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              "{tip.comment}"
            </p>
          )}
        </div>

        <div
          style={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            justifyContent: "space-between",
            alignSelf: "stretch",
          }}
        >
          {commentCount > 0 && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: "auto", marginTop: 2 }}
            >
              <MessageCircle style={{ width: 12, height: 12, color: "hsl(var(--color-text-faint))" }} />
              <span style={{ fontSize: 10, color: "hsl(var(--color-text-faint))" }}>{commentCount}</span>
            </div>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            {isOwner ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    style={{
                      width: 24,
                      height: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 8,
                    }}
                  >
                    <MoreHorizontal style={{ width: 14, height: 14, color: "hsl(var(--color-border-lavender))" }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[120px]">
                  <DropdownMenuItem onClick={onEdit} className="gap-2 text-xs">
                    <Pencil className="w-3.5 h-3.5" /> Redigera
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="gap-2 text-xs text-destructive">
                    <Trash2 className="w-3.5 h-3.5" /> Ta bort
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSave();
                }}
              >
                {isSaved ? (
                  <BookmarkCheck style={{ width: 14, height: 14, color: "hsl(var(--color-text-primary))" }} />
                ) : (
                  <Bookmark style={{ width: 14, height: 14, color: "hsl(var(--color-border-lavender))" }} />
                )}
              </button>
            )}
          </div>
          <span
            style={{
              fontSize: 12, fontWeight: 400, color: "hsl(var(--color-text-secondary))",
            }}
          >
            {cat.label}
          </span>
        </div>
      </motion.div>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-[20px]"
          style={{ backgroundColor: "#FFFFFF", padding: 0, maxHeight: "85vh" }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div style={{ padding: "20px 16px 0", display: "flex", flexDirection: "column" }}>
            <span
              className="text-[11px] font-medium tracking-[0.04em]"
              style={{ color: "hsl(20, 4%, 54%)", marginBottom: 16 }}
            >
              Tips
            </span>
            {signedUrl && (
              <img
                src={signedUrl}
                alt={displayTitle}
                style={{ height: 160, borderRadius: 8, width: "100%", objectFit: "cover", marginBottom: 16 }}
              />
            )}
            {editMode ? (
              <>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={80}
                  placeholder="Titel"
                  className="text-[18px] font-medium leading-snug mb-2 w-full"
                  style={{
                    color: "hsl(20, 10%, 12%)",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    padding: 0,
                    fontFamily: "inherit",
                    WebkitAppearance: "none",
                    borderRadius: 0,
                  }}
                />
                <textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  maxLength={200}
                  placeholder="Din kommentar"
                  rows={3}
                  className="text-[15px] font-light leading-relaxed mb-3 w-full resize-none"
                  style={{
                    color: "hsl(20, 6%, 40%)",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    padding: 0,
                    fontFamily: "inherit",
                  }}
                />
                <input
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="Länk (valfritt)"
                  type="url"
                  className="text-[13px] mb-5 w-full"
                  style={{
                    color: "#561828",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    padding: 0,
                    fontFamily: "inherit",
                    WebkitAppearance: "none",
                    borderRadius: 0,
                  }}
                />
              </>
            ) : (
              <>
                <h2 className="text-[18px] font-medium leading-snug mb-2" style={{ color: "hsl(20, 10%, 12%)" }}>
                  {displayTitle}
                </h2>
                {tip.comment && (
                  <p className="text-[15px] font-light leading-relaxed mb-4" style={{ color: "hsl(20, 6%, 40%)" }}>
                    {tip.comment}
                  </p>
                )}
                {tip.url && (
                  <button
                    className="flex items-center gap-1.5 text-[13px] font-medium mb-5"
                    style={{ color: "#561828", background: "none", border: "none", fontFamily: "inherit", padding: 0, cursor: "pointer" }}
                    onClick={() => window.open(tip.url!, "_blank")}
                  >
                    Öppna tipset
                    <ExternalLink size={12} strokeWidth={2} />
                  </button>
                )}
              </>
            )}
            <TipCommentSection tipId={tip.id} tipOwnerId={tip.user_id} tipTitle={tip.title} />
            {isOwner && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, padding: "16px 20px 0" }}>
                {editMode ? (
                  <>
                    <button
                      onClick={() => setEditMode(false)}
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 400, background: "none", border: "none", cursor: "pointer", color: "hsl(20, 4%, 54%)", fontFamily: "inherit" }}
                    >
                      Avbryt
                    </button>
                    <button
                      onClick={handleInlineSave}
                      disabled={saving || !editTitle.trim()}
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, background: "none", border: "none", cursor: "pointer", color: "#561828", fontFamily: "inherit" }}
                    >
                      {saving ? "Sparar…" : "Spara"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditMode(true)}
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 400, background: "none", border: "none", cursor: "pointer", color: "hsl(20, 4%, 54%)", fontFamily: "inherit" }}
                    >
                      <Pencil size={13} strokeWidth={1.8} />
                      Redigera
                    </button>
                <button
                  onClick={() => {
                    setDetailOpen(false);
                    onDelete();
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 400, background: "none", border: "none", cursor: "pointer", color: "hsl(20, 4%, 54%)", fontFamily: "inherit" }}
                >
                  <Trash2 size={13} strokeWidth={1.8} />
                  Ta bort
                </button>
                  </>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default TipsFavorites;
