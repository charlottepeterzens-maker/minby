import TextButton from "@/components/ui/text-button";
import { MessageCircle } from "lucide-react";

interface Props {
  circleName: string;
  onSayHi: () => void;
}

const WelcomeToCircleCard = ({ circleName, onSayHi }: Props) => {
  return (
    <section className="mt-6 px-4">
      <div className="rounded-[26px] p-5" style={{ backgroundColor: "#F5EFD9" }}>
        <div
          className="text-[11px] mb-2 font-medium uppercase tracking-wider"
          style={{ color: "#675332" }}
        >
          Välkommen till {circleName}
        </div>
        <p className="text-[16px] leading-relaxed" style={{ color: "#2B2B2B" }}>
          Det här är er egen lilla plats på Minby — ett lugnt hem för er närmsta
          krets, utan algoritmer. Börja med att säga hej.
        </p>
        <div className="mt-4">
          <TextButton onClick={onSayHi} className="text-[16px]">
            <MessageCircle className="w-4 h-4" /> Skriv hej i chatten
          </TextButton>
        </div>
      </div>
    </section>
  );
};

export default WelcomeToCircleCard;
