import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CreateGroupDialogProps {
  onGroupCreated: () => void;
  trigger?: ReactNode;
}

const emojiPresets = [
  { emoji: "✈️", label: "Resa" },
  { emoji: "📚", label: "Bokklubb" },
  { emoji: "🎉", label: "Fest" },
  { emoji: "🏡", label: "Familj" },
  { emoji: "💬", label: "Övrigt" },
];

const CreateGroupDialog = ({ onGroupCreated, trigger }: CreateGroupDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("💬");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || !user) return;
    setLoading(true);

    const { error } = await supabase.from("friend_groups").insert({
      name,
      emoji: selectedEmoji,
      owner_id: user.id,
    });

    if (error) {
      toast.error("Kunde inte skapa gruppen");
    } else {
      toast.success("Grupp skapad!");
      onGroupCreated();
      setName("");
      setSelectedEmoji("💬");
      setOpen(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> Ny grupp
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Skapa grupp</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="gname" className="text-sm text-muted-foreground">
              Gruppnamn
            </Label>
            <Input
              id="gname"
              placeholder="T.ex. Resegänget"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 bg-muted/50 border-border/50"
            />
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">Välj emoji</Label>
            <div className="flex gap-2 mt-2">
              {emojiPresets.map((preset) => (
                <button
                  key={preset.emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(preset.emoji)}
                  className="flex flex-col items-center gap-1 rounded-lg p-2 transition-colors"
                  style={{
                    backgroundColor:
                      selectedEmoji === preset.emoji ? "#E8D5DA" : "#F7F3EF",
                    border:
                      selectedEmoji === preset.emoji
                        ? "1px solid #C9B8D8"
                        : "1px solid transparent",
                  }}
                >
                  <span className="text-lg">{preset.emoji}</span>
                  <span className="text-[10px]" style={{ color: "#7A6A85" }}>
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={!name || loading}
            className="w-full font-semibold"
          >
            Skapa grupp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
