import { CARD_RADIUS, OVERLAY_GRADIENT } from "@/lib/card-styles";

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
  const titleSize = size === "lg" ? "text-[13px]" : "text-[11px]";
  const nameSize = size === "lg" ? "text-[11px]" : "text-[10px]";
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
      {tag && (
        <span
          className="absolute top-2 left-2 z-10 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
          style={{ backgroundColor: "#C85A2E", color: "#fff", letterSpacing: "0.12em" }}
        >
          {tag}
        </span>
      )}
      <div
        className={`absolute inset-x-0 bottom-0 ${pad}`}
        style={{ background: GRADIENTS[gradient] }}
      >
        {title && (
          <div
            className={`${titleSize} font-medium text-white leading-tight truncate`}
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            {title}
          </div>
        )}
        <div className={`${nameSize} text-white/80 truncate mt-0.5`}>{ownerName}</div>
      </div>
    </button>
  );
};

export default PhotoTile;
