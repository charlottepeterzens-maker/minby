import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { X, Heart } from "lucide-react";
import { toast } from "sonner";

interface CloseCircleSuggestionProps {
  friendUserId: string;
  friendName: string;
  onDismiss: () => void;
}

const CloseCircleSuggestion = ({ friendUserId, friendName, onDismiss }: CloseCircleSuggestionProps) => {
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!user) return;
    setAdding(true);
    const { error } = await supabase
      .from("friend_access_tiers")
      .update({ tier: "close" as any })
      .eq("owner_id", user.id)
      .eq("friend_user_id", friendUserId);

    if (error) {
      toast.error("Kunde inte lägga till");
    } else {
      toast.success(`${friendName} är nu i din närmaste krets`);
    }
    setAdding(false);
    onDismiss();
  };

  return (
    <div
      className="mb-4 relative flex items-center gap-3"
      style={{
        backgroundColor: "#F5F0FA",
        borderRadius: 12,
        padding: "12px 14px",
      }}
    >
      <Heart className="w-4 h-4 shrink-0" style={{ color: "#C9B8D8" }} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px]" style={{ color: "#3C2A4D" }}>
          Vill du lägga till <span className="font-medium">{friendName}</span> i din närmaste krets?
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleAdd}
          disabled={adding}
          className="px-3 py-1 rounded-[20px] text-[11px] font-medium"
          style={{ backgroundColor: "#3C2A4D", color: "#F7F3EF" }}
        >
          Ja
        </button>
        <button
          onClick={onDismiss}
          className="w-6 h-6 flex items-center justify-center"
        >
          <X className="w-3.5 h-3.5" style={{ color: "#6B5C78" }} />
        </button>
      </div>
    </div>
  );
};

export default CloseCircleSuggestion;
