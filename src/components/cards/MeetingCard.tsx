import TextButton from "@/components/ui/text-button";
import { Typography } from "@/components/ui/typography";

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
      className="w-[176px] flex-shrink-0 h-[184px] text-left rounded-300 p-300 flex flex-col justify-between bg-linen"
    >

      <div>
        <Typography
          variant="meta"
          as="div"
          className="mb-2 truncate"
          style={{ color: "#675332" }}
        >
          {hostName}
        </Typography>
        <Typography variant="heading" as="div" style={{ color: "#2B2B2B" }}>
          {dateLabel}
          {dateLabel && <br />}
          {title}
        </Typography>
      </div>
      <div>
        <Typography variant="meta" as="div" className="mb-1" style={{ color: "#561828" }}>
          {responseCount === 0 ? "Ingen har svarat" : `${responseCount} har svarat`}
        </Typography>
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
