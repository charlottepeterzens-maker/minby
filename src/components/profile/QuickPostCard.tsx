import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Plus, Send, RectangleHorizontal, LayoutList, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import CreateSectionDialog from "@/components/profile/CreateSectionDialog";
import { compressImage } from "@/utils/imageCompression";
import { resolveAvatarUrl } from "@/utils/avatarUrl";

interface LifeSection {
  id: string;
  name: string;
  emoji: string;
  min_tier: string;
}

interface Props {
  profile: { display_name: string | null; avatar_url: string | null } | null;
  sections: LifeSection[];
  onPosted: () => void;
  onSectionsChanged: () => void;
}

const QuickPostCard = ({ profile, sections, onPosted, onSectionsChanged }: Props) => {
  const { user } = useAuth();
  const [composing, setComposing] = useState(false);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [photoLayout, setPhotoLayout] = useState<"large" | "small">("large");
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const initial = profile?.display_name
    ? profile.display_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const handlePost = async () => {
    if (!user || (!content.trim() && !imageFile)) return;
    setPosting(true);

    let image_url: string | null = null;
    if (imageFile) {
      const compressed = await compressImage(imageFile);
      const sanitized = compressed.name.replace(/[^a-zA-Z0-9.]/g, "_").toLowerCase();
      const filePath = `${user.id}/${Date.now()}-${sanitized}`;
      const { error: uploadErr } = await supabase.storage.from("life-images").upload(filePath, compressed);
      if (uploadErr) {
        toast.error("Kunde inte ladda upp bild");
        setPosting(false);
        return;
      }
      image_url = filePath;
    }

    const { error } = await supabase.from("life_posts").insert({
      section_id: selectedSection || null,
      user_id: user.id,
      content: content.trim() || null,
      image_url,
      photo_layout: image_url ? photoLayout : "large",
    } as any);

    if (error) {
      toast.error("Kunde inte publicera");
    } else {
      setContent("");
      setImageFile(null);
      setPhotoLayout("large");
      setSelectedSection(null);
      setComposing(false);
      onPosted();
    }
    setPosting(false);
  };

  const reset = () => {
    setComposing(false);
    setContent("");
    setImageFile(null);
    setPhotoLayout("large");
    setSelectedSection(null);
  };

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "none",
        boxShadow: "0 1px 4px 0 rgba(0,0,0,0.04)",
        padding: "10px 12px",
      }}
    >
      {/* Collapsed state */}
      {!composing && (
        <div>
          <div className="flex items-center gap-3">
            <div
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}
            >
              {resolveAvatarUrl(profile?.avatar_url ?? null) ? (
                <img src={resolveAvatarUrl(profile?.avatar_url ?? null)!} alt="Profilbild" loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>{initial}</span>
              )}
            </div>
            <button
              onClick={() => setComposing(true)}
              className="flex-1 text-left"
              style={{
                background: "hsl(var(--color-surface))",
                border: "none",
                borderRadius: 99,
                padding: "6px 14px",
                fontSize: 11,
                color: "hsl(var(--color-text-faint))",
              }}
            >
              Dela något med din krets...
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <label style={{ cursor: "pointer" }}>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  setImageFile(e.target.files?.[0] || null);
                  setComposing(true);
                }}
              />
              <span
                className="inline-flex items-center gap-1"
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 99,
                   border: "none",
                  background: "hsl(var(--color-surface))",
                  color: "hsl(var(--color-text-secondary))",
                  cursor: "pointer",
                }}
              >
                <Camera className="w-3 h-3" /> Foto
              </span>
            </label>
            <CreateSectionDialog
              onCreated={onSectionsChanged}
              trigger={
                <button
                  className="inline-flex items-center gap-1"
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 99,
                    background: "hsl(var(--color-surface-raised))",
                    border: "1px solid #C9B8D8",
                    color: "hsl(var(--color-text-primary))",
                    cursor: "pointer",
                  }}
                >
                  <Plus className="w-3 h-3" /> Lägg till en del
                </button>
              }
            />
          </div>
        </div>
      )}

      {/* Expanded compose state */}
      <AnimatePresence>
        {composing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Dela något med din krets..."
              autoFocus
              className="w-full border-none outline-none shadow-none focus-visible:ring-0 resize-none p-0"
              style={{
                minHeight: 60,
                fontSize: 13,
                background: "transparent",
              }}
            />

            {/* Image controls */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <label style={{ cursor: "pointer" }}>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
                <span
                  className="inline-flex items-center gap-1"
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 99,
                    border: "none",
                    background: imageFile ? "#EDE8F4" : "#F7F3EF",
                    color: imageFile ? "#3C2A4D" : "#655675",
                    cursor: "pointer",
                  }}
                >
                  <Camera className="w-3 h-3" />
                  {imageFile ? imageFile.name.slice(0, 15) : "Foto"}
                </span>
              </label>
              {imageFile && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPhotoLayout("large")}
                    className="flex items-center justify-center"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 12,
                      background: photoLayout === "large" ? "#3C2A4D" : "#fff",
                      border: "1px solid #3C2A4D",
                    }}
                  >
                    <RectangleHorizontal className="w-3 h-3" style={{ color: photoLayout === "large" ? "#fff" : "#3C2A4D" }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoLayout("small")}
                    className="flex items-center justify-center"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 12,
                      background: photoLayout === "small" ? "#3C2A4D" : "#fff",
                      border: "1px solid #3C2A4D",
                    }}
                  >
                    <LayoutList className="w-3 h-3" style={{ color: photoLayout === "small" ? "#fff" : "#3C2A4D" }} />
                  </button>
                </div>
              )}
            </div>

            {/* Section picker */}
            <div className="mt-3">
              <p className="text-[10px] mb-1.5" style={{ color: "hsl(var(--color-text-faint))" }}>
                Lägg till i en del av din vardag? (valfritt)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSection(selectedSection === s.id ? null : s.id)}
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 99,
                      background: selectedSection === s.id ? "#EDE8F4" : "#F7F3EF",
                      border: selectedSection === s.id ? "1.5px solid #3C2A4D" : "none",
                      color: "hsl(var(--color-text-primary))",
                      cursor: "pointer",
                    }}
                  >
                    {s.name}
                  </button>
                ))}
                <CreateSectionDialog
                  onCreated={onSectionsChanged}
                  trigger={
                    <button
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        borderRadius: 99,
                        background: "transparent",
                        border: "1px dashed hsl(var(--color-border-lavender))",
                        color: "hsl(var(--color-text-secondary))",
                        cursor: "pointer",
                      }}
                    >
                      + Ny del
                    </button>
                  }
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={reset}
                className="text-[12px]"
                style={{ color: "hsl(var(--color-text-faint))", background: "none", border: "none", cursor: "pointer" }}
              >
                Avbryt
              </button>
              <button
                onClick={handlePost}
                disabled={posting || (!content.trim() && !imageFile)}
                style={{
                  background: "#3C2A4D",
                  color: "#F7F3EF",
                  borderRadius: 99,
                  padding: "8px 20px",
                  fontSize: 13,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  opacity: posting || (!content.trim() && !imageFile) ? 0.5 : 1,
                }}
              >
                Dela
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuickPostCard;
