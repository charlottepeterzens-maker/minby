import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Sparkles } from "lucide-react";
import type { Plan } from "./PlanCard";

const vibes = [
  { value: "chill" as const, label: "Chill 🧘", emoji: "🧘" },
  { value: "adventure" as const, label: "Adventure 🌿", emoji: "🌿" },
  { value: "creative" as const, label: "Creative 🎨", emoji: "🎨" },
  { value: "selfcare" as const, label: "Self-care 💆", emoji: "💆" },
];

const emojiSuggestions = ["🎬", "🎨", "🧘", "🍷", "☕", "🌿", "🏖️", "💅", "📚", "🎵", "🍕", "🌸"];

interface CreatePlanDialogProps {
  onCreatePlan: (plan: Plan) => void;
}

const CreatePlanDialog = ({ onCreatePlan }: CreatePlanDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [selectedVibe, setSelectedVibe] = useState<Plan["vibe"]>("chill");
  const [selectedEmoji, setSelectedEmoji] = useState("🎬");

  const handleCreate = () => {
    if (!title || !date) return;
    onCreatePlan({
      id: Date.now().toString(),
      title,
      emoji: selectedEmoji,
      date,
      location: location || undefined,
      author: "You",
      authorInitial: "Y",
      attendees: [{ name: "You", initial: "Y" }],
      vibe: selectedVibe,
      comments: 0,
    });
    setTitle("");
    setDate("");
    setLocation("");
    setSelectedVibe("chill");
    setSelectedEmoji("🎬");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full font-semibold gap-2 shadow-soft">
          <Plus className="w-4 h-4" />
          New plan
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
                    selectedEmoji === e
                      ? "bg-primary/15 ring-2 ring-primary/30 scale-110"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="title" className="text-sm font-medium text-muted-foreground">What's the plan?</Label>
            <Input
              id="title"
              placeholder="Cinema night, painting session, wine & chat..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 rounded-xl bg-muted/50 border-border/50"
            />
          </div>

          <div>
            <Label htmlFor="date" className="text-sm font-medium text-muted-foreground">When?</Label>
            <Input
              id="date"
              placeholder="March 11, Last weekend in June..."
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 rounded-xl bg-muted/50 border-border/50"
            />
          </div>

          <div>
            <Label htmlFor="location" className="text-sm font-medium text-muted-foreground">Where? (optional)</Label>
            <Input
              id="location"
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
                    selectedVibe === v.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={!title || !date}
            className="w-full rounded-xl font-semibold"
          >
            Share with the group ✨
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePlanDialog;
