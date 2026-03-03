import { useState } from "react";
import { motion } from "framer-motion";
import HeroSection from "@/components/HeroSection";
import PlanCard, { type Plan } from "@/components/PlanCard";
import CreatePlanDialog from "@/components/CreatePlanDialog";
import { Sparkles } from "lucide-react";

const initialPlans: Plan[] = [
  {
    id: "1",
    title: "Cinema night — who's in?",
    emoji: "🎬",
    date: "March 11",
    location: "Filmstaden Sergel",
    author: "Emma",
    authorInitial: "E",
    attendees: [
      { name: "Emma", initial: "E" },
      { name: "Sara", initial: "S" },
      { name: "Klara", initial: "K" },
    ],
    vibe: "chill",
    comments: 4,
  },
  {
    id: "2",
    title: "Painting my windows 🎨",
    emoji: "🎨",
    date: "Last weekend in June",
    location: "My place",
    author: "Lina",
    authorInitial: "L",
    attendees: [
      { name: "Lina", initial: "L" },
      { name: "Anna", initial: "A" },
    ],
    maxSpots: 5,
    vibe: "creative",
    comments: 2,
  },
  {
    id: "3",
    title: "PMS day — cozy blankets only",
    emoji: "💆",
    date: "This Sunday",
    author: "Sofia",
    authorInitial: "S",
    attendees: [
      { name: "Sofia", initial: "S" },
      { name: "Maja", initial: "M" },
      { name: "Emma", initial: "E" },
      { name: "Klara", initial: "K" },
    ],
    vibe: "selfcare",
    comments: 8,
  },
  {
    id: "4",
    title: "Sunrise hike & breakfast",
    emoji: "🌿",
    date: "Saturday March 15",
    location: "Hellasgården",
    author: "Maja",
    authorInitial: "M",
    attendees: [
      { name: "Maja", initial: "M" },
    ],
    maxSpots: 6,
    vibe: "adventure",
    comments: 1,
  },
];

const vibeFilters = [
  { label: "All", value: "all" },
  { label: "🧘 Chill", value: "chill" },
  { label: "🌿 Adventure", value: "adventure" },
  { label: "🎨 Creative", value: "creative" },
  { label: "💆 Self-care", value: "selfcare" },
];

const Index = () => {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredPlans = activeFilter === "all"
    ? plans
    : plans.filter((p) => p.vibe === activeFilter);

  const handleCreatePlan = (plan: Plan) => {
    setPlans((prev) => [plan, ...prev]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌸</span>
            <span className="font-display text-lg font-bold text-foreground">Gather</span>
          </div>
          <CreatePlanDialog onCreatePlan={handleCreatePlan} />
        </div>
      </nav>

      <HeroSection />

      {/* Filters & Feed */}
      <main className="max-w-2xl mx-auto px-4 pb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide"
        >
          {vibeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeFilter === f.value
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </motion.div>

        <div className="flex flex-col gap-4">
          {filteredPlans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.4 }}
            >
              <PlanCard plan={plan} />
            </motion.div>
          ))}
        </div>

        {filteredPlans.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Sparkles className="w-10 h-10 text-primary/30 mx-auto mb-4" />
            <p className="font-display text-lg text-muted-foreground">
              No plans yet for this vibe.
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Be the first to suggest something!
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Index;
