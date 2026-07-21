interface Props {
  imageUrl?: string | null;
  title: string;
  ownerName: string;
  onOpen?: () => void;
  roundedLeft?: boolean;
  roundedRight?: boolean;
  size?: "sm" | "lg";
}

const PhotoTile = ({ imageUrl, title, ownerName, onOpen, roundedLeft, roundedRight, size = "lg" }: Props) => {
  const radius = "24px";
  const dims = size === "lg"
    ? "w-[150px] h-[210px]"
    : "w-[110px] h-[130px]";
  const titleSize = size === "lg" ? "text-[17px]" : "text-[11px]";
  const nameSize = size === "lg" ? "text-[14px]" : "text-[10px]";
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
      <div
        className={`absolute inset-x-0 bottom-0 ${pad}`}
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0) 100%)",
        }}
      >
        {title && (
          <div
            className={`${titleSize} font-semibold text-white leading-tight truncate`}
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            {title}
          </div>
        )}
        <div className={`${nameSize} text-white/90 truncate`}>{ownerName}</div>
      </div>
    </button>
  );
};

export default PhotoTile;
