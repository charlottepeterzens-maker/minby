import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Sheet } from "@/components/ui/sheet";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
} from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TextButton from "@/components/ui/text-button";
import Typography from "@/components/ui/typography";
import CircleSelector, {
  type CircleOption,
} from "@/components/ui/circle-selector";

import { colors, radius, spacing } from "@/design-system";
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
  category: TipCategory | null;
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
  storagePrefix?: string;
  onCreated: (tip: CreatedTip) => void;
}

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
  const [selectedCircles, setSelectedCircles] =
    useState<string[]>(defaultCircleIds);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);
  const [linkPreview, setLinkPreview] = useState<{
    url: string;
    image: string | null;
  } | null>(null);
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

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview(null);
    setLinkPreview(null);
    setPreviewLoading(false);
  };

  useEffect(() => {
    if (open) {
      setSelectedCircles(defaultCircleIds);
    }
  }, [open, defaultCircleIds]);

  useEffect(() => {
    const trimmed = url.trim();

    if (
      !open ||
      !trimmed ||
      !/^https?:\/\/|^www\.|^[a-z0-9-]+\.[a-z]{2,}/i.test(trimmed)
    ) {
      setLinkPreview(null);
      return;
    }

    if (linkPreview?.url === trimmed) {
      return;
    }

    const seq = ++previewSeq.current;
    setPreviewLoading(true);

    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke(
          "fetch-link-preview",
          {
            body: { url: trimmed },
          },
        );

        if (seq !== previewSeq.current) return;

        const previewTitle: string | null = data?.title ?? null;
        const previewImage: string | null = data?.image ?? null;

        setLinkPreview({
          url: trimmed,
          image: previewImage,
        });

        if (previewTitle && !titleTouched && !title.trim()) {
          setTitle(previewTitle);
        }
      } catch {
        if (seq === previewSeq.current) {
          setLinkPreview({
            url: trimmed,
            image: null,
          });
        }
      } finally {
        if (seq === previewSeq.current) {
          setPreviewLoading(false);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [url, open, linkPreview, titleTouched, title]);

  const canSubmit =
    title.trim().length > 0 &&
    selectedCircles.length > 0 &&
    !saving;

  const handleFile = (file: File) => {
    setImageFile(file);

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    if (!canSubmit) return;

    setSaving(true);

    const bucketPrefix =
      storagePrefix ?? selectedCircles[0];

    let imagePath: string | null = null;
    const trimmedUrl = url.trim();

    try {
      if (imageFile) {
        const ext =
          imageFile.name.split(".").pop() || "jpg";

        const path =
          `${bucketPrefix}/tips/${userId}/${crypto.randomUUID()}.${ext}`;

        const { error } = await supabase.storage
          .from("circle-photos")
          .upload(path, imageFile, {
            contentType: imageFile.type,
          });

        if (error) throw error;

        imagePath = path;
      } else if (trimmedUrl) {
        try {
          const { data: preview } =
            await supabase.functions.invoke(
              "fetch-link-preview",
              {
                body: {
                  url: trimmedUrl,
                  uploadBucket: "circle-photos",
                  uploadPrefix: `${bucketPrefix}/tips`,
                },
              },
            );

          if (preview?.storagePath) {
            imagePath = preview.storagePath;
          }
        } catch {
          // Link preview is best-effort.
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
        .select(
          "id, title, url, comment, category, image_path, created_at",
        )
        .single();

      if (error || !data) {
        throw error ?? new Error("Kunde inte spara");
      }

      const { error: visibilityError } = await supabase
        .from("tip_visibility")
        .insert(
          selectedCircles.map((circleId) => ({
            tip_id: data.id,
            circle_id: circleId,
          })),
        );

      if (visibilityError) {
        throw visibilityError;
      }

      let signedUrl: string | null = null;

      if (data.image_path) {
        const { data: signed } =
          await supabase.storage
            .from("circle-photos")
            .createSignedUrl(
              data.image_path,
              60 * 60,
            );

        signedUrl = signed?.signedUrl ?? null;
      }

      onCreated({
        id: data.id,
        title: data.title,
        url: data.url,
        comment: data.comment,
        category: data.category as TipCategory | null,
        image_path: data.image_path,
        image_url: signedUrl,
        created_at: data.created_at,
        circle_ids: selectedCircles,
      });

      toast.success("Tipset är delat");

      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kunde inte dela tipset",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);

        if (!nextOpen) {
          reset();
        }
      }}
    >
      <BottomSheetContent>
        <BottomSheetHeader title="Dela ett tips" />

        <BottomSheetBody
          className={cn(
            "px-300 pt-300 pb-400",
            "space-y-400",
          )}
        >
          <div className="space-y-200">
            <Typography
              variant="meta"
              as="div"
              style={{
                color: colors.text.secondary,
              }}
            >
              Titel
            </Typography>

            <Input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setTitleTouched(true);
              }}
              placeholder="Namnge ditt tips"
              style={{
                borderRadius: radius[100],
                height: "44px",
              }}
            />
          </div>

          <div className="space-y-200">
            <Typography
              variant="meta"
              as="div"
              style={{
                color: colors.text.secondary,
              }}
            >
              Länk
            </Typography>

            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>

          <div className="space-y-200">
            <Typography
              variant="meta"
              as="div"
              style={{
                color: colors.text.secondary,
              }}
            >
              Kategori
            </Typography>

            <button
              type="button"
              onClick={() =>
                setCategoryOpen((current) => !current)
              }
              className="flex w-full items-center justify-between text-left"
              style={{
                minHeight: spacing[400],
              }}
            >
              <Typography variant="body" as="span">
                {category ?? "Välj kategori"}
              </Typography>

              <ChevronDown
                size={16}
                className={cn(
                  "transition-transform",
                  categoryOpen && "rotate-180",
                )}
                style={{
                  color: colors.text.secondary,
                }}
                aria-hidden="true"
              />
            </button>

            {categoryOpen && (
              <div className="space-y-100 pb-100">
                {TIP_CATEGORIES.map((item) => {
                  const active = category === item;

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setCategory(item);
                        setCategoryOpen(false);
                      }}
                      className="flex w-full items-center gap-200 py-200 text-left"
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: "20px",
                          height: "20px",
                          flexShrink: 0,
                          borderRadius: radius.full,
                          backgroundColor: active
                            ? colors.berry[300]
                            : "transparent",
                          border: active
                            ? `5px solid ${colors.berry[300]}`
                            : `1px solid ${colors.neutral.linen}`,
                          boxShadow: active
                            ? `inset 0 0 0 2px ${colors.neutral.white}`
                            : "none",
                        }}
                      />

                      <Typography
                        variant="body"
                        as="span"
                      >
                        {item}
                      </Typography>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-200">
            <Typography
              variant="meta"
              as="div"
              style={{
                color: colors.text.secondary,
              }}
            >
              Kommentar
            </Typography>

            <Textarea
              value={comment}
              onChange={(event) =>
                setComment(event.target.value)
              }
              placeholder="Berätta varför du gillar det"
              style={{
                borderRadius: radius[100],
                minHeight: "120px",
                resize: "none",
              }}
            />
          </div>

          <div className="space-y-200">
            <Typography
              variant="meta"
              as="div"
              style={{
                color: colors.text.secondary,
              }}
            >
              Foto
            </Typography>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  handleFile(file);
                }

                event.target.value = "";
              }}
            />

            {imagePreview ? (
              <div className="flex items-center gap-300">
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    flexShrink: 0,
                    borderRadius: radius[200],
                    backgroundImage: `url(${imagePreview})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />

                <div className="flex flex-col items-start gap-100">
                  <TextButton
                    onClick={() =>
                      fileRef.current?.click()
                    }
                  >
                    Byt foto
                  </TextButton>

                  <TextButton
                    variant="secondary"
                    onClick={() => {
                      setImageFile(null);

                      if (imagePreview) {
                        URL.revokeObjectURL(imagePreview);
                      }

                      setImagePreview(null);
                    }}
                  >
                    Ta bort
                  </TextButton>
                </div>
              </div>
            ) : (
              <TextButton
                onClick={() =>
                  fileRef.current?.click()
                }
              >
                Lägg till foto
              </TextButton>
            )}
          </div>

          <CircleSelector
            circles={circles}
            value={selectedCircles}
            onChange={setSelectedCircles}
          />
        </BottomSheetBody>

        <BottomSheetFooter className="flex justify-end">
          <TextButton
            onClick={submit}
            disabled={!canSubmit}
          >
            {saving ? "Delar…" : "Dela tips"}
          </TextButton>
        </BottomSheetFooter>
      </BottomSheetContent>
    </Sheet>
  );
};

export default ShareTipSheet;
