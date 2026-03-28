const HeroSection = () => {
  return (
    <section className="pt-16 pb-8 px-5 text-center">
      <div className="max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-lavender-bg text-secondary-foreground px-4 py-1.5 rounded-full text-[11px] font-medium mb-6">
          Less scrolling, more living
        </div>

        <h1 className="font-display font-medium text-[20px] text-foreground leading-tight mb-4">
          Your village.
          <br />
          <span className="text-primary italic">Always close.</span>
        </h1>

        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Stop sending reels. Start making plans.
          Share what you feel like doing IRL — and see who's in.
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
