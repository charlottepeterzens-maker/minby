const TermsPage = () => (
  <div className="min-h-screen bg-background px-5 py-10 max-w-2xl mx-auto">
    <h1 className="font-display text-[22px] font-medium text-foreground mb-6">Användarvillkor</h1>
    <div className="space-y-4 text-[13px] text-muted-foreground leading-[1.7]">
      <p>Genom att skapa ett konto på Minby godkänner du dessa villkor.</p>
      <h2 className="text-foreground font-medium text-[15px] pt-2">Användning av tjänsten</h2>
      <p>Minby är en plattform för att hålla kontakten med vänner och planera träffar. Du ansvarar för allt innehåll du delar och förbinder dig att inte använda tjänsten för att sprida hat, trakasserier eller olagligt material.</p>
      <h2 className="text-foreground font-medium text-[15px] pt-2">Konto och säkerhet</h2>
      <p>Du ansvarar för att hålla dina inloggningsuppgifter säkra. Om du misstänker obehörig åtkomst till ditt konto, kontakta oss omedelbart.</p>
      <h2 className="text-foreground font-medium text-[15px] pt-2">Uppsägning</h2>
      <p>Du kan när som helst sluta använda Minby. Vi förbehåller oss rätten att stänga av konton som bryter mot dessa villkor.</p>
      <h2 className="text-foreground font-medium text-[15px] pt-2">Ändringar</h2>
      <p>Vi kan uppdatera dessa villkor. Vid väsentliga ändringar meddelar vi dig via appen.</p>
    </div>
  </div>
);

export default TermsPage;
