import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Layers, Activity, Droplets } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  section: { id: string; name: string; emoji: string; min_tier: string; section_type: string };
  isOwner: boolean;
  isExpanded: boolean;
  onClick: () => void;
  index: number;
}

const PALETTE = [
  { bg: "hsl(262 60% 82%)", text: "hsl(262 40% 20%)" },   // lavender
  { bg: "hsl(66 65% 58%)",  text: "hsl(66 50% 12%)" },    // citrus green
  { bg: "hsl(25 100% 90%)", text: "hsl(16 60% 30%)" },     // soft peach
  { bg: "hsl(16 100% 63%)", text: "hsl(0 0% 100%)" },      // sunset orange
  { bg: "hsl(214 60% 88%)", text: "hsl(235 50% 25%)" },    // glacier blue
  { bg: "hsl(150 30% 24%)", text: "hsl(100 50% 80%)" },    // deep green
  { bg: "hsl(316 100% 83%)", text: "hsl(316 50% 20%)" },   // petunia pink
  { bg: "hsl(100 50% 80%)", text: "hsl(150 30% 15%)" },    // vibrant mint
  { bg: "hsl(235 72% 55%)", text: "hsl(0 0% 100%)" },      // electric blue
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
    <Droplets className="w-3 h-3" />
  ) : section.section_type === "workout" ? (
    <Activity className="w-3 h-3" />
  ) : (
    <Layers className="w-3 h-3" />
  );

  const tierLabels: Record<string, string> = {
    close: t("close"),
    inner: t("innerCircle"),
    outer: t("everyone"),
  };

  const hasImage = !!thumbnailUrl;

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`relative aspect-[5/4] w-full overflow-hidden rounded-md transition-all group ${
        isExpanded ? "ring-2 ring-foreground/20" : ""
      }`}
      style={!hasImage ? { backgroundColor: colors.bg } : undefined}
    >
      {/* Image background */}
      {hasImage && (
        <img
          src={thumbnailUrl!}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}

      {/* Text content */}
      <div className="absolute inset-0 flex flex-col justify-end items-start p-2.5">
        {hasImage ? (
          /* On image cards: text in a semi-transparent box */
          <div className="bg-background/85 backdrop-blur-sm rounded px-1.5 py-1">
            <h3 className="font-display text-xs font-bold text-foreground leading-tight truncate">
              {section.name}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-muted-foreground">{typeIcon}</span>
              {isOwner && (
                <span className="text-[8px] text-muted-foreground uppercase tracking-wider">
                  {tierLabels[section.min_tier]}
                </span>
              )}
            </div>
          </div>
        ) : (
          /* On color cards: contrasting playful text */
          <div>
            <h3
              className="font-display text-sm font-bold leading-tight truncate"
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
    </motion.button>
  );
};

export default SectionGridCard;
