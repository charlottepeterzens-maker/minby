import TextButton from "@/components/ui/text-button";
import { MessageCircle, UserPlus } from "lucide-react";

type Variant = "joined" | "created";

interface Props {
  circleName: string;
  variant?: Variant;
  onSayHi?: () => void;
  onInvite?: () => void;
}

const WelcomeToCircleCard = ({ circleName, variant = "joined", onSayHi, onInvite }: Props) => {
  const isCreated = variant === "created";

  const eyebrow = isCreated ? `Grattis till ${circleName}` : `Välkommen till ${circleName}`;
  const body = isCreated
    ? "Det här är er egen lilla plats på Minby. Ett lugnt hem för er närmsta krets — utan algoritmer. Bjud in familj och vänner så flyttar ni er krets hit."
    : "Det här är er egen lilla plats på Minby — ett lugnt hem för er närmsta krets, utan algoritmer. Börja med att säga hej.";

  return (
    <section className="mt-6 px-4">
      <div className="rounded-[26px] p-5" style={{ backgroundColor: "#F5EFD9" }}>
        <div
          className="text-[11px] mb-2 font-medium uppercase tracking-wider"
          style={{ color: "#675332" }}
        >
          {eyebrow}
        </div>
        <p className="text-[16px] leading-relaxed" style={{ color: "#2B2B2B" }}>
          {body}
        </p>
        <div className="mt-4">
          {isCreated ? (
            <TextButton onClick={onInvite} className="text-[16px]">
              <UserPlus className="w-4 h-4" /> Bjud in till kretsen
            </TextButton>
          ) : (
            <TextButton onClick={onSayHi} className="text-[16px]">
              <MessageCircle className="w-4 h-4" /> Skriv hej i chatten
            </TextButton>
          )}
        </div>
      </div>
    </section>
  );
};

export default WelcomeToCircleCard;
