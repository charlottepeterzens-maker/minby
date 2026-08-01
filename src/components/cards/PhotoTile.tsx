import { CARD_RADIUS, OVERLAY_GRADIENT } from "@/lib/card-styles";
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
  const radius = `${CARD_RADIUS.photo}px`;
  const dims = size === "lg" ? "w-[150px] h-[210px]" : "w-[110px] h-[130px]";
  // Typography comes from the design system: large tiles use caption/labelSm,
  // small tiles step down one notch to labelSm/eyebrow.
  const titleType = size === "lg" ? typography.caption : typography.labelSm;
  const nameType = size === "lg" ? typography.labelSm : typography.eyebrow;
  const pad = size === "lg" ? "p-3 pt-10" : "p-2 pt-6";

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
        style={{ background: OVERLAY_GRADIENT[gradient] }}
      >
        {title && (
          <div className={cn(titleType, "font-medium text-white truncate")}>
            {title}
          </div>
        )}
        <div className={cn(nameType, "font-normal text-white/80 truncate mt-0.5")}>
          {ownerName}
        </div>
      </div>
    </button>
  );
};

export default PhotoTile;
