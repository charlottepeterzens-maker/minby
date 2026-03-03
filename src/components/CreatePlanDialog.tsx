import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const emojiSuggestions = ["🎬", "🎨", "🧘", "🍷", "☕", "🌿", "🏖️", "💅", "📚", "🎵", "🍕", "🌸"];

interface CreatePlanDialogProps {
  groupId: string;
  onPlanCreated: () => void;
}

const CreatePlanDialog = ({ groupId, onPlanCreated }: CreatePlanDialogProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dateText, setDateText] = useState("");
  const [location, setLocation] = useState("");
  const [selectedVibe, setSelectedVibe] = useState("chill");
  const [selectedEmoji, setSelectedEmoji] = useState("🎬");
  const [loading, setLoading] = useState(false);

  const vibes = [
    { value: "chill" as const, label: t("vibeChill") },
    { value: "adventure" as const, label: t("vibeAdventure") },
    { value: "creative" as const, label: t("vibeCreative") },
    { value: "selfcare" as const, label: t("vibeSelfcare") },
  ];

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
      toast.error(t("couldntCreatePlan"));
    } else {
      // Auto-RSVP the creator
      await supabase.from("rsvps").insert({
        plan_id: (await supabase.from("plans").select("id").order("created_at", { ascending: false }).limit(1).single()).data?.id ?? "",
        user_id: user.id,
        status: "in",
      });
      toast.success(t("planShared"));
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
        <Button className="font-semibold gap-2 shadow-soft">
          <Plus className="w-4 h-4" /> {t("newPlan")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md border-border/50">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t("whatFeelLikeDoing")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div>
            <Label className="text-sm font-medium text-muted-foreground mb-2 block">{t("pickEmoji")}</Label>
            <div className="flex flex-wrap gap-2">
              {emojiSuggestions.map((e) => (
                <button
                  key={e}
                  onClick={() => setSelectedEmoji(e)}
                  className={`w-10 h-10 text-xl flex items-center justify-center transition-all ${
                    selectedEmoji === e ? "bg-primary/15 ring-2 ring-primary/30 scale-110" : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="plan-title" className="text-sm font-medium text-muted-foreground">{t("whatsThePlan")}</Label>
            <Input
              id="plan-title"
              placeholder={t("planTitlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 bg-muted/50 border-border/50"
            />
          </div>

          <div>
            <Label htmlFor="plan-date" className="text-sm font-medium text-muted-foreground">{t("when")}</Label>
            <Input
              id="plan-date"
              placeholder={t("planDatePlaceholder")}
              value={dateText}
              onChange={(e) => setDateText(e.target.value)}
              className="mt-1.5 bg-muted/50 border-border/50"
            />
          </div>

          <div>
            <Label htmlFor="plan-location" className="text-sm font-medium text-muted-foreground">{t("whereOptional")}</Label>
            <Input
              id="plan-location"
              placeholder={t("planLocationPlaceholder")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1.5 bg-muted/50 border-border/50"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground mb-2 block">{t("vibe")}</Label>
            <div className="flex gap-2 flex-wrap">
              {vibes.map((v) => (
                <button
                  key={v.value}
                  onClick={() => setSelectedVibe(v.value)}
                  className={`px-4 py-2 text-sm font-medium transition-all ${
                    selectedVibe === v.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleCreate} disabled={!title || !dateText || loading} className="w-full font-semibold">
            {t("shareWithGroup")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePlanDialog;
