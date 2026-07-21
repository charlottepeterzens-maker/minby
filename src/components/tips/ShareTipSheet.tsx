import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { BottomSheetBody, BottomSheetContent, BottomSheetFooter, BottomSheetHeader } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TextButton from "@/components/ui/text-button";
import CircleSelector, { type CircleOption } from "@/components/ui/circle-selector";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const TIP_CATEGORIES = [
  "Läsa",
  "Lyssna",
  "Titta",
  "Äta",
  "Uppleva",
  "Njuta",
  "Shoppa",
] as const;
export type TipCategory = (typeof TIP_CATEGORIES)[number];

export interface CreatedTip {
  id: string;
  title: string;
  url: string | null;
  comment: string | null;
  category: string | null;
  image_path: string | null;
  image_url: string | null;
  created_at: string;
  circle_ids: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  circles: CircleOption[];
  defaultCircleIds?: string[];
  /** Storage prefix for uploaded images. Falls back to first selected circle. */
  storagePrefix?: string;
  onCreated: (tip: CreatedTip) => void;
}

/**
 * Share Tip — layered bottom sheet. Opened from the Tips list.
 * Fixed height (~85dvh), sticky header + footer, only the body scrolls.
 */
const ShareTipSheet = ({
  open,
  onOpenChange,
  userId,
  circles,
  defaultCircleIds = [],
  storagePrefix,
  onCreated,
}: Props) => {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<TipCategory | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedCircles, setSelectedCircles] = useState<string[]>(defaultCircleIds);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);
  const [linkPreview, setLinkPreview] = useState<{ url: string; image: string | null } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewSeq = useRef(0);

  const reset = () => {
    setTitle("");
    setTitleTouched(false);
    setUrl("");
    setCategory(null);
    setCategoryOpen(false);
    setComment("");
    setSelectedCircles(defaultCircleIds);
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setLinkPreview(null);
    setPreviewLoading(false);
  };

  useEffect(() => {
    if (open) setSelectedCircles(defaultCircleIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Debounced link preview: autofill title, cache image for later upload
  useEffect(() => {
    const trimmed = url.trim();
    if (!open || !trimmed || !/^https?:\/\/|^www\.|^[a-z0-9-]+\.[a-z]{2,}/i.test(trimmed)) {
      setLinkPreview(null);
      return;
    }
    if (linkPreview && linkPreview.url === trimmed) return;
    const seq = ++previewSeq.current;
    setPreviewLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke("fetch-link-preview", {
          body: { url: trimmed },
        });
        if (seq !== previewSeq.current) return;
        const previewTitle: string | null = data?.title ?? null;
        const previewImage: string | null = data?.image ?? null;
        setLinkPreview({ url: trimmed, image: previewImage });
        if (previewTitle && !titleTouched && !title.trim()) {
          setTitle(previewTitle);
        }
      } catch {
        if (seq === previewSeq.current) setLinkPreview({ url: trimmed, image: null });
      } finally {
        if (seq === previewSeq.current) setPreviewLoading(false);
      }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, open]);

  const canSubmit = title.trim().length > 0 && selectedCircles.length > 0 && !saving;

  const handleFile = (f: File) => {
    setImageFile(f);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const bucketPrefix = storagePrefix ?? selectedCircles[0];
    let imagePath: string | null = null;
    const trimmedUrl = url.trim();

    try {
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() || "jpg";
        const path = `${bucketPrefix}/tips/${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("circle-photos")
          .upload(path, imageFile, { contentType: imageFile.type });
        if (error) throw error;
        imagePath = path;
      } else if (trimmedUrl) {
        try {
          const { data: preview } = await supabase.functions.invoke("fetch-link-preview", {
            body: { url: trimmedUrl, uploadBucket: "circle-photos", uploadPrefix: `${bucketPrefix}/tips` },
          });
          if (preview?.storagePath) imagePath = preview.storagePath as string;
        } catch {
          /* preview is best-effort */
        }
      }

      const { data, error } = await supabase
        .from("tips")
        .insert({
          owner_id: userId,
          title: title.trim(),
          url: trimmedUrl || null,
          comment: comment.trim() || null,
          category: category ?? null,
          image_path: imagePath,
        })
        .select("id, title, url, comment, category, image_path, created_at")
        .single();
      if (error || !data) throw error ?? new Error("Kunde inte spara");

      const { error: visErr } = await supabase
        .from("tip_visibility")
        .insert(selectedCircles.map((c) => ({ tip_id: data.id, circle_id: c })));
      if (visErr) throw visErr;

      let signedUrl: string | null = null;
      if (data.image_path) {
        const { data: s } = await supabase.storage
          .from("circle-photos")
          .createSignedUrl(data.image_path, 60 * 60);
        signedUrl = s?.signedUrl ?? null;
      }

      onCreated({
        id: data.id,
        title: data.title,
        url: data.url,
        comment: data.comment,
        category: (data as any).category ?? null,
        image_path: data.image_path,
        image_url: signedUrl,
        created_at: data.created_at,
        circle_ids: selectedCircles,
      });
      toast.success("Tipset är delat");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Kunde inte dela tipset");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <BottomSheetContent>
        <BottomSheetHeader title="Dela ett tips" />

        {/* Scrollable body */}
        <BottomSheetBody className="px-5 pt-4 pb-6 space-y-5">
          {/* Titel */}
          <div className="space-y-2">
            <div className="text-eyebrow uppercase" style={{ color: "#675332" }}>
              Titel
            </div>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleTouched(true);
              }}
              placeholder="Namnge ditt tips"
              className="h-11 rounded-lg"
            />
          </div>

          {/* Länk */}
          <div className="space-y-2">
            <div className="text-eyebrow uppercase" style={{ color: "#675332" }}>
              Länk
            </div>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              className="h-11 rounded-lg"
            />
            {(previewLoading || linkPreview?.image) && !imagePreview && (
              <div className="flex items-center gap-3 pt-1">
                <div
                  className="w-12 h-12 rounded-[12px] bg-cover bg-center flex-shrink-0"
                  style={{
                    backgroundImage: linkPreview?.image ? `url(${linkPreview.image})` : undefined,
                    backgroundColor: "#F2ECE3",
                  }}
                />
                <span className="text-caption" style={{ color: "hsl(20, 4%, 40%)" }}>
                  {previewLoading ? "Hämtar förhandsvisning…" : "Bild hämtad från länken"}
                </span>
              </div>
            )}
          </div>

          {/* Kategori */}
          <div className="space-y-2">
            <div className="text-eyebrow uppercase" style={{ color: "#675332" }}>
              Kategori
            </div>
            <button
              type="button"
              onClick={() => setCategoryOpen((v) => !v)}
              aria-expanded={categoryOpen}
              className="w-full flex items-center justify-between py-3 text-left"
            >
              <span className="text-body" style={{ color: "#2B2B2B" }}>
                {category ?? "Välj kategori"}
              </span>
              <ChevronDown
                className={cn("w-4 h-4 transition-transform", categoryOpen && "rotate-180")}
                style={{ color: "hsl(20, 4%, 40%)" }}
              />
            </button>
            {categoryOpen && (
              <div className="space-y-1 pb-1">
                {TIP_CATEGORIES.map((c) => {
                  const active = category === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCategory(c);
                        setCategoryOpen(false);
                      }}
                      className="w-full flex items-center gap-3 py-2.5 text-left"
                    >
                      <span
                        className="w-5 h-5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: active ? "#561828" : "transparent",
                          border: active ? "5px solid #561828" : "1.5px solid #DDD2BF",
                          boxShadow: active ? "inset 0 0 0 2px #fff" : "none",
                        }}
                      />
                      <span className="text-body" style={{ color: "#2B2B2B" }}>
                        {c}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Kommentar */}
          <div className="space-y-2">
            <div className="text-eyebrow uppercase" style={{ color: "#675332" }}>
              Kommentar
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Berätta varför du gillar det"
              className="rounded-lg resize-none min-h-[120px]"
            />
          </div>

          {/* Foto */}
          <div className="space-y-2">
            <div className="text-eyebrow uppercase" style={{ color: "#675332" }}>
              Foto
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            {imagePreview ? (
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-[16px] bg-cover bg-center flex-shrink-0"
                  style={{ backgroundImage: `url(${imagePreview})` }}
                />
                <div className="flex flex-col items-start gap-1">
                  <TextButton onClick={() => fileRef.current?.click()}>Byt foto</TextButton>
                  <TextButton
                    variant="secondary"
                    onClick={() => {
                      setImageFile(null);
                      if (imagePreview) URL.revokeObjectURL(imagePreview);
                      setImagePreview(null);
                    }}
                  >
                    Ta bort
                  </TextButton>
                </div>
              </div>
            ) : (
              <TextButton onClick={() => fileRef.current?.click()}>Lägg till foto</TextButton>
            )}
          </div>

          {/* Dela med */}
          <CircleSelector
            circles={circles}
            value={selectedCircles}
            onChange={setSelectedCircles}
          />
        </div>

        {/* Sticky footer */}
        <div
          className="shrink-0 px-5 pt-3 pb-4 flex justify-end"
          style={{
            backgroundColor: "#FFFFFF",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          }}
        >
          <TextButton onClick={submit} disabled={!canSubmit}>
            {saving ? "Delar…" : "Dela tips"}
          </TextButton>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ShareTipSheet;
