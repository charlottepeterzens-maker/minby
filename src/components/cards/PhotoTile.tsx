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

const GRADIENTS: Record<NonNullable<Props["gradient"]>, string> = {
  dark: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0) 100%)",
  tips: "linear-gradient(to top, #561828 0%, rgba(86,24,40,0.35) 55%, rgba(86,24,40,0) 100%)",
  photos: "linear-gradient(to top, #765D19 0%, rgba(118,93,25,0.35) 55%, rgba(118,93,25,0) 100%)",
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
  const radius = "24px";
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
