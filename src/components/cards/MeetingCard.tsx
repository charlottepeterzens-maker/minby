import TextButton from "@/components/ui/text-button";

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
      className="w-[176px] flex-shrink-0 h-[184px] text-left rounded-[26px] p-4 flex flex-col justify-between"
      style={{ backgroundColor: "#F2ECE3" }}
    >
      <div>
        <div
          className="text-eyebrow mb-2 truncate"
          style={{ color: "#675332" }}
        >
          {hostName}
        </div>
        <div
          className="text-[16px] leading-tight font-medium"
          style={{ color: "#2B2B2B" }}
        >
          {dateLabel}
          {dateLabel && <br />}
          {title}
        </div>
      </div>
      <div>
        <div className="text-eyebrow mb-1" style={{ color: "#561828" }}>
          {responseCount === 0 ? "Ingen har svarat" : `${responseCount} har svarat`}
        </div>
        <TextButton
          variant="primary"
          onClick={(e) => { e.stopPropagation(); onRespond(); }}
        >
          Häng med!
        </TextButton>
      </div>

    </button>
  );
};

export default MeetingCard;
