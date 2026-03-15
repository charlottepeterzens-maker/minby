import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layers, Activity, Droplets, Baby, Home, Heart, Briefcase, BookOpen, Users, Utensils, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

const ICON_COLORS = [
  { bg: "hsl(var(--lavender-bg))", icon: "hsl(var(--primary))" },
  { bg: "hsl(var(--salvia-bg))", icon: "hsl(var(--accent-foreground))" },
  { bg: "hsl(var(--dusty-rose-bg))", icon: "hsl(var(--foreground))" },
  { bg: "hsl(var(--lavender-bg))", icon: "hsl(var(--secondary))" },
];

function getSectionIcon(name: string, sectionType: string) {
  const lower = name.toLowerCase();
  if (sectionType === "period") return Droplets;
  if (sectionType === "workout") return Activity;
  if (lower.includes("barn") || lower.includes("kid")) return Baby;
  if (lower.includes("familj") || lower.includes("family")) return Users;
  if (lower.includes("hus") || lower.includes("hem") || lower.includes("home")) return Home;
  if (lower.includes("hälsa") || lower.includes("health")) return Heart;
  if (lower.includes("jobb") || lower.includes("work") || lower.includes("projekt")) return Briefcase;
  if (lower.includes("mat") || lower.includes("food")) return Utensils;
  if (lower.includes("läs") || lower.includes("read") || lower.includes("book")) return BookOpen;
  return Layers;
}

const SectionGridCard = ({ section, isOwner, isExpanded, onClick, onDeleted, onRenamed, index }: Props) => {
  const [postCount, setPostCount] = useState<number>(0);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const colors = ICON_COLORS[index % ICON_COLORS.length];
  const IconComponent = getSectionIcon(section.name, section.section_type);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("life_posts")
        .select("id", { count: "exact", head: true })
        .eq("section_id", section.id);
      setPostCount(count || 0);
    };
    fetchCount();
  }, [section.id]);

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
    // Delete posts first, then section
    await supabase.from("life_posts").delete().eq("section_id", section.id);
    await supabase.from("life_sections").delete().eq("id", section.id);
    toast.success("Borttagen");
    onDeleted?.();
  };

  if (editing) {
    return (
      <div className="w-full flex items-center gap-2 bg-card rounded-[12px] border-[0.5px] border-primary/30 p-2.5">
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setEditing(false); setEditName(section.name); } }}
          className="h-7 text-[12px]"
          autoFocus
        />
        <button onClick={handleRename} className="text-[11px] font-medium text-primary shrink-0">Spara</button>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full">
        <button
          onClick={onClick}
          className={`w-full flex items-center gap-2.5 bg-card rounded-[12px] border-[0.5px] border-border p-2.5 text-left transition-all ${
            isExpanded ? "ring-1 ring-primary/20" : ""
          }`}
        >
          <div
            className="shrink-0 flex items-center justify-center rounded-[7px]"
            style={{ width: 26, height: 26, backgroundColor: colors.bg }}
          >
            <IconComponent className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: colors.icon }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-foreground leading-tight truncate pr-5">
              {section.name}
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {postCount} inlägg
            </p>
          </div>
        </button>

        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="absolute top-2 right-2 z-10 w-5 h-5 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              <DropdownMenuItem onClick={() => { setEditName(section.name); setEditing(true); }}>
                Redigera namn
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowDelete(true)} className="text-destructive focus:text-destructive">
                Ta bort
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <ConfirmSheet
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Ta bort del av vardagen"
        description="Är du säker på att du vill ta bort denna del av din vardag? Alla inlägg i den raderas också."
        confirmLabel="Ta bort"
        confirmStyle={{ backgroundColor: "#A32D2D" }}
        onConfirm={handleDelete}
      />
    </>
  );
};

export default SectionGridCard;
