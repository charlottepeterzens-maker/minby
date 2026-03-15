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
import { Plus } from "lucide-react";

const presets = [
  { name: "Barn", type: "posts" },
  { name: "Familj", type: "posts" },
  { name: "Jobb", type: "posts" },
  { name: "Hem", type: "posts" },
  { name: "Kärlek", type: "posts" },
  { name: "Hälsa", type: "posts" },
  { name: "Träning", type: "workout" },
  { name: "Resor", type: "posts" },
  { name: "Husdjur", type: "posts" },
  { name: "Mat & dryck", type: "posts" },
  { name: "Studier", type: "posts" },
  { name: "Projekt", type: "posts" },
  { name: "Övrigt", type: "posts" },
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

  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handlePreset = (preset: typeof presets[0]) => {
    if (selectedPreset === preset.name) {
      setSelectedPreset(null);
      setName("");
      setSectionType("posts");
      return;
    }
    setSelectedPreset(preset.name);
    setSectionType(preset.type);
    if (preset.name === "Övrigt") {
      setName("");
    } else {
      setName(preset.name);
    }
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
          <DialogTitle className="font-display">Lägg till en del av din vardag</DialogTitle>
          <p className="text-[13px] text-muted-foreground mt-1">Vad händer i ditt liv just nu som du vill dela med dina närmaste?</p>
        </DialogHeader>

        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={() => handlePreset(p)}
              style={{
                borderRadius: 20,
                fontSize: 13,
                padding: "6px 14px",
                border: "0.5px solid #DDD5CC",
                backgroundColor: selectedPreset === p.name ? "#3C2A4D" : "#FFFFFF",
                color: selectedPreset === p.name ? "#FFFFFF" : "#3C2A4D",
              }}
              className="font-medium transition-all"
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">{t("name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={selectedPreset === "Övrigt" ? "Vad vill du dela?" : t("sectionNamePlaceholder")} className="mt-1" />
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
