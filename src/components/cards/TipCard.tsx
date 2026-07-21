interface Props {
  imageUrl?: string | null;
  ownerName: string;
  ownerAvatar?: string | null;
  dateLabel: string;
  title: string;
  description?: string | null;
  url?: string | null;
}

const TipCard = ({ imageUrl, ownerName, ownerAvatar, dateLabel, title, description, url }: Props) => {
  const initials = ownerName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const open = () => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="w-full rounded-[20px] p-3 flex gap-3"
      style={{ backgroundColor: "#F9F3E1" }}
    >
      <div
        className="w-[110px] h-[110px] rounded-[14px] flex-shrink-0 bg-center bg-cover"
        style={{
          backgroundColor: "#E8DFC9",
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        }}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-[10px]"
            style={{ backgroundColor: "#DAEAF6", color: "#2E1F3E" }}
          >
            {ownerAvatar ? <img src={ownerAvatar} alt="" className="w-full h-full object-cover" /> : initials}
          </div>
          <span className="text-[11px]" style={{ color: "hsl(20, 4%, 54%)" }}>
            {dateLabel}
          </span>
        </div>
        <div
          className="text-[15px] font-medium leading-tight truncate"
          style={{ fontFamily: "'Fraunces', serif", color: "#2E1F3E" }}
        >
          {title}
        </div>
        {description && (
          <p
            className="text-[13px] mt-1 line-clamp-2"
            style={{ color: "#2E1F3E" }}
          >
            {description}
          </p>
        )}
        {url && (
          <button
            onClick={open}
            className="mt-auto text-left text-[14px] font-medium underline underline-offset-4"
            style={{ color: "#C4522A" }}
          >
            Till tipset
          </button>
        )}
      </div>
    </div>
  );
};

export default TipCard;
