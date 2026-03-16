import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Camera, User } from "lucide-react";

const ROOM_SUGGESTIONS = ["Jobb", "Familj", "Husbygge", "Resor", "Övrigt"];

interface Props {
  onComplete: () => void;
}

const OnboardingFlow = ({ onComplete }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNameContinue = async () => {
    if (!user || !displayName.trim()) return;
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("user_id", user.id);

    if (error) {
      await supabase.from("profiles").insert({
        user_id: user.id,
        display_name: displayName.trim(),
      });
    }

    setLoading(false);
    setStep(3);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bilden får vara max 5 MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarContinue = async () => {
    if (!user) return;
    setLoading(true);

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });

      if (uploadError) {
        toast.error("Kunde inte ladda upp bilden");
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("user_id", user.id);
    }

    setLoading(false);
    setStep(4);
  };

  const markOnboarded = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ onboarded_at: new Date().toISOString() } as any)
      .eq("user_id", user.id);
  };

  const handleCreateRoom = async () => {
    if (!user) return;
    setLoading(true);

    if (roomName.trim()) {
      await supabase.from("life_sections").insert({
        user_id: user.id,
        name: roomName.trim(),
        emoji: "—",
        min_tier: "outer" as const,
        section_type: "posts",
      });
    }

    await markOnboarded();
    setLoading(false);
    onComplete();
  };

  const handleSkip = async () => {
    if (!user) return;
    if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      await markOnboarded();
      onComplete();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: "#F7F3EF" }}>
      <div className="w-full max-w-sm text-center">
        {step === 1 && (
          <div className="space-y-6">
            <span
              className="block font-display lowercase"
              style={{ fontWeight: 300, fontSize: "26px", letterSpacing: "-0.5px", color: "#3C2A4D" }}
            >
              minby
            </span>
            <h1
              className="font-display"
              style={{ fontWeight: 500, fontSize: "22px", color: "#3C2A4D" }}
            >
              Välkommen till Minby
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: "14px" }}>
              Din plats för äkta kontakt med de som betyder mest
            </p>
            <Button
              onClick={() => setStep(2)}
              className="w-full text-[13px] font-normal"
              style={{ backgroundColor: "#3C2A4D", color: "#fff", borderRadius: "10px" }}
            >
              Kom igång
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h1
              className="font-display"
              style={{ fontWeight: 500, fontSize: "20px", color: "#3C2A4D" }}
            >
              Vad vill dina vänner kalla dig?
            </h1>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ditt namn eller smeknamn"
              className="rounded-[10px] bg-card border-[0.5px] border-border text-center"
            />
            <Button
              onClick={handleNameContinue}
              disabled={!displayName.trim() || loading}
              className="w-full text-[13px] font-normal"
              style={{ backgroundColor: "#3C2A4D", color: "#fff", borderRadius: "10px" }}
            >
              {loading ? "..." : "Fortsätt"}
            </Button>
            <button
              onClick={handleSkip}
              className="text-[13px] text-muted-foreground hover:underline"
            >
              Hoppa över
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h1
              className="font-display"
              style={{ fontWeight: 500, fontSize: "20px", color: "#3C2A4D" }}
            >
              Lägg till en profilbild
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: "14px" }}>
              Så dina vänner känner igen dig
            </p>

            <div className="flex justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative w-24 h-24 rounded-full border-[0.5px] border-border bg-card flex items-center justify-center overflow-hidden transition-all hover:bg-muted"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profilbild" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
                <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                  <Camera className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
            />

            <Button
              onClick={handleAvatarContinue}
              disabled={loading}
              className="w-full text-[13px] font-normal"
              style={{ backgroundColor: "#3C2A4D", color: "#fff", borderRadius: "10px" }}
            >
              {loading ? "..." : avatarFile ? "Fortsätt" : "Fortsätt utan bild"}
            </Button>
            <button
              onClick={handleSkip}
              className="text-[13px] text-muted-foreground hover:underline"
            >
              Hoppa över
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h1
              className="font-display"
              style={{ fontWeight: 500, fontSize: "20px", color: "#3C2A4D" }}
            >
              Skapa din första del av min vardag
            </h1>
            <Input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="T.ex. Jobb, Familj, Resor..."
              className="rounded-[10px] bg-card border-[0.5px] border-border text-center"
            />
            <div className="flex flex-wrap justify-center gap-2">
              {ROOM_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setRoomName(s)}
                  className={`px-4 py-1.5 text-[13px] font-normal rounded-full border transition-all ${
                    roomName === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <Button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full text-[13px] font-normal"
              style={{ backgroundColor: "#3C2A4D", color: "#fff", borderRadius: "10px" }}
            >
              {loading ? "..." : "Skapa och kom igång"}
            </Button>
            <button
              onClick={handleSkip}
              className="text-[13px] text-muted-foreground hover:underline"
            >
              Hoppa över
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingFlow;
