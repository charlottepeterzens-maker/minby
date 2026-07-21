interface Props {
  imageUrl?: string | null;
  title: string;
  ownerName: string;
  onOpen?: () => void;
}

const PhotoTile = ({ imageUrl, title, ownerName, onOpen }: Props) => {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative w-[110px] h-[130px] flex-shrink-0 rounded-lg overflow-hidden text-left"
      style={{
        backgroundColor: "#E8DDC6",
        backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        className="absolute inset-x-0 bottom-0 p-2 pt-6"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%)",
        }}
      >
        {title && (
          <div className="text-[11px] font-medium text-white leading-tight truncate">
            {title}
          </div>
        )}
        <div className="text-[10px] text-white/85 truncate">{ownerName}</div>
      </div>
    </button>
  );
};

export default PhotoTile;
