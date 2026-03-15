import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Layers, Activity, Droplets } from "lucide-react";

interface Props {
  section: { id: string; name: string; emoji: string; min_tier: string; section_type: string };
  isOwner: boolean;
  isExpanded: boolean;
  onClick: () => void;
  index: number;
}

const PALETTE = [
  { bg: "hsl(270 25% 78%)", text: "hsl(270 30% 23%)" },   // lavender
  { bg: "hsl(145 18% 75%)", text: "hsl(150 30% 15%)" },    // salvia
  { bg: "hsl(340 25% 87%)", text: "hsl(340 20% 30%)" },    // dusty rose
  { bg: "hsl(270 30% 23%)", text: "hsl(270 25% 78%)" },    // lila natt
  { bg: "hsl(30 25% 90%)", text: "hsl(270 30% 23%)" },     // warm linen
  { bg: "hsl(145 20% 85%)", text: "hsl(150 30% 15%)" },    // light salvia
];

const SectionGridCard = ({ section, isOwner, isExpanded, onClick, index }: Props) => {
  const { t } = useLanguage();
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const colors = PALETTE[index % PALETTE.length];

  useEffect(() => {
    const fetchThumbnail = async () => {
      if (section.section_type !== "posts") return;
      const { data } = await supabase
        .from("life_posts")
        .select("image_url")
        .eq("section_id", section.id)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data?.[0]?.image_url) {
        setThumbnailUrl(data[0].image_url);
      }
    };
    fetchThumbnail();
  }, [section.id, section.section_type]);

  const typeIcon = section.section_type === "period" ? (
    <Droplets className="w-3 h-3" strokeWidth={1.5} />
  ) : section.section_type === "workout" ? (
    <Activity className="w-3 h-3" strokeWidth={1.5} />
  ) : (
    <Layers className="w-3 h-3" strokeWidth={1.5} />
  );

  const tierLabels: Record<string, string> = {
    close: t("close"),
    inner: t("innerCircle"),
    outer: t("everyone"),
  };

  const hasImage = !!thumbnailUrl;

  return (
    <button
      onClick={onClick}
      className={`relative aspect-[5/4] w-full overflow-hidden rounded-[14px] transition-colors duration-150 group ${
        isExpanded ? "ring-[0.5px] ring-primary" : ""
      }`}
      style={!hasImage ? { backgroundColor: colors.bg } : undefined}
    >
      {/* Image background */}
      {hasImage && (
        <img
          src={thumbnailUrl!}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Text content */}
      <div className="absolute inset-0 flex flex-col justify-end items-start">
        {hasImage ? (
          <div className="rounded-tr-[10px] px-2 py-1.5" style={{ backgroundColor: colors.bg }}>
            <h3 className="font-display text-xs font-medium leading-tight truncate" style={{ color: colors.text }}>
              {section.name}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <span style={{ color: colors.text, opacity: 0.7 }}>{typeIcon}</span>
              {isOwner && (
                <span className="text-[8px]" style={{ color: colors.text, opacity: 0.6 }}>
                  {tierLabels[section.min_tier]}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-2.5">
            <h3
              className="font-display text-sm font-medium leading-tight truncate"
              style={{ color: colors.text }}
            >
              {section.name}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <span style={{ color: colors.text, opacity: 0.7 }}>{typeIcon}</span>
              {isOwner && (
                <span
                  className="text-[8px] uppercase tracking-wider"
                  style={{ color: colors.text, opacity: 0.6 }}
                >
                  {tierLabels[section.min_tier]}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </button>
  );
};

export default SectionGridCard;
