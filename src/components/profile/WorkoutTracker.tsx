import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { Dumbbell } from "lucide-react";

interface WorkoutEntry {
  id: string;
  date: string;
  workout_type: string;
  duration_mins: number | null;
  notes: string | null;
}

interface Props {
  section: { id: string; name: string; emoji: string; min_tier: string };
  isOwner: boolean;
}

const workoutTypes = ["Running", "Yoga", "Weights", "HIIT", "Swimming", "Cycling", "Walk", "Pilates", "Other"];

const WorkoutTracker = ({ section, isOwner }: Props) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WorkoutEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [workoutType, setWorkoutType] = useState("Running");
  const [duration, setDuration] = useState("30");

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("workout_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(30);
    if (data) setEntries(data as WorkoutEntry[]);
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const logWorkout = async () => {
    if (!user) return;
    const { error } = await supabase.from("workout_entries").insert({
      user_id: user.id,
      date: format(new Date(), "yyyy-MM-dd"),
      workout_type: workoutType,
      duration_mins: parseInt(duration) || null,
    });
    if (error) {
      toast.error("Could not log workout");
    } else {
      toast.success("Workout logged!");
      setShowLog(false);
      fetchEntries();
    }
  };

  // Week streak
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const hasWorkout = entries.some((e) => e.date === dateStr);
    return { date, dateStr, hasWorkout };
  });

  const weekCount = last7.filter((d) => d.hasWorkout).length;

  return (
    <Card className="rounded-2xl border-border/50 shadow-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <span className="text-xl">{section.emoji}</span> {section.name}
          </CardTitle>
          {isOwner && (
            <Button variant="warm" size="sm" className="rounded-full text-xs" onClick={() => setShowLog(!showLog)}>
              <Dumbbell className="w-3 h-3" /> Log workout
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Week dots */}
        <div className="flex gap-2 mb-3 justify-center">
          {last7.map((day) => (
            <div key={day.dateStr} className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-muted-foreground/60">{format(day.date, "EEE").slice(0, 2)}</span>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                day.hasWorkout ? "bg-secondary text-secondary-foreground" : "bg-muted/30 text-muted-foreground/30"
              }`}>
                {day.hasWorkout ? "✓" : "·"}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mb-3">
          {weekCount}/7 this week
        </p>

        {/* Recent entries */}
        {entries.slice(0, 3).map((e) => (
          <div key={e.id} className="flex items-center gap-2 py-1 text-xs">
            <span className="text-muted-foreground/60">{format(new Date(e.date), "MMM d")}</span>
            <span className="font-medium text-foreground">{e.workout_type}</span>
            {e.duration_mins && <span className="text-muted-foreground">{e.duration_mins}min</span>}
          </div>
        ))}

        {/* Log form */}
        {showLog && isOwner && (
          <div className="mt-3 bg-muted/30 rounded-xl p-3 space-y-2">
            <Select value={workoutType} onValueChange={setWorkoutType}>
              <SelectTrigger className="h-8 text-xs rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workoutTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Duration (minutes)"
              type="number"
              className="h-8 text-xs rounded-xl"
            />
            <Button size="sm" onClick={logWorkout} className="w-full rounded-xl text-xs">
              Save workout
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkoutTracker;
