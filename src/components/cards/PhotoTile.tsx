import { RADIUS, GRADIENTS } from "@/lib/card-styles";
import { ExampleTag } from "@/components/ui/example-tag";
import { typography } from "@/design-system/typography";
import { cn } from "@/lib/utils";

interface Props {
  imageUrl?: string | null;
  title: string;
  ownerName: string;
  onOpen?: () => void;
  roundedLeft?: boolean;
  roundedRight?: boolean;
  size?: "sm" | "lg";
  gradient?: "dark" | "tips" | "photos";
  tag?: string;
}

/** Maps PhotoTile's semantic gradient kinds to the shared overlay tokens —
 * "tips"/"photos" aren't keys on GRADIENTS itself, since those tokens are
 * named by visual role (brand/warm), not by feature. */
const GRADIENT_BY_KIND: Record<NonNullable<Props["gradient"]>, string> = {
  dark: GRADIENTS.dark,
  tips: GRADIENTS.brand,
  photos: GRADIENTS.warm,
};

const PhotoTile = ({
  imageUrl,
  title,
  ownerName,
  onOpen,
  roundedLeft,
  roundedRight,
  size = "lg",
  gradient = "dark",
  tag,
}: Props) => {
  const radius = `${RADIUS.photo}px`;
  const dims = size === "lg" ? "w-[150px] h-[210px]" : "w-[110px] h-[130px]";
  // Typography comes from the design system: large tiles use caption/labelSm,
  // small tiles step down one notch to labelSm/eyebrow.
  const titleType = size === "lg" ? typography.body : typography.meta;
  const nameType = size === "lg" ? typography.meta : typography.meta;
  const pad = size === "lg" ? "p-3 pt-10" : "p-200 pt-400";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`relative ${dims} flex-shrink-0 overflow-hidden text-left`}
      style={{
        backgroundColor: "#E8DDC6",
        backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderTopLeftRadius: roundedLeft ? radius : 0,
        borderBottomLeftRadius: roundedLeft ? radius : 0,
        borderTopRightRadius: roundedRight ? radius : 0,
        borderBottomRightRadius: roundedRight ? radius : 0,
      }}
    >
      {tag && <ExampleTag label={tag} className="absolute top-2 left-2 z-10" />}
      <div
        className={`absolute inset-x-0 bottom-0 ${pad}`}
        style={{ background: GRADIENT_BY_KIND[gradient] }}
      >
        {title && (
          <div className={cn(titleType, "text-white truncate")}>
            {title}
          </div>
        )}
        <div className={cn(nameType, "text-white/80 truncate mt-0.5")}>
          {ownerName}
        </div>
      </div>
    </button>
  );
};

export default PhotoTile;
