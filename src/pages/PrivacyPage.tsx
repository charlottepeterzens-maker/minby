import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const PrivacyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F7F3EF" }}>
      <div className="max-w-[600px] mx-auto px-6 py-6">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1 text-[13px] font-medium" style={{ color: "#3C2A4D" }}>
          <ChevronLeft className="w-4 h-4" strokeWidth={1.5} /> Tillbaka
        </button>

        <h1 className="font-display text-[22px] font-medium mb-8" style={{ color: "#3C2A4D" }}>Integritetspolicy</h1>

        <div className="space-y-6 text-[13px] leading-[1.7]" style={{ color: "#5A4A65" }}>
          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "#3C2A4D" }}>Vad vi samlar in</h2>
            <p>Namn, e-postadress, profilbild, inlägg i delar av min vardag, gruppchattar och meddelanden, lediga datum och aktiviteter.</p>
          </section>

          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "#3C2A4D" }}>Varför vi samlar in det</h2>
            <p>För att driva och förbättra Minby-tjänsten.</p>
          </section>

          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "#3C2A4D" }}>Hur länge vi sparar det</h2>
            <p>All data sparas tills du raderar ditt konto.</p>
          </section>

          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "#3C2A4D" }}>Delning med tredje part</h2>
            <p>Din data säljs aldrig och delas aldrig med tredje part.</p>
          </section>

          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "#3C2A4D" }}>Dina rättigheter</h2>
            <p>Du har rätt att begära ut, korrigera eller radera din data genom att kontakta oss på{" "}
              <a href="mailto:charlotte.peterzens@gmail.com" className="underline" style={{ color: "#3C2A4D" }}>charlotte.peterzens@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "#3C2A4D" }}>Kontakt</h2>
            <p>Charlotte Peterzéns,{" "}
              <a href="mailto:charlotte.peterzens@gmail.com" className="underline" style={{ color: "#3C2A4D" }}>charlotte.peterzens@gmail.com</a>
            </p>
          </section>

          <section>
            <p>Svensk lag tillämpas och GDPR efterföljs.</p>
          </section>

          <p className="text-[11px] pt-2" style={{ color: "#9B8BA5" }}>Senast uppdaterad: mars 2026</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
