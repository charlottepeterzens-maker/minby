import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
      <div className="max-w-[600px] mx-auto px-6 py-6 pt-safe">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1 text-[13px] font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
          <ChevronLeft className="w-4 h-4" strokeWidth={1.5} /> Tillbaka
        </button>

        <h1 className="font-display text-[22px] font-medium mb-8" style={{ color: "hsl(var(--color-text-primary))" }}>Användarvillkor</h1>

        <div className="space-y-6 text-[13px] leading-[1.7]" style={{ color: "#5A4A65" }}>
          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Tjänsten</h2>
            <p>Minby är en social app i testfas driven av Charlotte Peterzéns.</p>
          </section>

          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Ålder</h2>
            <p>Du måste vara minst 18 år för att använda tjänsten.</p>
          </section>

          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Ditt innehåll</h2>
            <p>Du ansvarar själv för det innehåll du publicerar i appen.</p>
          </section>

          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Testfas</h2>
            <p>Tjänsten är under aktiv utveckling och kan ändras eller avslutas när som helst.</p>
          </section>

          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Uppförande</h2>
            <p>Respektera andra användare – kränkande eller stötande innehåll tolereras inte.</p>
          </section>

          <section>
            <h2 className="font-medium text-[14px] mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Kontakt</h2>
            <p><a href="mailto:hi@minby.online" className="underline" style={{ color: "hsl(var(--color-text-primary))" }}>hi@minby.online</a></p>
          </section>

          <p className="text-[11px] pt-2" style={{ color: "hsl(var(--color-text-muted))" }}>Senast uppdaterad: mars 2026</p>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
