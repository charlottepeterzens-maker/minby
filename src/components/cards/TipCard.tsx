import TextButton from "@/components/ui/text-button";

interface Props {
  imageUrl?: string | null;
  ownerName: string;
  ownerAvatar?: string | null;
  dateLabel: string;
  title: string;
  description?: string | null;
  url?: string | null;
  onOpen?: () => void;
}

const TipCard = ({ imageUrl, ownerName, ownerAvatar, dateLabel, title, description, url, onOpen }: Props) => {
  const initials = ownerName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const openLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-[26px] overflow-hidden flex gap-4 h-[134px]"
      style={{ backgroundColor: "#F9F3E1" }}
    >
      <div
        className="w-[134px] h-[134px] flex-shrink-0 bg-center bg-cover"
        style={{
          backgroundColor: "#E8DDC6",
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        }}
      />

      <div className="flex-1 min-w-0 flex flex-col py-3 pr-4">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-6 h-6 rounded-[32%] overflow-hidden flex items-center justify-center text-[10px]"
            style={{ backgroundColor: "#DCEAF8", color: "#561828" }}
          >
            {ownerAvatar ? <img src={ownerAvatar} alt="" className="w-full h-full object-cover" /> : initials}
          </div>
          <span className="text-eyebrow" style={{ color: "#561828" }}>
            {dateLabel}
          </span>
        </div>
        <div
          className="text-[16px] font-medium leading-tight truncate"
          style={{ color: "#2B2B2B" }}
        >
          {title}
        </div>
        {description && (
          <p className="text-body mt-1 line-clamp-2" style={{ color: "#2B2B2B" }}>
            {description}
          </p>
        )}
        {url && (
          <div className="mt-auto">
            <TextButton variant="primary" onClick={openLink}>
              Till tipset
            </TextButton>
          </div>
        )}
      </div>

    </button>
  );
};

export default TipCard;
