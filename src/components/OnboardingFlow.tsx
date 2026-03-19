import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Camera, User, Newspaper, CalendarHeart, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TUTORIAL_STEPS = [
  {
    icon: Newspaper,
    title: "Nyheter från kretsen",
    text: "Se vad dina närmaste delar – äkta vardagsögonblick, inte highlights.",
  },
  {
    icon: CalendarHeart,
    title: "Ses vi?",
    text: "Föreslå en träff eller berätta när du är ledig. Från känsla till handling på ett klick.",
  },
  {
    icon: Users,
    title: "Din krets",
    text: "Bjud in dina närmaste. Max 15 personer – bara de som faktiskt betyder något.",
  },
];

interface Props {
  onComplete: () => void;
}

const OnboardingFlow = ({ onComplete }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"name" | "avatar" | "tutorial">("name");
  const [tutorialIndex, setTutorialIndex] = useState(0);
  const [displayName, setDisplayName] = useState("");
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
    setStep("avatar");
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
    setStep("tutorial");
  };

  const markOnboarded = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ onboarded_at: new Date().toISOString() } as any)
      .eq("user_id", user.id);
  };

  const handleTutorialNext = async () => {
    if (tutorialIndex < TUTORIAL_STEPS.length - 1) {
      setTutorialIndex(tutorialIndex + 1);
    } else {
      await markOnboarded();
      onComplete();
    }
  };

  const currentTutorial = TUTORIAL_STEPS[tutorialIndex];

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: "#F7F3EF" }}>
      <div className="w-full max-w-sm text-center">

        {/* Step: Name */}
        {step === "name" && (
          <div className="space-y-6">
            <span
              className="block font-display lowercase"
              style={{ fontWeight: 300, fontSize: "26px", letterSpacing: "-0.5px", color: "#3C2A4D" }}
            >
              minby
            </span>
            <h1 className="font-display" style={{ fontWeight: 500, fontSize: "20px", color: "#3C2A4D" }}>
              Vad ska dina vänner kalla dig?
            </h1>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ditt namn eller smeknamn"
              className="rounded-[10px] bg-card border border-border text-center"
            />
            <Button
              onClick={handleNameContinue}
              disabled={!displayName.trim() || loading}
              className="w-full text-[13px] font-normal"
              style={{ backgroundColor: "#3C2A4D", color: "#fff", borderRadius: "20px", height: "48px" }}
            >
              {loading ? "..." : "Fortsätt"}
            </Button>
          </div>
        )}

        {/* Step: Avatar */}
        {step === "avatar" && (
          <div className="space-y-6">
            <h1 className="font-display" style={{ fontWeight: 500, fontSize: "20px", color: "#3C2A4D" }}>
              Lägg till en profilbild
            </h1>
            <p style={{ fontSize: "14px", color: "#7A6A85" }}>
              Så dina vänner känner igen dig
            </p>

            <div className="flex justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative w-24 h-24 rounded-full border flex items-center justify-center overflow-hidden transition-all"
                style={{ borderColor: "#EDE8F4", backgroundColor: "#FFFFFF" }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profilbild" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8" style={{ color: "#7A6A85" }} />
                )}
                <div
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#3C2A4D" }}
                >
                  <Camera className="w-3.5 h-3.5" style={{ color: "#fff" }} />
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
              style={{ backgroundColor: "#3C2A4D", color: "#fff", borderRadius: "20px", height: "48px" }}
            >
              {loading ? "..." : avatarFile ? "Fortsätt" : "Fortsätt utan bild"}
            </Button>
            <button
              onClick={handleAvatarContinue}
              className="text-[13px] hover:underline"
              style={{ color: "#7A6A85" }}
            >
              Hoppa över
            </button>
          </div>
        )}

        {/* Step: Tutorial */}
        {step === "tutorial" && (
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={tutorialIndex}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="p-8 mx-auto"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "0.5px solid #EDE8F4",
                  borderRadius: "16px",
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ backgroundColor: "#EDE8F4" }}
                >
                  <currentTutorial.icon className="w-6 h-6" style={{ color: "#3C2A4D" }} />
                </div>
                <h2
                  className="font-display mb-2"
                  style={{ fontWeight: 500, fontSize: "18px", color: "#3C2A4D" }}
                >
                  {currentTutorial.title}
                </h2>
                <p style={{ fontSize: "13px", color: "#7A6A85", lineHeight: 1.6 }}>
                  {currentTutorial.text}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Pagination dots */}
            <div className="flex justify-center gap-2">
              {TUTORIAL_STEPS.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: i === tutorialIndex ? "20px" : "6px",
                    height: "6px",
                    backgroundColor: i === tutorialIndex ? "#3C2A4D" : "#EDE8F4",
                  }}
                />
              ))}
            </div>

            <Button
              onClick={handleTutorialNext}
              className="w-full text-[13px] font-normal"
              style={{ backgroundColor: "#3C2A4D", color: "#fff", borderRadius: "20px", height: "48px" }}
            >
              {tutorialIndex === TUTORIAL_STEPS.length - 1 ? "Kom igång!" : "Nästa"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingFlow;
