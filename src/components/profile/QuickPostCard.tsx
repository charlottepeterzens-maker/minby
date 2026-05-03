import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Plus, X } from "lucide-react";
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
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const avatarUrl = resolveAvatarUrl(profile?.avatar_url ?? null);
  const initial = profile?.display_name
    ? profile.display_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const hasContent = content.trim().length > 0 || !!imageFile;

  useEffect(() => {
    if (composing && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [composing]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [content]);

  const handlePost = async () => {
    if (!user || !hasContent) return;
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
      photo_layout: "large",
    } as any);

    if (error) {
      toast.error("Kunde inte publicera");
    } else {
      reset();
      onPosted();
    }
    setPosting(false);
  };

  const reset = () => {
    setComposing(false);
    setContent("");
    setImageFile(null);
    setSelectedSection(null);
  };

  const AvatarCircle = ({ size = 34 }: { size?: number }) => (
    <div
      className="shrink-0 rounded-full flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size, backgroundColor: "#D4E8F5" }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.35, fontWeight: 500, color: "#1C1917" }}>{initial}</span>
      )}
    </div>
  );

  return (
    <div style={{ background: "#FFFFFF", borderRadius: 8, overflow: "hidden", border: "1px solid hsl(var(--color-border-subtle))" }}>
      {/* Collapsed */}
      {!composing && (
        <button
          onClick={() => setComposing(true)}
          className="w-full flex items-center gap-3"
          style={{ padding: "12px 14px", background: "none", border: "none", cursor: "pointer" }}
        >
          <span style={{ flex: 1, textAlign: "left", fontSize: 14, fontWeight: 400, color: "hsl(var(--color-text-faint))" }}>
            Dela något med din krets…
          </span>
          <Camera style={{ width: 18, height: 18, color: "hsl(var(--color-text-faint))" }} />
        </button>
      )}

      {/* Expanded */}
      <AnimatePresence>
        {composing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Zone 1 – Text */}
            <div style={{ padding: "12px 14px 10px" }}>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Dela något med din krets…"
                rows={2}
                className="w-full resize-none outline-none"
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  fontSize: 14,
                  fontWeight: 300,
                  color: "#1C1917",
                  lineHeight: 1.5,
                  padding: "4px 0",
                }}
              />
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "hsl(var(--color-border-subtle))" }} />

            {/* Zone 2 – Section picker */}
            <div style={{ padding: "10px 14px" }}>
              <p style={{ fontSize: 12, color: "hsl(var(--color-text-faint))", marginBottom: 8 }}>
                Dela i
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sections.map((s) => {
                  const active = selectedSection === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSection(active ? null : s.id)}
                      style={{
                        fontSize: 12,
                        fontWeight: active ? 500 : 400,
                        padding: "5px 12px",
                        borderRadius: 8,
                        border: "none",
                        background: active ? "#D4E8F5" : "#F5F0EA",
                        color: active ? "#561828" : "hsl(var(--color-text-secondary))",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {s.name}
                    </button>
                  );
                })}
                <CreateSectionDialog
                  onCreated={onSectionsChanged}
                  trigger={
                    <button
                      style={{
                        fontSize: 11,
                        padding: "5px 12px",
                        borderRadius: 8,
                        background: "transparent",
                        border: "none",
                        color: "#C4522A",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      + Ny del
                    </button>
                  }
                />
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "hsl(var(--color-border-subtle))" }} />

            {/* Zone 3 – Actions */}
            <div
              ref={actionsRef}
              className="flex items-center justify-between"
              style={{ padding: "10px 14px" }}
            >
              <div className="flex items-center gap-2">
                <label style={{ cursor: "pointer" }}>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={{
                      fontSize: 12,
                      padding: "6px 12px",
                      borderRadius: 8,
                      background: imageFile ? "#D4E8F5" : "#F5F0EA",
                      color: imageFile ? "#561828" : "hsl(var(--color-text-secondary))",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <Camera style={{ width: 14, height: 14 }} />
                    {imageFile ? (
                      <span className="flex items-center gap-1">
                        {imageFile.name.slice(0, 12)}
                        <X
                          style={{ width: 12, height: 12, cursor: "pointer" }}
                          onClick={(e) => { e.preventDefault(); setImageFile(null); }}
                        />
                      </span>
                    ) : "Foto"}
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={reset}
                  style={{
                    fontSize: 13,
                    color: "hsl(var(--color-text-faint))",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Avbryt
                </button>
                <button
                  onClick={handlePost}
                  disabled={posting || !hasContent}
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    padding: "8px 20px",
                    borderRadius: 8,
                    border: "none",
                    cursor: hasContent ? "pointer" : "default",
                    background: hasContent ? "#561828" : "#EDE8E0",
                    color: hasContent ? "#F0EAE2" : "hsl(var(--color-text-faint))",
                    opacity: posting ? 0.6 : 1,
                    transition: "all 0.2s ease",
                    WebkitAppearance: "none",
                  }}
                >
                  Dela
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuickPostCard;
