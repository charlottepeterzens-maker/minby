interface Props {
  hostName: string;
  dateLabel: string;
  title: string;
  responseCount: number;
  onRespond: () => void;
  onOpen?: () => void;
}

const MeetingCard = ({ hostName, dateLabel, title, responseCount, onRespond, onOpen }: Props) => {
  return (
    <button
      onClick={onOpen}
      className="w-[168px] flex-shrink-0 h-[176px] text-left rounded-lg p-4 flex flex-col justify-between"
      style={{ backgroundColor: "hsl(44, 65%, 93%)" }}
    >
      <div>
        <div
          className="text-[11px] mb-2 truncate"
          style={{ color: "hsl(20, 4%, 40%)" }}
        >
          {hostName}
        </div>
        <div
          className="text-[15px] leading-tight font-medium"
          style={{ fontFamily: "'Outfit', sans-serif", color: "#2E1F3E" }}
        >
          {dateLabel}
          {dateLabel && <br />}
          {title}
        </div>
      </div>
      <div>
        <div className="text-[11px] mb-1" style={{ color: "hsl(20, 4%, 45%)" }}>
          {responseCount === 0 ? "Ingen har svarat" : `${responseCount} har svarat`}
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onRespond(); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onRespond(); } }}
          className="text-[14px] font-medium underline underline-offset-4 cursor-pointer"
          style={{ color: "#C4522A" }}
        >
          Häng med!
        </span>
      </div>
    </button>
  );
};

export default MeetingCard;
