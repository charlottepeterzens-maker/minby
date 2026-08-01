import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Typography } from "@/components/ui/typography";

const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
      <div className="max-w-[600px] mx-auto px-6 py-6 pt-safe">
        <Typography
          as="button"
          variant="label"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1"
          style={{ color: "hsl(var(--color-text-primary))" }}
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.5} /> Tillbaka
        </Typography>

        <Typography variant="display" as="h1" className="mb-8" style={{ color: "hsl(var(--color-text-primary))" }}>Användarvillkor</Typography>

        <div className="space-y-6" style={{ color: "#5A4A65" }}>
          <section>
            <Typography variant="heading" as="h2" className="mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Tjänsten</Typography>
            <Typography variant="body" as="p">Minby är en social app i testfas driven av Charlotte Peterzéns.</Typography>
          </section>

          <section>
            <Typography variant="heading" as="h2" className="mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Ålder</Typography>
            <Typography variant="body" as="p">Du måste vara minst 18 år för att använda tjänsten.</Typography>
          </section>

          <section>
            <Typography variant="heading" as="h2" className="mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Ditt innehåll</Typography>
            <Typography variant="body" as="p">Du ansvarar själv för det innehåll du publicerar i appen.</Typography>
          </section>

          <section>
            <Typography variant="heading" as="h2" className="mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Testfas</Typography>
            <Typography variant="body" as="p">Tjänsten är under aktiv utveckling och kan ändras eller avslutas när som helst.</Typography>
          </section>

          <section>
            <Typography variant="heading" as="h2" className="mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Uppförande</Typography>
            <Typography variant="body" as="p">Respektera andra användare – kränkande eller stötande innehåll tolereras inte.</Typography>
          </section>

          <section>
            <Typography variant="heading" as="h2" className="mb-1.5" style={{ color: "hsl(var(--color-text-primary))" }}>Kontakt</Typography>
            <Typography variant="body" as="p"><a href="mailto:hi@minby.online" className="underline" style={{ color: "hsl(var(--color-text-primary))" }}>hi@minby.online</a></Typography>
          </section>

          <Typography variant="meta" as="p" className="pt-2" style={{ color: "hsl(var(--color-text-muted))" }}>Senast uppdaterad: mars 2026</Typography>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
