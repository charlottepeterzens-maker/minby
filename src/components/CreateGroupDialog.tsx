import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface CreateGroupDialogProps {
  onGroupCreated: () => void;
}

const CreateGroupDialog = ({ onGroupCreated }: CreateGroupDialogProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || !user) return;
    setLoading(true);

    const { error } = await supabase.from("friend_groups").insert({
      name,
      emoji: "—",
      owner_id: user.id,
    });

    if (error) {
      toast.error(t("couldntCreateGroup"));
    } else {
      toast.success(t("groupCreated"));
      onGroupCreated();
      setName("");
      setOpen(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> {t("newGroup")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t("createFriendGroup")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="gname" className="text-sm text-muted-foreground">{t("groupName")}</Label>
            <Input
              id="gname"
              placeholder={t("groupNamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 bg-muted/50 border-border/50"
            />
          </div>
          <Button onClick={handleCreate} disabled={!name || loading} className="w-full font-semibold">
            {t("createGroup")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
