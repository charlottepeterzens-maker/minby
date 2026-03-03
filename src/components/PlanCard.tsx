import { motion } from "framer-motion";
import { Calendar, MapPin, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export interface Plan {
  id: string;
  title: string;
  emoji: string;
  date: string;
  location?: string;
  author: string;
  authorInitial: string;
  attendees: { name: string; initial: string }[];
  maxSpots?: number;
  vibe: "chill" | "adventure" | "creative" | "selfcare";
  comments: number;
}

const vibeColors: Record<Plan["vibe"], string> = {
  chill: "bg-secondary/40 text-secondary-foreground",
  adventure: "bg-primary/10 text-primary",
  creative: "bg-accent/30 text-accent-foreground",
  selfcare: "bg-muted text-muted-foreground",
};

const PlanCard = ({ plan }: { plan: Plan }) => {
  const [isIn, setIsIn] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-shadow duration-300 border border-border/50"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{plan.emoji}</span>
          <div>
            <h3 className="font-display text-lg font-semibold text-card-foreground leading-tight">
              {plan.title}
            </h3>
            <p className="text-sm text-muted-foreground font-body">
              by {plan.author}
            </p>
          </div>
        </div>
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${vibeColors[plan.vibe]}`}>
          {plan.vibe}
        </span>
      </div>

      <div className="flex flex-col gap-2 mb-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 text-primary" />
          <span>{plan.date}</span>
        </div>
        {plan.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span>{plan.location}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-2">
            {plan.attendees.map((a, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-primary/15 border-2 border-card flex items-center justify-center text-xs font-semibold text-primary"
              >
                {a.initial}
              </div>
            ))}
          </div>
          <span className="text-xs text-muted-foreground ml-2">
            {plan.attendees.length} in
            {plan.maxSpots && ` · ${plan.maxSpots - plan.attendees.length} spots left`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <MessageCircle className="w-4 h-4" />
            {plan.comments}
          </button>
          <Button
            variant={isIn ? "default" : "warm"}
            size="sm"
            className="rounded-full text-xs font-semibold px-4"
            onClick={() => setIsIn(!isIn)}
          >
            {isIn ? (
              <>
                <Heart className="w-3 h-3 fill-current" /> I'm in!
              </>
            ) : (
              <>
                <Heart className="w-3 h-3" /> Count me in
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default PlanCard;
