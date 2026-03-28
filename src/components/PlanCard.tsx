import { Calendar, MapPin, Heart } from "lucide-react";
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
  chill: "bg-lavender-bg text-secondary-foreground",
  adventure: "bg-salvia-bg text-accent-foreground",
  creative: "bg-dusty-rose-bg text-foreground",
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
    <div className="bg-card rounded-lg p-5 border border-border">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-lavender-bg rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-secondary-foreground" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-display text-base font-medium text-card-foreground leading-tight">
              {plan.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              av {plan.creator_name}
            </p>
          </div>
        </div>
        <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${vibeColors[plan.vibe] || vibeColors.chill}`}>
          {plan.vibe}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
          <span>{plan.date_text}</span>
        </div>
        {plan.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
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
                className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[10px] font-medium text-secondary border-2 border-card"
              >
                {r.initial}
              </div>
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground ml-2">
            {inCount} in
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className={`rounded-lg text-xs font-medium px-4 border ${
            isIn
              ? "bg-salvia-bg text-accent-foreground border-accent"
              : "bg-card text-muted-foreground border-border hover:bg-salvia-bg hover:text-accent-foreground"
          }`}
          onClick={handleRsvp}
        >
          {isIn ? (
            <><Heart className="w-3 h-3 fill-current mr-1" /> Jag är med!</>
          ) : (
            <><Heart className="w-3 h-3 mr-1" strokeWidth={1.5} /> Ja, jag är med!</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PlanCard;
export type { PlanWithDetails };
