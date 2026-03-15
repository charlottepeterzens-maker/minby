import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layers, Activity, Droplets, Baby, Home, Heart, Briefcase, BookOpen, Users, Utensils } from "lucide-react";

interface Props {
  section: { id: string; name: string; emoji: string; min_tier: string; section_type: string };
  isOwner: boolean;
  isExpanded: boolean;
  onClick: () => void;
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

const SectionGridCard = ({ section, isOwner, isExpanded, onClick, index }: Props) => {
  const [postCount, setPostCount] = useState<number>(0);
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

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 bg-card rounded-[12px] border-[0.5px] border-border p-2.5 text-left transition-all ${
        isExpanded ? "ring-1 ring-primary/20" : ""
      }`}
    >
      {/* Icon box */}
      <div
        className="shrink-0 flex items-center justify-center rounded-[7px]"
        style={{
          width: 26,
          height: 26,
          backgroundColor: colors.bg,
        }}
      >
        <IconComponent className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: colors.icon }} />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-foreground leading-tight truncate">
          {section.name}
        </p>
        <p className="text-[11px] text-muted-foreground leading-tight">
          {postCount} {postCount === 1 ? "inlägg" : "inlägg"}
        </p>
      </div>
    </button>
  );
};

export default SectionGridCard;
