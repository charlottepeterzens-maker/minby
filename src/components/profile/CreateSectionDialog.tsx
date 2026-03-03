import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const presets = [
  { name: "My kids", emoji: "👶", type: "posts" },
  { name: "My partner", emoji: "💕", type: "posts" },
  { name: "House renovation", emoji: "🏠", type: "posts" },
  { name: "Work life", emoji: "💼", type: "posts" },
  { name: "My pregnancy", emoji: "🤰", type: "posts" },
  { name: "Period tracker", emoji: "🩸", type: "period" },
  { name: "My workouts", emoji: "💪", type: "workout" },
  { name: "Travel", emoji: "✈️", type: "posts" },
  { name: "Pets", emoji: "🐾", type: "posts" },
  { name: "Cooking", emoji: "🍳", type: "posts" },
];

interface Props {
  onCreated: () => void;
}

const CreateSectionDialog = ({ onCreated }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📝");
  const [sectionType, setSectionType] = useState("posts");
  const [minTier, setMinTier] = useState("outer");
  const [loading, setLoading] = useState(false);

  const handlePreset = (preset: typeof presets[0]) => {
    setName(preset.name);
    setEmoji(preset.emoji);
    setSectionType(preset.type);
  };

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setLoading(true);

    const { error } = await supabase.from("life_sections").insert({
      user_id: user.id,
      name: name.trim(),
      emoji,
      min_tier: minTier as any,
      section_type: sectionType,
    });

    if (error) {
      toast.error("Could not create section");
    } else {
      toast.success(`${name} added!`);
      setOpen(false);
      setName("");
      setEmoji("📝");
      setSectionType("posts");
      setMinTier("outer");
      onCreated();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="warm" size="sm" className="rounded-full">
          <Plus className="w-4 h-4" /> Add section
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Add a life section</DialogTitle>
        </DialogHeader>

        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={() => handlePreset(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                name === p.name
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border/50 hover:bg-muted/80"
              }`}
            >
              {p.emoji} {p.name}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="w-16">
              <Label className="text-xs text-muted-foreground">Emoji</Label>
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="mt-1 text-center rounded-xl" maxLength={4} />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My garden" className="mt-1 rounded-xl" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Who can see this?</Label>
            <Select value={minTier} onValueChange={setMinTier}>
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="close">Close friends only</SelectItem>
                <SelectItem value="inner">Inner circle & closer</SelectItem>
                <SelectItem value="outer">All friends</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleCreate} disabled={!name.trim() || loading} className="w-full rounded-xl">
            {loading ? "Creating..." : "Create section"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSectionDialog;
