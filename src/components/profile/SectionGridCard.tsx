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

const SectionGridCard = ({ section, isOwner, isExpanded, onClick, index }: Props) => {
  const { t } = useLanguage();
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // Muted, Scandinavian-friendly palette inspired by the reference
  const fallbackColors = [
    "hsl(262 60% 82%)",   // lavender
    "hsl(66 65% 58%)",    // citrus green
    "hsl(25 100% 90%)",   // soft peach
    "hsl(16 100% 63%)",   // sunset orange
    "hsl(214 60% 88%)",   // glacier blue
    "hsl(150 30% 24%)",   // deep green
    "hsl(316 100% 83%)",  // petunia pink
    "hsl(100 50% 80%)",   // vibrant mint
    "hsl(235 72% 55%)",   // electric blue
  ];

  const bgColor = fallbackColors[index % fallbackColors.length];

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

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`relative aspect-[4/3] w-full overflow-hidden rounded-lg transition-all group ${
        isExpanded ? "ring-2 ring-primary/40" : ""
      }`}
    >
      {/* Background */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: bgColor }} />
      )}

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />

      {/* Text content on top of image */}
      <div className="absolute inset-0 flex flex-col justify-end p-3">
        <h3 className="font-display text-sm font-bold text-background leading-tight truncate">
          {section.name}
        </h3>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-background/70">{typeIcon}</span>
          {isOwner && (
            <span className="text-[9px] text-background/60 uppercase tracking-wider">
              {tierLabels[section.min_tier]}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
};

export default SectionGridCard;
