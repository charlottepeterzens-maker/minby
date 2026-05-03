import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Image as ImageIcon, Tag, Send, X } from "lucide-react";
import { toast } from "sonner";
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

const QuickPostCard = ({ profile, sections, onPosted }: Props) => {
  const { user } = useAuth();
  const [composeActive, setComposeActive] = useState(false);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showSections, setShowSections] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarUrl = resolveAvatarUrl(profile?.avatar_url ?? null);
  const firstName = (profile?.display_name || "du").split(" ")[0];
  const initial = profile?.display_name
    ? profile.display_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const hasContent = content.trim().length > 0 || !!imageFile;

  const Avatar = ({ className = "w-8 h-8", style }: { className?: string; style?: React.CSSProperties }) => (
    <div
      className={`${className} rounded-full overflow-hidden flex items-center justify-center`}
      style={{ backgroundColor: "#D4E8F5", ...style }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <span style={{ fontSize: 11, fontWeight: 500, color: "#1C1917" }}>{initial}</span>
      )}
    </div>
  );

  const reset = () => {
    setComposeActive(false);
    setContent("");
    setImageFile(null);
    setSelectedSection(null);
    setShowSections(false);
  };

  const handleSubmit = async () => {
    if (!user || !hasContent || posting) return;
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

  if (!composeActive) {
    return (
      <div
        className="rounded-lg flex items-center gap-3 cursor-pointer"
        style={{
          backgroundColor: "hsl(var(--color-surface-card))",
          padding: "14px 16px",
          boxShadow: "0 2px 10px rgba(86,24,40,0.07), 0 1px 3px rgba(0,0,0,0.04)",
        }}
        onClick={() => setComposeActive(true)}
      >
        <Avatar />
        <span className="text-[13px] font-normal" style={{ color: "hsl(20, 6%, 40%)" }}>
          Din tur, {firstName}.
        </span>
      </div>
    );
  }

  const selectedSectionName = sections.find((s) => s.id === selectedSection)?.name;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: "hsl(var(--color-surface-card))",
        boxShadow: "0 2px 12px rgba(86,24,40,0.08), 0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      {/* Textyta */}
      <div className="flex items-start gap-3 p-4">
        <Avatar style={{ marginTop: 2 }} />
        <textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Vad händer i din vardag?"
          className="flex-1 text-[13px] font-normal bg-transparent resize-none outline-none"
          style={{ color: "hsl(20, 10%, 12%)", lineHeight: "1.6", minHeight: "60px" }}
        />
      </div>

      {/* Image preview */}
      {imageFile && (
        <div className="px-4 pb-2">
          <div className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: "hsl(20, 6%, 40%)" }}>
            {imageFile.name.slice(0, 24)}
            <button
              type="button"
              onClick={() => setImageFile(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(20, 4%, 54%)" }}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Sections picker */}
      {showSections && sections.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {sections.map((s) => {
            const active = selectedSection === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelectedSection(active ? null : s.id);
                  setShowSections(false);
                }}
                className="rounded-lg"
                style={{
                  fontSize: 12,
                  padding: "5px 10px",
                  border: "none",
                  background: active ? "#D4E8F5" : "#F5F0EA",
                  color: active ? "#561828" : "hsl(var(--color-text-secondary))",
                  cursor: "pointer",
                }}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Åtgärdsrad */}
      <div
        className="flex items-center px-4 pb-3"
        style={{ borderTop: "1px solid hsl(var(--color-border-subtle))", gap: "16px", paddingTop: "10px" }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 text-[12px]"
          style={{ color: "hsl(20, 4%, 54%)", background: "none", border: "none", cursor: "pointer" }}
        >
          <ImageIcon size={12} strokeWidth={1.5} />
          Bild
        </button>
        <button
          type="button"
          onClick={() => setShowSections((v) => !v)}
          className="flex items-center gap-1.5 text-[12px]"
          style={{ color: selectedSectionName ? "hsl(20, 10%, 12%)" : "hsl(20, 4%, 54%)", background: "none", border: "none", cursor: "pointer" }}
        >
          <Tag size={12} strokeWidth={1.5} />
          {selectedSectionName || "Del"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="text-[12px]"
          style={{ color: "hsl(20, 4%, 54%)", background: "none", border: "none", cursor: "pointer" }}
        >
          Avbryt
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!hasContent || posting}
          className="ml-auto rounded-lg flex items-center justify-center"
          style={{
            width: "30px",
            height: "30px",
            backgroundColor: hasContent ? "#561828" : "#EDE8E0",
            border: "none",
            cursor: hasContent ? "pointer" : "default",
            opacity: posting ? 0.6 : 1,
          }}
        >
          <Send size={13} fill="white" strokeWidth={0} />
        </button>
      </div>
    </div>
  );
};

export default QuickPostCard;
