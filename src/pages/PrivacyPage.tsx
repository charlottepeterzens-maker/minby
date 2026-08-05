import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Typography } from "@/components/ui/typography";

const PrivacyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
      <div className="max-w-[600px] mx-auto px-400 py-400 pt-safe">
        <Typography
          as="button"
          variant="label"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-100"
          style={{ color: "hsl(var(--color-text-primary))" }}
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.5} /> Tillbaka
        </Typography>

        <Typography variant="display" as="h1" className="mb-8" style={{ color: "hsl(var(--color-text-primary))" }}>Integritetspolicy</Typography>

        <div className="space-y-400" style={{ color: "#5A4A65" }}>
          <section>
            <Typography variant="heading" as="h2" className="mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Vad vi samlar in</Typography>
            <Typography variant="body" as="p">Namn, e-postadress, profilbild, inlägg i delar av min vardag, gruppchattar och meddelanden, datum och aktiviteter för 'Hitta på något'.</Typography>
          </section>

          <section>
            <Typography variant="heading" as="h2" className="mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Varför vi samlar in det</Typography>
            <Typography variant="body" as="p">För att driva och förbättra Minby-tjänsten.</Typography>
          </section>

          <section>
            <Typography variant="heading" as="h2" className="mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Hur länge vi sparar det</Typography>
            <Typography variant="body" as="p">All data sparas tills du raderar ditt konto.</Typography>
          </section>

          <section>
            <Typography variant="heading" as="h2" className="mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Delning med tredje part</Typography>
            <Typography variant="body" as="p">Din data säljs aldrig och delas aldrig med tredje part.</Typography>
          </section>

          <section>
            <Typography variant="heading" as="h2" className="mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Dina rättigheter</Typography>
            <Typography variant="body" as="p">Du har rätt att begära ut, korrigera eller radera din data genom att kontakta oss på{" "}
              <a href="mailto:hi@minby.online" className="underline" style={{ color: "hsl(var(--color-text-primary))" }}>hi@minby.online</a>.
            </Typography>
          </section>

          <section>
            <Typography variant="heading" as="h2" className="mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Kontakt</Typography>
            <Typography variant="body" as="p">Charlotte Peterzéns,{" "}
              <a href="mailto:hi@minby.online" className="underline" style={{ color: "hsl(var(--color-text-primary))" }}>hi@minby.online</a>
            </Typography>
          </section>

          <section>
            <Typography variant="heading" as="h2" className="mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Push-notiser</Typography>
            <Typography variant="body" as="p">Vi skickar push-notiser för att hålla dig uppdaterad om din krets. Du kan när som helst stänga av notiser i Inställningar eller i din enhets inställningar.</Typography>
          </section>

          <section>
            <Typography variant="body" as="p">Svensk lag tillämpas och GDPR efterföljs.</Typography>
          </section>

          <Typography variant="meta" as="p" className="pt-200" style={{ color: "hsl(var(--color-text-muted))" }}>Senast uppdaterad: mars 2026</Typography>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
