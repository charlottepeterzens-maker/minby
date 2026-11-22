import TextButton from "@/components/ui/text-button";
import { Typography } from "@/components/ui/typography";
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
    <section className="mt-6 px-300">
      <div className="rounded-300 p-5" style={{ backgroundColor: "hsl(var(--butter-150))" }}>
        <Typography
          variant="eyebrow"
          as="div"
          className="mb-2"
          style={{ color: "hsl(var(--color-text-tertiary))" }}
        >
          {eyebrow}
        </Typography>
        <Typography variant="body" style={{ color: "hsl(var(--text-ink))" }}>
          {body}
        </Typography>
        <div className="mt-4">
          {isCreated ? (
            <TextButton onClick={onInvite}>
              <UserPlus className="w-4 h-4" /> Bjud in till kretsen
            </TextButton>
          ) : (
            <TextButton onClick={onSayHi}>
              <MessageCircle className="w-4 h-4" /> Skriv hej i chatten
            </TextButton>
          )}
        </div>
      </div>
    </section>
  );
};

export default WelcomeToCircleCard;
