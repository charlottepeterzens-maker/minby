import { useState, useEffect } from "react";
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

const BG_COLORS = ["#EDE8F4", "#EAF2E8", "#FCF0F3", "#FCF0F3", "#EDE8F4", "#EAF2E8"];

const TEXT_COLORS = ["#3C2A4D", "#1F4A1A", "#4B1528", "##4B1528", "#3C2A4D", "#1F4A1A"];

const SUBTEXT_COLORS = ["#993556", "#3B6D11", "#993556", "#993556", "#7993556", "#3B6D11"];
const SectionGridCard = ({ section, isOwner, isExpanded, onClick, onDeleted, onRenamed, index }: Props) => {
  const [postCount, setPostCount] = useState<number>(0);
  const [latestImageRef, setLatestImageRef] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const bgColor = BG_COLORS[index % BG_COLORS.length];

  // Fetch post count and latest image
  useEffect(() => {
    const fetch = async () => {
      const { count } = await supabase
        .from("life_posts")
        .select("id", { count: "exact", head: true })
        .eq("section_id", section.id);
      setPostCount(count || 0);

      // Get latest post with an image
      const { data } = await supabase
        .from("life_posts")
        .select("image_url")
        .eq("section_id", section.id)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data?.[0]?.image_url) {
        setLatestImageRef(data[0].image_url);
      }
    };
    fetch();
  }, [section.id]);

  const signedUrl = useSignedImageUrl(latestImageRef);

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
      <div className="w-full flex items-center gap-2 bg-card rounded-[16px] border border-primary/30 p-2.5">
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") {
              setEditing(false);
              setEditName(section.name);
            }
          }}
          className="h-7 text-[12px]"
          autoFocus
        />
        <button onClick={handleRename} className="text-[11px] font-medium text-primary shrink-0">
          Spara
        </button>
      </div>
    );
  }

  const hasImage = !!signedUrl;

  return (
    <>
      <div className="relative w-full">
        <button
          onClick={onClick}
          className={`group relative w-full aspect-[4/5] rounded-[16px] overflow-hidden border border-border text-left transition-all active:scale-[0.97] ${
            isExpanded ? "ring-1 ring-primary/20" : ""
          }`}
        >
          {/* Background: image or color */}
          {hasImage ? (
            <img src={signedUrl!} alt={section.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ backgroundColor: bgColor }} />
          )}

          {/* Gradient overlay */}
          {hasImage && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />}

          {/* Text content (bottom) */}
          <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
            <p
              className="text-[13px] font-medium leading-tight truncate"
              style={{ color: hasImage ? "#ffffff" : TEXT_COLORS[index % TEXT_COLORS.length] }}
            >
              {section.name}
            </p>
            <p
              className="text-[11px] leading-tight mt-0.5"
              style={{ color: hasImage ? "rgba(255,255,255,0.7)" : SUBTEXT_COLORS[index % SUBTEXT_COLORS.length] }}
            >
              {postCount} inlägg
            </p>
          </div>
        </button>

        {/* Three-dot menu (top right) */}
        {isOwner && (
          <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-7 h-7 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors">
                  <MoreHorizontal className="w-3.5 h-3.5 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px]">
                <DropdownMenuItem
                  onClick={() => {
                    setEditName(section.name);
                    setEditing(true);
                  }}
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
