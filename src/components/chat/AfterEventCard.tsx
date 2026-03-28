import { useState } from "react";
import { Camera, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { compressImage } from "@/utils/imageCompression";
import { motion } from "framer-motion";

interface AfterEventCardProps {
  planId: string;
  planTitle: string;
  planDate: string;
  groupId: string;
  onDismiss: () => void;
  onMemorySaved: () => void;
}

const AfterEventCard = ({ planId, planTitle, planDate, groupId, onDismiss, onMemorySaved }: AfterEventCardProps) => {
  const { user } = useAuth();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setImageFile(compressed);
    setImagePreview(URL.createObjectURL(compressed));
  };

  const handleSave = async () => {
    if (!user || (!note.trim() && !imageFile)) return;
    setSaving(true);

    let imageUrl: string | null = null;

    if (imageFile) {
      const filePath = `${groupId}/${planId}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("life-images")
        .upload(filePath, imageFile);
      if (!uploadError) {
        imageUrl = filePath;
      }
    }

    const { error } = await (supabase as any).from("group_memories").insert({
      group_id: groupId,
      plan_id: planId,
      user_id: user.id,
      content: note.trim() || null,
      image_url: imageUrl,
    });

    if (error) {
      toast.error("Kunde inte spara minnet");
    } else {
      toast.success("Minne sparat!");
      onMemorySaved();
    }
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-2 p-3 rounded-[12px] space-y-2.5"
      style={{ backgroundColor: "hsl(var(--color-surface-card))", border: "1px solid #EDE8F4" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
            Ni hade {planTitle.toLowerCase()}
          </p>
          <p className="text-[11px]" style={{ color: "hsl(var(--color-text-secondary))" }}>
            {planDate} · Vill ni spara något från den kvällen?
          </p>
        </div>
        <button onClick={onDismiss} className="p-1 -mt-1 -mr-1">
          <X className="w-3.5 h-3.5" style={{ color: "hsl(var(--color-text-muted))" }} />
        </button>
      </div>

      {imagePreview && (
        <div className="relative">
          <img src={imagePreview} alt="" loading="lazy" className="w-full h-24 object-cover rounded-[8px]" />
          <button
            onClick={() => { setImageFile(null); setImagePreview(null); }}
            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <label className="shrink-0 w-8 h-8 rounded-[8px] flex items-center justify-center cursor-pointer" style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}>
          <Camera className="w-4 h-4" style={{ color: "hsl(var(--color-text-secondary))" }} />
          <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Skriv en rad..."
          className="flex-1 px-3 py-2 text-[12px] rounded-[8px] border outline-none"
          style={{ backgroundColor: "hsl(var(--color-surface))", borderColor: "hsl(var(--color-surface-raised))", color: "hsl(var(--color-text-primary))" }}
        />
        <button
          onClick={handleSave}
          disabled={saving || (!note.trim() && !imageFile)}
          className="shrink-0 px-3 py-2 text-[11px] font-medium rounded-[8px] disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: "hsl(var(--color-text-primary))", color: "#FFFFFF" }}
        >
          Spara
        </button>
      </div>
    </motion.div>
  );
};

export default AfterEventCard;
