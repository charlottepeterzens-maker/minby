import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const vibes = [
  { value: "chill" as const, label: "Chill 🧘" },
  { value: "adventure" as const, label: "Adventure 🌿" },
  { value: "creative" as const, label: "Creative 🎨" },
  { value: "selfcare" as const, label: "Self-care 💆" },
];

const emojiSuggestions = ["🎬", "🎨", "🧘", "🍷", "☕", "🌿", "🏖️", "💅", "📚", "🎵", "🍕", "🌸"];

interface CreatePlanDialogProps {
  groupId: string;
  onPlanCreated: () => void;
}

const CreatePlanDialog = ({ groupId, onPlanCreated }: CreatePlanDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dateText, setDateText] = useState("");
  const [location, setLocation] = useState("");
  const [selectedVibe, setSelectedVibe] = useState("chill");
  const [selectedEmoji, setSelectedEmoji] = useState("🎬");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title || !dateText || !user) return;
    setLoading(true);

    const { error } = await supabase.from("plans").insert({
      group_id: groupId,
      created_by: user.id,
      title,
      emoji: selectedEmoji,
      date_text: dateText,
      location: location || null,
      vibe: selectedVibe,
    });

    if (error) {
      toast.error("Couldn't create plan");
    } else {
      // Auto-RSVP the creator
      await supabase.from("rsvps").insert({
        plan_id: (await supabase.from("plans").select("id").order("created_at", { ascending: false }).limit(1).single()).data?.id ?? "",
        user_id: user.id,
        status: "in",
      });
      toast.success("Plan shared! ✨");
      onPlanCreated();
      setTitle("");
      setDateText("");
      setLocation("");
      setSelectedVibe("chill");
      setSelectedEmoji("🎬");
      setOpen(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full font-semibold gap-2 shadow-soft">
          <Plus className="w-4 h-4" /> New plan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl border-border/50">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            What do you feel like doing?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div>
            <Label className="text-sm font-medium text-muted-foreground mb-2 block">Pick an emoji</Label>
            <div className="flex flex-wrap gap-2">
              {emojiSuggestions.map((e) => (
                <button
                  key={e}
                  onClick={() => setSelectedEmoji(e)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    selectedEmoji === e ? "bg-primary/15 ring-2 ring-primary/30 scale-110" : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="plan-title" className="text-sm font-medium text-muted-foreground">What's the plan?</Label>
            <Input
              id="plan-title"
              placeholder="Cinema night, painting session, wine & chat..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 rounded-xl bg-muted/50 border-border/50"
            />
          </div>

          <div>
            <Label htmlFor="plan-date" className="text-sm font-medium text-muted-foreground">When?</Label>
            <Input
              id="plan-date"
              placeholder="March 11, Last weekend in June..."
              value={dateText}
              onChange={(e) => setDateText(e.target.value)}
              className="mt-1.5 rounded-xl bg-muted/50 border-border/50"
            />
          </div>

          <div>
            <Label htmlFor="plan-location" className="text-sm font-medium text-muted-foreground">Where? (optional)</Label>
            <Input
              id="plan-location"
              placeholder="My place, downtown, the park..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1.5 rounded-xl bg-muted/50 border-border/50"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground mb-2 block">Vibe</Label>
            <div className="flex gap-2 flex-wrap">
              {vibes.map((v) => (
                <button
                  key={v.value}
                  onClick={() => setSelectedVibe(v.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedVibe === v.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleCreate} disabled={!title || !dateText || loading} className="w-full rounded-xl font-semibold">
            Share with the group ✨
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePlanDialog;
