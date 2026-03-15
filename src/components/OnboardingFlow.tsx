import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ROOM_SUGGESTIONS = ["Jobb", "Familj", "Husbygge", "Resor", "Övrigt"];

interface Props {
  onComplete: () => void;
}

const OnboardingFlow = ({ onComplete }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNameContinue = async () => {
    if (!user || !displayName.trim()) return;
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("user_id", user.id);

    if (error) {
      // Profile might not exist yet, try insert
      await supabase.from("profiles").insert({
        user_id: user.id,
        display_name: displayName.trim(),
      });
    }

    setLoading(false);
    setStep(3);
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

    // Mark onboarding complete
    localStorage.setItem(`onboarding_done_${user.id}`, "true");
    setLoading(false);
    onComplete();
  };

  const handleSkip = () => {
    if (!user) return;
    if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      localStorage.setItem(`onboarding_done_${user.id}`, "true");
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
              Välkommen till din by
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
              Skapa ditt första vardagsrum
            </h1>
            <Input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Namnge ditt rum"
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
              {loading ? "..." : "Skapa rum och kom igång"}
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
