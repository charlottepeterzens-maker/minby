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
              background: category === cat.key ? "#3C2A4D" : cat.bg,
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
        <div className="flex items-center gap-3 rounded-[12px] border border-border p-2">
          <img src={previewImage} alt="" className="w-14 h-14 rounded-[8px] object-cover" />
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
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
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
        <h2 className="text-xs font-medium text-muted-foreground font-body">Tips & favoriter</h2>
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
                style={{ backgroundColor: "#EDE8F4" }}
              >
                <Plus className="w-3 h-3" style={{ color: "#3C2A4D" }} />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[20px]" style={{ backgroundColor: "#F7F3EF" }}>
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
              <button className="w-full flex items-center gap-3 rounded-[16px] border-[0.5px] border-dashed border-border p-4 text-left text-muted-foreground hover:text-foreground transition-colors">
                <div className="shrink-0 flex items-center justify-center rounded-full w-9 h-9 border border-dashed border-current">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[13px] font-medium">Dela dina favoriter</p>
                  <p className="text-[11px]">Tipsa om poddar, serier, produkter och mer</p>
                </div>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[20px]" style={{ backgroundColor: "#F7F3EF" }}>
              <SheetHeader>
                <SheetTitle className="font-display text-base">Lägg till tips</SheetTitle>
              </SheetHeader>
              {formContent}
            </SheetContent>
          </Sheet>
        ) : null
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
              />
            ))}
          </AnimatePresence>
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
          <SheetContent side="bottom" className="rounded-t-[20px]" style={{ backgroundColor: "#F7F3EF" }}>
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

const TipCard = ({
  tip,
  isOwner,
  isSaved,
  onDelete,
  onEdit,
  onSave,
  index,
}: {
  tip: Tip;
  isOwner: boolean;
  isSaved: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onSave: () => void;
  index: number;
}) => {
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

  const cat = CATEGORIES.find((c) => c.key === tip.category) || CATEGORIES[CATEGORIES.length - 1];

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
          borderRadius: 10,
          border: "0.5px solid #EDE8F4",
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
            <img
              src={signedUrl}
              alt={tip.title
                .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
                .replace(/&amp;/g, "&")
                .replace(/&quot;/g, '"')}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontSize: 18, color: cat.color, fontWeight: 500 }}>{cat.label.charAt(0)}</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "#3C2A4D",
              margin: "0 0 3px",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {tip.title.replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))}
          </p>
          {tip.comment && (
            <p
              style={{
                fontSize: 11,
                color: "#7A6A85",
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
                      borderRadius: "50%",
                    }}
                  >
                    <MoreHorizontal style={{ width: 14, height: 14, color: "#C9B8D8" }} />
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
                  <BookmarkCheck style={{ width: 14, height: 14, color: "#3C2A4D" }} />
                ) : (
                  <Bookmark style={{ width: 14, height: 14, color: "#C9B8D8" }} />
                )}
              </button>
            )}
          </div>
          <span
            style={{
              borderRadius: 20,
              fontSize: 9,
              padding: "2px 7px",
              background: cat.bg,
              color: cat.color,
              fontWeight: 500,
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
          style={{ backgroundColor: "#F7F3EF", padding: 0, maxHeight: "85vh" }}
        >
          {signedUrl && (
            <div style={{ width: "100%", aspectRatio: "4/3", overflow: "hidden", borderRadius: "20px 20px 0 0" }}>
              <img src={signedUrl} alt={tip.title.replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/&amp;/g, "&").replace(/&quot;/g, '"') style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <span
              style={{
                borderRadius: 20,
                fontSize: 10,
                padding: "3px 10px",
                background: cat.bg,
                color: cat.color,
                fontWeight: 500,
                alignSelf: "flex-start",
              }}
            >
              {cat.label}
            </span>
            <p style={{ fontSize: 16, fontWeight: 500, color: "#3C2A4D", margin: 0, lineHeight: 1.3 }}>{tip.title.replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/&amp;/g, "&").replace(/&quot;/g, '"')}</p>
            {tip.comment && (
              <p style={{ fontSize: 13, color: "#7A6A85", margin: 0, lineHeight: 1.5 }}>"{tip.comment}"</p>
            )}
            {tip.url && (
              <a
                href={tip.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  color: "#3C2A4D",
                  background: "#EDE8F4",
                  borderRadius: 8,
                  padding: "8px 12px",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                <ExternalLink style={{ width: 14, height: 14 }} />
                Öppna länk
              </a>
            )}
            {isOwner && (
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => {
                    setDetailOpen(false);
                    onEdit();
                  }}
                  style={{
                    flex: 1,
                    background: "#EDE8F4",
                    color: "#3C2A4D",
                    borderRadius: 10,
                    padding: "9px",
                    fontSize: 12,
                    fontWeight: 500,
                    border: "none",
                  }}
                >
                  Redigera
                </button>
                <button
                  onClick={() => {
                    setDetailOpen(false);
                    onDelete();
                  }}
                  style={{
                    background: "#3C2A4D",
                    color: "#A32D2D",
                    borderRadius: 10,
                    padding: "9px 14px",
                    fontSize: 12,
                    border: "none",
                  }}
                >
                  Ta bort
                </button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default TipsFavorites;
