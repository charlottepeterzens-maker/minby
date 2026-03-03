import { motion } from "framer-motion";

const HeroSection = () => {
  return (
    <section className="relative pt-16 pb-8 px-4 text-center overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-primary/8 rounded-full blur-3xl" />
      <div className="absolute top-20 right-10 w-48 h-48 bg-accent/15 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-secondary/15 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 max-w-2xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          <span className="animate-float inline-block">🌸</span>
          Less scrolling, more living
        </div>

        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight mb-4">
          Gather your girls.
          <br />
          <span className="text-primary italic">Make it happen.</span>
        </h1>

        <p className="font-body text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
          Stop sending reels. Start making plans.
          Share what you feel like doing IRL — and see who's in.
        </p>
      </motion.div>
    </section>
  );
};

export default HeroSection;
