import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Baby, Heart, Home, Briefcase, Dumbbell, Plane, PawPrint, CookingPot } from "lucide-react";

const presets = [
  { name: "Barn", icon: Baby, type: "posts" },
  { name: "Partner", icon: Heart, type: "posts" },
  { name: "Husbygge", icon: Home, type: "posts" },
  { name: "Jobb", icon: Briefcase, type: "posts" },
  { name: "Träning", icon: Dumbbell, type: "workout" },
  { name: "Resor", icon: Plane, type: "posts" },
  { name: "Husdjur", icon: PawPrint, type: "posts" },
  { name: "Matlagning", icon: CookingPot, type: "posts" },
];

interface Props {
  onCreated: () => void;
  trigger?: React.ReactNode;
}

const CreateSectionDialog = ({ onCreated, trigger }: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sectionType, setSectionType] = useState("posts");
  const [minTier, setMinTier] = useState("outer");
  const [loading, setLoading] = useState(false);

  const handlePreset = (preset: typeof presets[0]) => {
    setName(preset.name);
    setSectionType(preset.type);
  };

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setLoading(true);

    const { error } = await supabase.from("life_sections").insert({
      user_id: user.id,
      name: name.trim(),
      emoji: "—",
      min_tier: minTier as any,
      section_type: sectionType,
    });

    if (error) {
      toast.error(t("couldNotCreateSection"));
    } else {
      toast.success(`${name} tillagt!`);
      setOpen(false);
      setName("");
      setSectionType("posts");
      setMinTier("outer");
      onCreated();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Plus className="w-4 h-4" /> {t("addSection")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{t("addLifeSection")}</DialogTitle>
        </DialogHeader>

        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.name}
                onClick={() => handlePreset(p)}
                className={`px-3 py-1.5 text-xs font-medium border transition-all inline-flex items-center gap-1.5 ${
                  name === p.name
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border/50 hover:bg-muted/80"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {p.name}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">{t("name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("sectionNamePlaceholder")} className="mt-1" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">{t("whoCanSee")}</Label>
            <Select value={minTier} onValueChange={setMinTier}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="close">{t("closeFriendsOnly")}</SelectItem>
                <SelectItem value="inner">{t("innerCircleCloser")}</SelectItem>
                <SelectItem value="outer">{t("allFriends")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleCreate} disabled={!name.trim() || loading} className="w-full">
            {loading ? t("creating") : t("createSection")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSectionDialog;
