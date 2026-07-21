import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TextButton from "@/components/ui/text-button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Step = "name" | "avatar" | "done";

/**
 * Non-blocking, stepwise profile onboarding. Renders inline; user can skip.
 * Steps: name -> avatar -> done (hidden).
 */
const ProfileNudge = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      const missingName = !data?.display_name;
      const missingAvatar = !data?.avatar_url;
      const skippedName = sessionStorage.getItem("minby_nudge_skip_name") === "1";
      const skippedAvatar = sessionStorage.getItem("minby_nudge_skip_avatar") === "1";
      if (missingName && !skippedName) setStep("name");
      else if (missingAvatar && !skippedAvatar) setStep("avatar");
      else setStep("done");
      if (data?.display_name) setName(data.display_name);
    })();
  }, [user]);

  if (!user || !step || step === "done") return null;

  const saveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    // move on
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    setStep(data?.avatar_url ? "done" : "avatar");
  };

  const uploadAvatar = async (file: File) => {
    setSaving(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { setSaving(false); return toast.error(upErr.message); }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: pub.publicUrl })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setStep("done");
  };

  const skip = () => {
    if (step === "name") {
      sessionStorage.setItem("minby_nudge_skip_name", "1");
      setStep("avatar");
    } else if (step === "avatar") {
      sessionStorage.setItem("minby_nudge_skip_avatar", "1");
      setStep("done");
    }
  };

  return (
    <section className="mt-4 px-4">
      <div className="rounded-[26px] p-5" style={{ backgroundColor: "#EDE5F0" }}>
        {step === "name" && (
          <>
            <div className="text-[11px] mb-2 font-medium uppercase tracking-wider" style={{ color: "#5A4A66" }}>
              Steg 1 av 2
            </div>
            <p className="text-[16px] mb-3" style={{ color: "#2B2B2B" }}>
              Vad ska dina vänner kalla dig?
            </p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ditt namn"
              className="rounded-lg bg-white border-0 mb-3"
            />
            <div className="flex items-center gap-4">
              <TextButton onClick={saveName} disabled={saving || !name.trim()}>
                {saving ? "…" : "Spara"}
              </TextButton>
              <TextButton variant="secondary" onClick={skip}>Hoppa över</TextButton>
            </div>
          </>
        )}
        {step === "avatar" && (
          <>
            <div className="text-[11px] mb-2 font-medium uppercase tracking-wider" style={{ color: "#5A4A66" }}>
              Steg 2 av 2
            </div>
            <p className="text-[16px] mb-3" style={{ color: "#2B2B2B" }}>
              Lägg upp en profilbild så känner de andra igen dig.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAvatar(f);
                e.target.value = "";
              }}
            />
            <div className="flex items-center gap-4">
              <TextButton onClick={() => fileRef.current?.click()} disabled={saving}>
                {saving ? "…" : "Välj bild"}
              </TextButton>
              <TextButton variant="secondary" onClick={skip}>Hoppa över</TextButton>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default ProfileNudge;
