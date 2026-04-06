import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const PrivacyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
      <div className="max-w-[600px] mx-auto px-6 py-6 pt-safe">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1 text-[13px] font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
          <ChevronLeft className="w-4 h-4" strokeWidth={1.5} /> Tillbaka
        </button>

        <h1 className="font-display text-[22px] font-medium mb-8" style={{ color: "hsl(var(--color-text-primary))" }}>Integritetspolicy</h1>

        <div className="space-y-6 text-[13px] leading-[1.7]" style={{ color: "#5A4A65" }}>
          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Vad vi samlar in</h2>
            <p>Namn, e-postadress, profilbild, inlägg i delar av min vardag, gruppchattar och meddelanden, datum och aktiviteter för 'Hitta på något'.</p>
          </section>

          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Varför vi samlar in det</h2>
            <p>För att driva och förbättra Minby-tjänsten.</p>
          </section>

          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Hur länge vi sparar det</h2>
            <p>All data sparas tills du raderar ditt konto.</p>
          </section>

          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Delning med tredje part</h2>
            <p>Din data säljs aldrig och delas aldrig med tredje part.</p>
          </section>

          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Dina rättigheter</h2>
            <p>Du har rätt att begära ut, korrigera eller radera din data genom att kontakta oss på{" "}
              <a href="mailto:hi@minby.online" className="underline" style={{ color: "hsl(var(--color-text-primary))" }}>hi@minby.online</a>.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Kontakt</h2>
            <p>Charlotte Peterzéns,{" "}
              <a href="mailto:hi@minby.online" className="underline" style={{ color: "hsl(var(--color-text-primary))" }}>hi@minby.online</a>
            </p>
          </section>

          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Push-notiser</h2>
            <p>Vi skickar push-notiser för att hålla dig uppdaterad om din krets. Du kan när som helst stänga av notiser i Inställningar eller i din enhets inställningar.</p>
          </section>

          <section>
            <p>Svensk lag tillämpas och GDPR efterföljs.</p>
          </section>

          <p className="text-[11px] pt-2" style={{ color: "hsl(var(--color-text-muted))" }}>Senast uppdaterad: mars 2026</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
