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
      className="w-[130px] flex-shrink-0 h-[166px] text-left rounded-[30px] p-4 flex flex-col justify-between"
      style={{ backgroundColor: "#F2ECE3" }}
    >
      <div>
        <div
          className="text-[11px] mb-2 truncate"
          style={{ fontFamily: "'Fraunces', serif", color: "#2E1F3E" }}
        >
          {hostName}
        </div>
        <div
          className="text-[15px] leading-tight"
          style={{ fontFamily: "'Fraunces', serif", color: "#2E1F3E" }}
        >
          {dateLabel}
          <br />
          {title}
        </div>
      </div>
      <div>
        <div className="text-[10px] mb-1" style={{ color: "hsl(20, 4%, 54%)" }}>
          {responseCount} har svarat
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onRespond(); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onRespond(); } }}
          className="text-[13px] font-medium underline underline-offset-4 cursor-pointer"
          style={{ color: "#2E1F3E" }}
        >
          Jag kan
        </span>
      </div>
    </button>
  );
};

export default MeetingCard;
