import { motion } from "framer-motion";
import { Calendar, MapPin, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PlanWithDetails {
  id: string;
  title: string;
  emoji: string;
  date_text: string;
  location: string | null;
  vibe: string;
  created_by: string;
  creator_name: string;
  creator_initial: string;
  rsvps: { user_id: string; status: string; display_name: string; initial: string }[];
  userRsvp: string | null;
}

const vibeColors: Record<string, string> = {
  chill: "bg-secondary/40 text-secondary-foreground",
  adventure: "bg-primary/10 text-primary",
  creative: "bg-accent/30 text-accent-foreground",
  selfcare: "bg-muted text-muted-foreground",
};

const PlanCard = ({ plan, onRsvpChange }: { plan: PlanWithDetails; onRsvpChange: () => void }) => {
  const { user } = useAuth();
  const isIn = plan.userRsvp === "in";

  const handleRsvp = async () => {
    if (!user) return;

    if (isIn) {
      await supabase.from("rsvps").delete().eq("plan_id", plan.id).eq("user_id", user.id);
    } else {
      const { error } = await supabase.from("rsvps").upsert({
        plan_id: plan.id,
        user_id: user.id,
        status: "in",
      }, { onConflict: "plan_id,user_id" });
      if (error) {
        toast.error("Couldn't RSVP");
        return;
      }
    }
    onRsvpChange();
  };

  const inCount = plan.rsvps.filter((r) => r.status === "in").length;

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
              by {plan.creator_name}
            </p>
          </div>
        </div>
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${vibeColors[plan.vibe] || vibeColors.chill}`}>
          {plan.vibe}
        </span>
      </div>

      <div className="flex flex-col gap-2 mb-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 text-primary" />
          <span>{plan.date_text}</span>
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
            {plan.rsvps.filter(r => r.status === "in").slice(0, 5).map((r, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-primary/15 border-2 border-card flex items-center justify-center text-xs font-semibold text-primary"
              >
                {r.initial}
              </div>
            ))}
          </div>
          <span className="text-xs text-muted-foreground ml-2">
            {inCount} in
          </span>
        </div>

        <Button
          variant={isIn ? "default" : "warm"}
          size="sm"
          className="rounded-full text-xs font-semibold px-4"
          onClick={handleRsvp}
        >
          {isIn ? (
            <><Heart className="w-3 h-3 fill-current" /> I'm in!</>
          ) : (
            <><Heart className="w-3 h-3" /> Count me in</>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default PlanCard;
export type { PlanWithDetails };
