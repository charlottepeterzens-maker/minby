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
      className="w-[176px] flex-shrink-0 h-[184px] text-left rounded-[20px] p-4 flex flex-col justify-between"
      style={{ backgroundColor: "#F9F3E1" }}
    >
      <div>
        <div
          className="text-[13px] mb-2 truncate"
          style={{ color: "#561828" }}
        >
          {hostName}
        </div>
        <div
          className="text-[16px] leading-tight font-medium"
          style={{ fontFamily: "'Outfit', sans-serif", color: "#2B2B2B" }}
        >
          {dateLabel}
          {dateLabel && <br />}
          {title}
        </div>
      </div>
      <div>
        <div className="text-[12px] mb-1" style={{ color: "#561828" }}>
          {responseCount === 0 ? "Ingen har svarat" : `${responseCount} har svarat`}
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onRespond(); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onRespond(); } }}
          className="text-[15px] font-medium underline underline-offset-[6px] cursor-pointer decoration-2"
          style={{ color: "#2B2B2B", textDecorationColor: "#C85A2E" }}
        >
          Häng med!
        </span>
      </div>
    </button>
  );
};

export default MeetingCard;
