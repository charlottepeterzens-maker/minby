import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSignedImageUrl } from "@/hooks/useSignedImageUrl";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import ConfirmSheet from "@/components/ConfirmSheet";
import { toast } from "sonner";

interface Props {
  section: { id: string; name: string; emoji: string; min_tier: string; section_type: string };
  isOwner: boolean;
  isExpanded: boolean;
  onClick: () => void;
  onDeleted?: () => void;
  onRenamed?: () => void;
  index: number;
}

const SectionGridCard = ({ section, isOwner, isExpanded, onClick, onDeleted, onRenamed, index }: Props) => {
  const [latestImageRef, setLatestImageRef] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [postCount, setPostCount] = useState(0);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);

  useEffect(() => {
    const load = async () => {
      // Get count
      const { count } = await supabase
        .from("life_posts")
        .select("id", { count: "exact", head: true })
        .eq("section_id", section.id);
      setPostCount(count || 0);

      // Get latest post with image
      const { data: imgData } = await supabase
        .from("life_posts")
        .select("image_url")
        .eq("section_id", section.id)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (imgData?.[0]?.image_url) setLatestImageRef(imgData[0].image_url);

      // Get latest post content for preview
      const { data: textData } = await supabase
        .from("life_posts")
        .select("content")
        .eq("section_id", section.id)
        .not("content", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (textData?.[0]?.content) setPreviewText(textData[0].content);
    };
    load();
  }, [section.id]);

  const signedUrl = useSignedImageUrl(latestImageRef);
  const hasImage = !!signedUrl;

  const handleRename = async () => {
    if (!editName.trim() || editName.trim() === section.name) {
      setEditing(false);
      setEditName(section.name);
      return;
    }
    await supabase.from("life_sections").update({ name: editName.trim() }).eq("id", section.id);
    setEditing(false);
    onRenamed?.();
  };

  const handleDelete = async () => {
    await supabase.from("life_posts").delete().eq("section_id", section.id);
    await supabase.from("life_sections").delete().eq("id", section.id);
    toast.success("Borttagen");
    onDeleted?.();
  };

  if (editing) {
    return (
      <div
        style={{
          height: 100,
          borderRadius: 8,
          background: "#EDE8F4",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 12px",
        }}
      >
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") { setEditing(false); setEditName(section.name); }
          }}
          className="h-7 text-[12px]"
          autoFocus
          style={{ flex: 1, border: "none", background: "rgba(255,255,255,0.6)" }}
        />
        <button onClick={handleRename} style={{ fontSize: 11, fontWeight: 500, color: "#2E1F3E", background: "none", border: "none", cursor: "pointer" }}>
          Spara
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full">
        <button
          onClick={onClick}
          style={{
            width: "100%",
            height: 100,
            borderRadius: 8,
            overflow: "hidden",
            position: "relative",
            cursor: "pointer",
            border: "none",
            padding: 0,
            display: "block",
            textAlign: "left",
            transition: "transform 0.15s ease",
          }}
          className="active:scale-[0.97]"
        >
          {/* Background */}
          {hasImage ? (
            <img
              src={signedUrl!}
              alt={section.name}
              loading="lazy"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "#EDE8F4",
              }}
            />
          )}

          {/* Gradient overlay for images */}
          {hasImage && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(transparent, rgba(46,31,62,0.7))",
              }}
            />
          )}

          {/* Text content */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "10px 12px",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: postCount === 0 && !hasImage ? "center" : "flex-end",
              ...(postCount === 0 && !hasImage ? { top: 0, alignItems: "center" } : {}),
            }}
          >
            <p
              style={{
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: hasImage ? "#F0EAE2" : postCount === 0 ? "#7A6A85" : "#2E1F3E",
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {section.name}
            </p>
            {previewText && (
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 300,
                  color: hasImage ? "rgba(240,234,226,0.8)" : "rgba(46,31,62,0.6)",
                  margin: "2px 0 0",
                  lineHeight: 1.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {previewText}
              </p>
            )}
          </div>
        </button>

        {/* Three-dot menu */}
        {isOwner && (
          <div
            style={{ position: "absolute", top: 6, right: 6, zIndex: 2 }}
            onClick={(e) => e.stopPropagation()}
          >
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
                    background: "rgba(0,0,0,0.25)",
                    backdropFilter: "blur(4px)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <MoreHorizontal style={{ width: 13, height: 13, color: "#fff" }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" style={{ minWidth: 140 }}>
                <DropdownMenuItem
                  onClick={() => { setEditName(section.name); setEditing(true); }}
                  className="gap-2 text-xs"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Redigera namn
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDelete(true)}
                  className="gap-2 text-xs text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Ta bort
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <ConfirmSheet
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Ta bort del av vardagen"
        description="Är du säker på att du vill ta bort denna del av din vardag? Alla inlägg i den raderas också."
        confirmLabel="Ta bort"
        confirmStyle={{ backgroundColor: "hsl(var(--color-accent-red))" }}
        onConfirm={handleDelete}
      />
    </>
  );
};

export default SectionGridCard;
